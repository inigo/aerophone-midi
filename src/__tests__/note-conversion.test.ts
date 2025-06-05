import { describe, it, expect } from 'vitest'

describe('MIDI Note Conversion', () => {
  const midiToNoteName = (midiNote: number): string => {
    const noteNames = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']
    return noteNames[midiNote % 12]
  }

  const midiToOctave = (midiNote: number): number => {
    return Math.floor(midiNote / 12) - 1
  }

  it('should convert MIDI note numbers to correct note names', () => {
    const testCases = [
      { midi: 60, expectedNote: 'c', expectedOctave: 4 }, // Middle C
      { midi: 61, expectedNote: 'c#', expectedOctave: 4 }, // C#
      { midi: 62, expectedNote: 'd', expectedOctave: 4 }, // D
      { midi: 69, expectedNote: 'a', expectedOctave: 4 }, // A440
      { midi: 72, expectedNote: 'c', expectedOctave: 5 }, // High C
      { midi: 48, expectedNote: 'c', expectedOctave: 3 }, // Low C
    ]

    testCases.forEach(({ midi, expectedNote, expectedOctave }) => {
      expect(midiToNoteName(midi)).toBe(expectedNote)
      expect(midiToOctave(midi)).toBe(expectedOctave)
    })
  })

  it('should handle edge cases correctly', () => {
    expect(midiToNoteName(0)).toBe('c')
    expect(midiToOctave(0)).toBe(-1)
    
    expect(midiToNoteName(127)).toBe('g')
    expect(midiToOctave(127)).toBe(9)
  })

  it('should handle octave boundaries correctly', () => {
    // Test octave boundary at C notes
    expect(midiToOctave(11)).toBe(-1) // B-1
    expect(midiToOctave(12)).toBe(0)  // C0
    expect(midiToOctave(23)).toBe(0)  // B0
    expect(midiToOctave(24)).toBe(1)  // C1
  })

  it('should convert chromatic scale correctly', () => {
    const expectedNotes = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']
    
    for (let i = 0; i < 12; i++) {
      expect(midiToNoteName(60 + i)).toBe(expectedNotes[i])
    }
  })
})