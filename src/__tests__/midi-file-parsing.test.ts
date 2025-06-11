import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Mock vexflow to avoid canvas issues in tests
vi.mock('vexflow', () => {
  const MockRenderer = vi.fn().mockImplementation(() => ({
    resize: vi.fn(),
    getContext: vi.fn(() => ({
      clear: vi.fn(),
      draw: vi.fn()
    }))
  }))
  
  const RendererWithBackends = Object.assign(MockRenderer, {
    Backends: { SVG: 'svg' }
  })
  
  return {
    Renderer: RendererWithBackends,
    Stave: vi.fn().mockImplementation(() => ({
      addClef: vi.fn().mockReturnThis(),
      addTimeSignature: vi.fn().mockReturnThis(),
      setContext: vi.fn().mockReturnThis(),
      draw: vi.fn()
    })),
    StaveNote: vi.fn(),
    Voice: vi.fn().mockImplementation(() => ({
      addTickables: vi.fn(),
      draw: vi.fn()
    })),
    Formatter: vi.fn().mockImplementation(() => ({
      joinVoices: vi.fn().mockReturnThis(),
      format: vi.fn()
    })),
    Accidental: vi.fn()
  }
})

describe('MIDI File Parsing', () => {
  it('should correctly parse Imperial March MIDI file tracks', async () => {
    // Read the test MIDI file
    const midiFilePath = join(__dirname, 'star_wars_imperial_march.mid')
    const midiFileBuffer = readFileSync(midiFilePath)
    
    // Parse the MIDI file data directly
    const MidiParser = (await import('midi-parser-js')).default
    const midiData = MidiParser.parse(new Uint8Array(midiFileBuffer))
    
    // Get tracks
    const tracks = midiData.track || midiData.tracks || []
    expect(tracks.length).toBeGreaterThan(0)
    
    console.log('MIDI data structure:', midiData)
    console.log(`Found ${tracks.length} tracks`)
    
    // Create helper functions to analyze tracks without instantiating MidiFileHandler
    const analyzeTrack = (track: any, index: number) => {
      const events = track.event || track.events || track
      if (!Array.isArray(events)) {
        return {
          instrumentPriority: 999,
          noteCount: 0,
          isDrums: false,
          isOrchestral: false,
          instrumentName: 'unknown',
          channel: null,
          programNumber: null,
          trackName: ''
        }
      }

      let noteCount = 0
      let channel: number | null = null
      let programNumber: number | null = null
      let trackName = ''

      console.log(`\n--- Analyzing Track ${index} ---`)
      const eventTypes = new Set<number>()
      
      for (const event of events) {
        eventTypes.add(event.type)
        
        // Count note events
        if (event.type === 9 && event.data && event.data.length >= 2 && event.data[1] > 0) {
          noteCount++
          if (channel === null && event.channel !== undefined) {
            channel = event.channel
          }
        }

        // Check for program change events
        if (event.type === 12 || event.type === 192) {
          console.log('Program change event found:', event)
          // Handle both array and single value data formats
          if (event.data !== undefined) {
            if (Array.isArray(event.data) && event.data.length >= 1) {
              programNumber = event.data[0]
            } else if (typeof event.data === 'number') {
              programNumber = event.data
            }
            if (channel === null && event.channel !== undefined) {
              channel = event.channel
            }
          }
        }

        // Get track name
        if (event.type === 255 && event.metaType === 3 && event.data) {
          trackName = String.fromCharCode(...event.data).toLowerCase()
        }
      }
      
      console.log(`Track ${index} - Event types:`, Array.from(eventTypes))
      console.log(`Track ${index} - Notes: ${noteCount}, Channel: ${channel}, Program: ${programNumber}, Name: "${trackName}"`)
      
      const isDrums = channel === 9 || trackName.includes('drum') || trackName.includes('percussion')
      
      // Simulate the priority logic for testing
      let priority = 80 // default for unknown
      let instrumentName = 'unknown'
      let isOrchestral = false
      
      if (programNumber !== null) {
        // Major Level 1: Alto sax
        if (programNumber === 65) { priority = 1; instrumentName = 'alto sax' }
        // Major Level 2: Any sax (64, 66, 67)
        else if (programNumber === 64) { priority = 2; instrumentName = 'soprano sax' }
        else if (programNumber === 66) { priority = 2; instrumentName = 'tenor sax' }
        else if (programNumber === 67) { priority = 2; instrumentName = 'baritone sax' }
        // Major Level 3: Flute, clarinet, trumpet, violin
        else if (programNumber === 73) { priority = 3; instrumentName = 'flute' }
        else if (programNumber === 71) { priority = 3; instrumentName = 'clarinet' }
        else if (programNumber >= 56 && programNumber <= 63) { priority = 3; instrumentName = 'trumpet' }
        else if (programNumber >= 40 && programNumber <= 47) { priority = 3; instrumentName = 'violin'; isOrchestral = true }
        // Major Level 4: Other wind instruments  
        else if (programNumber === 68) { priority = 4; instrumentName = 'oboe' }
        else if (programNumber === 69) { priority = 4; instrumentName = 'english horn' }
        else if (programNumber === 70) { priority = 4; instrumentName = 'bassoon' }
        else if (programNumber === 72) { priority = 4; instrumentName = 'piccolo' }
        else if (programNumber >= 74 && programNumber <= 79) { priority = 4; instrumentName = 'wind instrument' }
        else if (programNumber >= 48 && programNumber <= 55) { priority = 4; instrumentName = 'wind instrument' }
      }
      
      return {
        instrumentPriority: priority,
        noteCount,
        isDrums,
        isOrchestral,
        instrumentName,
        channel,
        programNumber,
        trackName
      }
    }
    
    // Analyze each track
    const trackAnalyses = tracks.map((track: any, index: number) => {
      return analyzeTrack(track, index)
    })
    
    console.log('\nTrack analyses summary:', trackAnalyses)
    
    // Expected program numbers: 56, 60, 57, 46, 00, and 09
    const expectedPrograms = [56, 60, 57, 46, 0, 9]
    const foundPrograms = trackAnalyses
      .map((analysis: any) => analysis.programNumber)
      .filter((prog: any) => prog !== null)
    
    console.log('Found program numbers:', foundPrograms)
    console.log('Expected program numbers:', expectedPrograms)
    
    // Check that we found program change events
    expect(foundPrograms.length).toBeGreaterThan(0)
    
    // Check that we found at least some of the expected program numbers
    const foundExpectedPrograms = expectedPrograms.filter(expected => 
      foundPrograms.includes(expected)
    )
    expect(foundExpectedPrograms.length).toBeGreaterThan(0)
    
    // Check that we detected drums track
    const drumsDetected = trackAnalyses.some((analysis: any) => analysis.isDrums)
    expect(drumsDetected).toBe(true)
    
    // Check that we found tracks with notes
    const tracksWithNotes = trackAnalyses.filter((analysis: any) => analysis.noteCount > 0)
    expect(tracksWithNotes.length).toBeGreaterThan(0)
    
    // Test track selection logic with the new priority system
    const suitableTracks = trackAnalyses.filter((t: any) => !t.isDrums && !t.isOrchestral)
    suitableTracks.sort((a: any, b: any) => {
      // Primary sort by major priority level
      if (a.instrumentPriority !== b.instrumentPriority) {
        return a.instrumentPriority - b.instrumentPriority
      }
      // Secondary sort by note count (more notes = better)
      return b.noteCount - a.noteCount
    })
    
    console.log('Suitable tracks after filtering and sorting:', suitableTracks.map((t: any) => ({
      instrument: t.instrumentName,
      priority: t.instrumentPriority,
      notes: t.noteCount,
      program: t.programNumber
    })))
    
    if (suitableTracks.length > 0) {
      const selectedTrack = suitableTracks[0]
      console.log('Selected track:', {
        instrument: selectedTrack.instrumentName,
        priority: selectedTrack.instrumentPriority,
        notes: selectedTrack.noteCount,
        program: selectedTrack.programNumber
      })
      
      // Should select trumpet with highest note count (241 notes) in level 3
      // since there's no alto sax (level 1) or other sax (level 2) in this file
      // Program 73=flute, 71=clarinet, 70=bassoon, 60=trumpet, 56=trumpet, 57=trumpet
      expect(selectedTrack.instrumentPriority).toBe(3) // Level 3 (flute, clarinet, trumpet, violin)
      expect(['flute', 'clarinet', 'trumpet'].includes(selectedTrack.instrumentName)).toBe(true)
    }
  })
})