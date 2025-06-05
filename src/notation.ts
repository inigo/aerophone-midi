import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow'

interface ActiveNote {
  note: StaveNote
  midiNote: number
  startTime: number
  duration: string
}

export class NotationRenderer {
  private renderer: Renderer | null = null
  private context: any = null
  private staves: Stave[] = []
  private notes: StaveNote[] = []
  private voice: Voice | null = null
  private activeNotes: Map<number, ActiveNote> = new Map()
  private currentStaveIndex: number = 0

  constructor(containerId: string) {
    this.initializeRenderer(containerId)
  }

  private initializeRenderer(containerId: string): void {
    const container = document.getElementById(containerId)
    if (!container) {
      console.error(`Container with id ${containerId} not found`)
      return
    }

    container.innerHTML = ''
    
    this.renderer = new Renderer(container, Renderer.Backends.SVG)
    this.renderer.resize(800, 1600) // Taller to accommodate 8 staves
    this.context = this.renderer.getContext()
    
    // Create 8 staves
    this.staves = []
    for (let i = 0; i < 8; i++) {
      const stave = new Stave(10, 40 + (i * 180), 750) // 180px spacing between staves
      if (i === 0) {
        stave.addClef('treble').addTimeSignature('4/4')
      } else {
        stave.addClef('treble')
      }
      stave.setContext(this.context).draw()
      this.staves.push(stave)
    }
    
    this.voice = new Voice({ num_beats: 4, beat_value: 4 })
  }

  startNote(midiNote: number): void {
    const { noteName, octave, accidental } = this.midiToNoteInfo(midiNote)
    
    try {
      const note = new StaveNote({
        clef: 'treble',
        keys: [`${noteName}/${octave}`],
        duration: '16' // Start with shortest duration
      })
      
      // Add accidental if needed
      if (accidental) {
        note.addModifier(accidental, 0)
      }
      
      // Track this active note
      this.activeNotes.set(midiNote, {
        note: note,
        midiNote: midiNote,
        startTime: Date.now(),
        duration: '16'
      })
      
      this.notes.push(note)
      this.redrawStave()
      
      // Start updating note duration
      this.updateNoteDuration(midiNote)
    } catch (error) {
      console.error('Error starting note:', error)
    }
  }

  endNote(midiNote: number): void {
    this.activeNotes.delete(midiNote)
  }

  private updateNoteDuration(midiNote: number): void {
    const activeNote = this.activeNotes.get(midiNote)
    if (!activeNote) return
    
    const elapsed = Date.now() - activeNote.startTime
    let newDuration = '16' // sixteenth note (shortest)
    
    if (elapsed > 150) newDuration = '8'   // eighth note
    if (elapsed > 400) newDuration = 'q'   // quarter note  
    if (elapsed > 1000) newDuration = 'h'  // half note
    if (elapsed > 2500) newDuration = 'q'  // back to quarter for very long notes
    
    if (newDuration !== activeNote.duration) {
      activeNote.duration = newDuration
      
      // Update the note duration
      const { noteName, octave, accidental } = this.midiToNoteInfo(midiNote)
      const updatedNote = new StaveNote({
        clef: 'treble',
        keys: [`${noteName}/${octave}`],
        duration: newDuration
      })
      
      if (accidental) {
        updatedNote.addModifier(accidental, 0)
      }
      
      // Replace the note in the array
      const noteIndex = this.notes.indexOf(activeNote.note)
      if (noteIndex !== -1) {
        this.notes[noteIndex] = updatedNote
        activeNote.note = updatedNote
        this.redrawStave()
      }
    }
    
    // Continue updating if note is still active
    if (this.activeNotes.has(midiNote)) {
      setTimeout(() => this.updateNoteDuration(midiNote), 100)
    }
  }

  // Legacy method for backwards compatibility
  addNote(midiNote: number): void {
    this.startNote(midiNote)
  }

  private redrawStave(): void {
    if (!this.context || this.staves.length === 0) return
    
    this.context.clear()
    
    // Redraw all staves
    this.staves.forEach(stave => stave.setContext(this.context).draw())
    
    if (this.notes.length > 0) {
      // Group notes into staves (each stave holds 4 beats)
      const stavesData = this.groupNotesIntoStaves()
      
      // Draw notes on each stave
      stavesData.forEach((staveNotes, index) => {
        if (index < this.staves.length && staveNotes.length > 0) {
          this.drawNotesOnStave(staveNotes, this.staves[index])
        }
      })
    }
  }

  private groupNotesIntoStaves(): StaveNote[][] {
    const stavesData: StaveNote[][] = []
    let currentStaveNotes: StaveNote[] = []
    let currentStaveDuration = 0
    
    // Process notes from oldest to newest
    for (const note of this.notes) {
      const noteDuration = (note as any).duration || 'q'
      const noteDurationValue = this.getNoteDurationValue(noteDuration)
      
      // If adding this note would exceed 4 beats, start a new stave
      if (currentStaveDuration + noteDurationValue > 4 && currentStaveNotes.length > 0) {
        // Fill current stave with rests
        this.fillStaveWithRests(currentStaveNotes, 4 - currentStaveDuration)
        stavesData.push(currentStaveNotes)
        
        // Start new stave
        currentStaveNotes = []
        currentStaveDuration = 0
      }
      
      currentStaveNotes.push(note)
      currentStaveDuration += noteDurationValue
    }
    
    // Handle the last stave
    if (currentStaveNotes.length > 0) {
      this.fillStaveWithRests(currentStaveNotes, 4 - currentStaveDuration)
      stavesData.push(currentStaveNotes)
    }
    
    // Keep only the last 8 staves
    return stavesData.slice(-8)
  }

  private fillStaveWithRests(notes: StaveNote[], remainingBeats: number): void {
    while (remainingBeats > 0) {
      if (remainingBeats >= 1) {
        notes.push(new StaveNote({ clef: 'treble', keys: ['b/4'], duration: 'qr' }))
        remainingBeats -= 1
      } else if (remainingBeats >= 0.5) {
        notes.push(new StaveNote({ clef: 'treble', keys: ['b/4'], duration: '8r' }))
        remainingBeats -= 0.5
      } else {
        notes.push(new StaveNote({ clef: 'treble', keys: ['b/4'], duration: '16r' }))
        remainingBeats -= 0.25
      }
    }
  }

  private drawNotesOnStave(notes: StaveNote[], stave: Stave): void {
    const voice = new Voice({ num_beats: 4, beat_value: 4 })
    voice.addTickables(notes)
    
    const formatter = new Formatter()
    formatter.joinVoices([voice]).format([voice], 700)
    
    voice.draw(this.context, stave)
  }

  private selectNotesForDisplay(): StaveNote[] {
    const result: StaveNote[] = []
    let totalDuration = 0
    
    // Start from the most recent note and work backwards
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i]
      const noteDuration = (note as any).duration || 'q'
      const noteDurationValue = this.getNoteDurationValue(noteDuration)
      
      // If adding this note would exceed 4 beats, stop
      if (totalDuration + noteDurationValue > 4) {
        break
      }
      
      // Add the note to the beginning of our result array
      result.unshift(note)
      totalDuration += noteDurationValue
    }
    
    return result
  }

  private calculateTotalDuration(notes: StaveNote[]): number {
    return notes.reduce((total, note) => {
      // Access duration from the note's properties
      const duration = (note as any).duration || 'q'
      return total + this.getNoteDurationValue(duration)
    }, 0)
  }

  private fitNotesInMeasure(notes: StaveNote[], maxBeats: number): StaveNote[] {
    const result: StaveNote[] = []
    let currentDuration = 0
    
    for (let i = notes.length - 1; i >= 0; i--) {
      const note = notes[i]
      const duration = (note as any).duration || 'q'
      const noteDuration = this.getNoteDurationValue(duration)
      
      if (currentDuration + noteDuration <= maxBeats) {
        result.unshift(note)
        currentDuration += noteDuration
      } else {
        break
      }
    }
    
    return result
  }

  private getNoteDurationValue(duration: string): number {
    switch (duration) {
      case 'w': return 4
      case 'h': return 2
      case 'q': return 1
      case '8': return 0.5
      case '16': return 0.25
      default: return 0.25
    }
  }

  private getBestRestDuration(duration: number): string {
    // Round to avoid floating point precision issues
    duration = Math.round(duration * 16) / 16
    
    if (duration >= 4) return 'wr'
    if (duration >= 2) return 'hr'
    if (duration >= 1) return 'qr'
    if (duration >= 0.5) return '8r'
    if (duration >= 0.25) return '16r'
    return '16r' // Default to smallest rest
  }

  private midiToNoteInfo(midiNote: number): { noteName: string; octave: number; accidental: Accidental | null } {
    const noteMap = [
      { name: 'c', accidental: null },           // 0 - C
      { name: 'c', accidental: new Accidental('#') }, // 1 - C#
      { name: 'd', accidental: null },           // 2 - D
      { name: 'd', accidental: new Accidental('#') }, // 3 - D#
      { name: 'e', accidental: null },           // 4 - E
      { name: 'f', accidental: null },           // 5 - F
      { name: 'f', accidental: new Accidental('#') }, // 6 - F#
      { name: 'g', accidental: null },           // 7 - G
      { name: 'g', accidental: new Accidental('#') }, // 8 - G#
      { name: 'a', accidental: null },           // 9 - A
      { name: 'a', accidental: new Accidental('#') }, // 10 - A#
      { name: 'b', accidental: null },           // 11 - B
    ]
    
    const noteIndex = midiNote % 12
    const octave = Math.floor(midiNote / 12) - 1
    const noteInfo = noteMap[noteIndex]
    
    return {
      noteName: noteInfo.name,
      octave: octave,
      accidental: noteInfo.accidental
    }
  }

  clearNotes(): void {
    this.notes = []
    this.redrawStave()
  }
}