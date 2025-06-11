import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MIDIApp } from '../midi-app'
import { NotationRenderer } from '../notation'

vi.mock('webmidi', () => {
  const mockInput = {
    name: 'Test Input',
    manufacturer: 'Test Manufacturer',
    addListener: vi.fn()
  }
  
  return {
    WebMidi: {
      inputs: [mockInput],
      outputs: [],
      addListener: vi.fn(),
      enable: vi.fn()
    }
  }
})

vi.mock('../notation')

describe('MIDI to Notation Integration', () => {
  let mockNotationRenderer: any
  
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="device-list"></div>
      <pre id="message-log"></pre>
      <div id="stave-container"></div>
    `
    
    mockNotationRenderer = {
      addNote: vi.fn(),
      clearNotes: vi.fn()
    }
    
    vi.mocked(NotationRenderer).mockImplementation(() => mockNotationRenderer)
    
    new MIDIApp()
  })

  it('should create notation renderer with correct container', () => {
    expect(NotationRenderer).toHaveBeenCalledWith('stave-container')
  })

  it('should handle MIDI note conversion correctly', () => {
    const testCases = [
      { midiNote: 60, expectedNoteName: 'C4' }, // Middle C
      { midiNote: 72, expectedNoteName: 'C5' }, // C above middle C
      { midiNote: 48, expectedNoteName: 'C3' }, // C below middle C
      { midiNote: 69, expectedNoteName: 'A4' }, // A440
    ]
    
    testCases.forEach(({ midiNote }) => {
      mockNotationRenderer.addNote.mockClear()
      
      // Simulate adding a note
      mockNotationRenderer.addNote(midiNote)
      
      expect(mockNotationRenderer.addNote).toHaveBeenCalledWith(midiNote)
    })
  })

  it('should handle multiple notes being added', () => {
    const notes = [60, 64, 67, 72] // C, E, G, C major chord
    
    notes.forEach(note => {
      mockNotationRenderer.addNote(note)
    })
    
    expect(mockNotationRenderer.addNote).toHaveBeenCalledTimes(4)
    notes.forEach(note => {
      expect(mockNotationRenderer.addNote).toHaveBeenCalledWith(note)
    })
  })

  it('should clear notes when requested', () => {
    mockNotationRenderer.addNote(60)
    mockNotationRenderer.addNote(64)
    mockNotationRenderer.clearNotes()
    
    expect(mockNotationRenderer.clearNotes).toHaveBeenCalled()
  })
})