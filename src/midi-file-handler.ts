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

    // Process each track - handle different possible structures
    if (midiData.track && Array.isArray(midiData.track)) {
      for (const track of midiData.track) {
        this.processTrack(track)
      }
    } else if (midiData.tracks && Array.isArray(midiData.tracks)) {
      for (const track of midiData.tracks) {
        this.processTrack(track)
      }
    } else {
      console.error('Unexpected MIDI data structure:', midiData)
      throw new Error('Invalid MIDI file structure')
    }

    // Display notes on staves
    this.displayNotes()
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

      if (event.type === 9 && event.data && event.data.length >= 2) { // Note On
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
      } else if (event.type === 8 && event.data && event.data.length >= 1) { // Note Off
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
        duration: Math.max(120, currentTime - noteData.startTime) // Minimum duration
      })
    }
  }

  private finalizeNote(note: number, activeNotes: Map<number, { startTime: number; velocity: number }>, currentTime: number): void {
    const noteData = activeNotes.get(note)
    if (noteData && note >= 48 && note <= 84) { // Tenor range
      this.currentNotes.push({
        note,
        velocity: noteData.velocity,
        startTime: noteData.startTime,
        duration: Math.max(120, currentTime - noteData.startTime) // Minimum duration
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