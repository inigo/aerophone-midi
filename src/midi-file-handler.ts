import MidiParser from 'midi-parser-js'
import { NotationRenderer } from './notation'

interface MidiNote {
  note: number
  velocity: number
  startTime: number
  duration: number
}

export class MidiFileHandler {
  private notationRenderer: NotationRenderer
  private currentNotes: MidiNote[] = []

  constructor(containerId: string) {
    this.notationRenderer = new NotationRenderer(containerId)
  }

  async handleFileUpload(file: File): Promise<void> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const midiData = MidiParser.parse(new Uint8Array(arrayBuffer))
      this.processMidiData(midiData)
    } catch (error) {
      console.error('Error parsing MIDI file:', error)
      throw new Error('Failed to parse MIDI file')
    }
  }

  private processMidiData(midiData: any): void {
    this.currentNotes = []
    this.notationRenderer.clearNotes()

    console.log('MIDI data structure:', midiData)

    // Get tracks array
    let tracks: any[] = []
    if (midiData.track && Array.isArray(midiData.track)) {
      tracks = midiData.track
    } else if (midiData.tracks && Array.isArray(midiData.tracks)) {
      tracks = midiData.tracks
    } else {
      console.error('Unexpected MIDI data structure:', midiData)
      throw new Error('Invalid MIDI file structure')
    }

    // Select the best track based on instrument preferences
    const selectedTrack = this.selectBestTrack(tracks)
    if (selectedTrack) {
      this.processTrack(selectedTrack)
    } else {
      console.warn('No suitable track found')
    }

    // Display notes on staves
    this.displayNotes()
  }

  private selectBestTrack(tracks: any[]): any {
    if (tracks.length === 0) return null
    if (tracks.length === 1) return tracks[0]

    console.log(`Found ${tracks.length} tracks, analyzing...`)

    // Analyze each track to determine instrument and suitability
    const trackAnalysis = tracks.map((track, index) => {
      const analysis = this.analyzeTrack(track, index)
      console.log(`Track ${index}:`, analysis)
      return { track, ...analysis }
    })

    // Filter out unsuitable tracks (drums, orchestral)
    const suitableTracks = trackAnalysis.filter(t => !t.isDrums && !t.isOrchestral)

    if (suitableTracks.length === 0) {
      console.warn('No suitable tracks found, using first track')
      return tracks[0]
    }

    // Sort by preference priority
    suitableTracks.sort((a, b) => {
      // Primary sort by major priority level
      if (a.instrumentPriority !== b.instrumentPriority) {
        return a.instrumentPriority - b.instrumentPriority
      }
      // Secondary sort by note count (more notes = better)
      return b.noteCount - a.noteCount
    })

    console.log('Selected track:', suitableTracks[0])
    return suitableTracks[0].track
  }

  private analyzeTrack(
    track: any,
    _index: number
  ): {
    instrumentPriority: number
    noteCount: number
    isDrums: boolean
    isOrchestral: boolean
    instrumentName: string
    channel: number | null
    programNumber: number | null
    trackName: string
  } {
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
        trackName: '',
      }
    }

    let noteCount = 0
    let channel: number | null = null
    let programNumber: number | null = null
    let trackName = ''

    // Analyze events to extract information
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

      // Get program change (instrument assignment) - try multiple possible formats
      if (event.type === 12 || event.type === 192) {
        // Program Change
        console.log(
          `Found program change: type=${event.type}, data=${event.data}, channel=${event.channel}`
        )
        if (event.data !== undefined) {
          if (Array.isArray(event.data) && event.data.length >= 1) {
            programNumber = event.data[0]
          } else if (typeof event.data === 'number') {
            programNumber = event.data
          }
          if (channel === null && event.channel !== undefined) {
            channel = event.channel
          }
          console.log(
            `Found program change: type=${event.type}, program=${programNumber}, channel=${event.channel}`
          )
        }
      }

      // Also check for program change in different format
      if (event.subtype === 'programChange' || event.messageType === 'programChange') {
        programNumber = event.programNumber || event.program || (event.data && event.data[0])
        if (channel === null && event.channel !== undefined) {
          channel = event.channel
        }
        console.log(
          `Found program change (alt format): program=${programNumber}, channel=${event.channel}`
        )
      }

      // Get track name
      if (event.type === 255 && event.metaType === 3 && event.data) {
        // Track Name
        trackName = String.fromCharCode(...event.data).toLowerCase()
      }

      // Also try alternative track name formats
      if (event.subtype === 'trackName' || event.text) {
        trackName = (event.text || event.name || '').toLowerCase()
      }
    }

    console.log(
      `Track analysis - Event types found:`,
      Array.from(eventTypes),
      `Program: ${programNumber}, Track name: "${trackName}", Channel: ${channel}`
    )

    // Check if it's drums (channel 9 in 0-based indexing = channel 10 in 1-based)
    const isDrums = channel === 9 || trackName.includes('drum') || trackName.includes('percussion')

    // Determine instrument and priority
    const { instrumentName, priority, isOrchestral } = this.getInstrumentInfo(
      programNumber,
      trackName,
      channel
    )

    return {
      instrumentPriority: priority,
      noteCount,
      isDrums,
      isOrchestral,
      instrumentName,
      channel,
      programNumber,
      trackName,
    }
  }

  private getInstrumentInfo(
    programNumber: number | null,
    trackName: string,
    _channel: number | null
  ): {
    instrumentName: string
    priority: number
    isOrchestral: boolean
  } {
    const name = trackName.toLowerCase()

    // Check track name first (more reliable than program number)
    // Major Level 1: Alto sax
    if (name.includes('alto') && name.includes('sax'))
      return { instrumentName: 'alto sax', priority: 1, isOrchestral: false }

    // Major Level 2: Any sax
    if (name.includes('sax'))
      return { instrumentName: 'saxophone', priority: 2, isOrchestral: false }

    // Major Level 3: Flute, clarinet, trumpet, violin
    if (name.includes('flute')) return { instrumentName: 'flute', priority: 3, isOrchestral: false }
    if (name.includes('clarinet'))
      return { instrumentName: 'clarinet', priority: 3, isOrchestral: false }
    if (name.includes('trumpet'))
      return { instrumentName: 'trumpet', priority: 3, isOrchestral: false }
    if (name.includes('violin'))
      return { instrumentName: 'violin', priority: 3, isOrchestral: true }

    // Major Level 4: Other wind instruments (including tenor instruments)
    if (name.includes('tenor'))
      return { instrumentName: 'tenor instrument', priority: 4, isOrchestral: false }

    // Check for other wind instruments
    if (
      name.includes('wind') ||
      name.includes('brass') ||
      name.includes('woodwind') ||
      name.includes('horn') ||
      name.includes('tuba') ||
      name.includes('trombone') ||
      name.includes('oboe') ||
      name.includes('bassoon') ||
      name.includes('piccolo')
    ) {
      return { instrumentName: 'wind instrument', priority: 4, isOrchestral: false }
    }

    // Check for orchestral instruments (lower priority, filtered out later)
    if (
      name.includes('string') ||
      name.includes('orchestra') ||
      name.includes('cello') ||
      name.includes('viola') ||
      name.includes('bass')
    ) {
      return { instrumentName: 'orchestral', priority: 90, isOrchestral: true }
    }

    // Use MIDI program number if available
    if (programNumber !== null) {
      return this.getMidiProgramInfo(programNumber)
    }

    // Default case
    return { instrumentName: 'unknown', priority: 50, isOrchestral: false }
  }

  private getMidiProgramInfo(programNumber: number): {
    instrumentName: string
    priority: number
    isOrchestral: boolean
  } {
    // MIDI General MIDI program numbers (0-127)
    // Using 4 major priority levels as specified

    // Major Level 1: Alto sax
    if (programNumber === 65)
      return { instrumentName: 'alto sax', priority: 1, isOrchestral: false } // Alto Sax

    // Major Level 2: Any sax (excluding alto which is level 1)
    if (programNumber === 64)
      return { instrumentName: 'soprano sax', priority: 2, isOrchestral: false } // Soprano Sax
    if (programNumber === 66)
      return { instrumentName: 'tenor sax', priority: 2, isOrchestral: false } // Tenor Sax
    if (programNumber === 67)
      return { instrumentName: 'baritone sax', priority: 2, isOrchestral: false } // Baritone Sax

    // Major Level 3: Flute, clarinet, trumpet, violin
    if (programNumber === 73) return { instrumentName: 'flute', priority: 3, isOrchestral: false } // Flute
    if (programNumber === 71)
      return { instrumentName: 'clarinet', priority: 3, isOrchestral: false } // Clarinet
    if (programNumber >= 56 && programNumber <= 63)
      return { instrumentName: 'trumpet', priority: 3, isOrchestral: false } // Brass section
    if (programNumber >= 40 && programNumber <= 47)
      return { instrumentName: 'violin', priority: 3, isOrchestral: true } // Strings section

    // Major Level 4: Other wind instruments
    if (programNumber === 72) return { instrumentName: 'piccolo', priority: 4, isOrchestral: false } // Piccolo
    if (programNumber === 74)
      return { instrumentName: 'recorder', priority: 4, isOrchestral: false } // Recorder
    if (programNumber === 75)
      return { instrumentName: 'pan flute', priority: 4, isOrchestral: false } // Pan Flute
    if (programNumber === 76)
      return { instrumentName: 'blown bottle', priority: 4, isOrchestral: false } // Blown Bottle
    if (programNumber === 77)
      return { instrumentName: 'shakuhachi', priority: 4, isOrchestral: false } // Shakuhachi
    if (programNumber === 78) return { instrumentName: 'whistle', priority: 4, isOrchestral: false } // Whistle
    if (programNumber === 79) return { instrumentName: 'ocarina', priority: 4, isOrchestral: false } // Ocarina

    if (programNumber === 68) return { instrumentName: 'oboe', priority: 4, isOrchestral: false } // Oboe
    if (programNumber === 69)
      return { instrumentName: 'english horn', priority: 4, isOrchestral: false } // English Horn
    if (programNumber === 70) return { instrumentName: 'bassoon', priority: 4, isOrchestral: false } // Bassoon

    // Other brass instruments (Level 4)
    if (programNumber >= 48 && programNumber <= 55)
      return { instrumentName: 'wind instrument', priority: 4, isOrchestral: false } // Other brass like timpani, etc.

    // Non-wind instruments (lower priority, may be filtered out)
    if (programNumber >= 0 && programNumber <= 7)
      return { instrumentName: 'piano', priority: 80, isOrchestral: false } // Piano family
    if (programNumber >= 8 && programNumber <= 15)
      return { instrumentName: 'chromatic percussion', priority: 80, isOrchestral: false } // Chromatic Percussion
    if (programNumber >= 16 && programNumber <= 23)
      return { instrumentName: 'organ', priority: 80, isOrchestral: false } // Organ family
    if (programNumber >= 24 && programNumber <= 31)
      return { instrumentName: 'guitar', priority: 80, isOrchestral: false } // Guitar family
    if (programNumber >= 32 && programNumber <= 39)
      return { instrumentName: 'bass', priority: 90, isOrchestral: false } // Bass family

    return { instrumentName: 'other', priority: 80, isOrchestral: false }
  }

  private processTrack(track: any): void {
    const activeNotes = new Map<number, { startTime: number; velocity: number }>()
    let currentTime = 0

    // Handle different track structures
    const events = track.event || track.events || track
    if (!Array.isArray(events)) {
      console.warn('Track is not an array of events:', track)
      return
    }

    for (const event of events) {
      currentTime += event.deltaTime || 0

      if (event.type === 9 && event.data && event.data.length >= 2) {
        // Note On
        const note = event.data[0]
        const velocity = event.data[1]

        if (velocity > 0) {
          // Check if this is a tenor range note (approximately C3 to C6)
          if (note >= 48 && note <= 84) {
            activeNotes.set(note, { startTime: currentTime, velocity })
          }
        } else {
          // Velocity 0 is actually note off
          this.finalizeNote(note, activeNotes, currentTime)
        }
      } else if (event.type === 8 && event.data && event.data.length >= 1) {
        // Note Off
        const note = event.data[0]
        this.finalizeNote(note, activeNotes, currentTime)
      }
    }

    // Finalize any remaining active notes
    for (const [note, noteData] of activeNotes) {
      this.currentNotes.push({
        note,
        velocity: noteData.velocity,
        startTime: noteData.startTime,
        duration: Math.max(120, currentTime - noteData.startTime), // Minimum duration
      })
    }
  }

  private finalizeNote(
    note: number,
    activeNotes: Map<number, { startTime: number; velocity: number }>,
    currentTime: number
  ): void {
    const noteData = activeNotes.get(note)
    if (noteData && note >= 48 && note <= 84) {
      // Tenor range
      this.currentNotes.push({
        note,
        velocity: noteData.velocity,
        startTime: noteData.startTime,
        duration: Math.max(120, currentTime - noteData.startTime), // Minimum duration
      })
      activeNotes.delete(note)
    }
  }

  private displayNotes(): void {
    // Sort notes by start time
    this.currentNotes.sort((a, b) => a.startTime - b.startTime)

    // Add notes to the notation renderer sequentially
    for (const midiNote of this.currentNotes) {
      this.notationRenderer.startNote(midiNote.note)
      // Since we're displaying a static file, we immediately end the note
      // but we could also simulate the duration if needed
      setTimeout(() => {
        this.notationRenderer.endNote(midiNote.note)
      }, 50) // Small delay to allow the note to be drawn
    }
  }

  clearNotes(): void {
    this.currentNotes = []
    this.notationRenderer.clearNotes()
  }
}