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
  private stave: Stave | null = null
  private notes: StaveNote[] = []
  private voice: Voice | null = null
  private activeNotes: Map<number, ActiveNote> = new Map()

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
    this.renderer.resize(800, 200)
    this.context = this.renderer.getContext()
    
    this.stave = new Stave(10, 40, 750)
    this.stave.addClef('treble').addTimeSignature('4/4')
    this.stave.setContext(this.context).draw()
    
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
    
    if (elapsed > 125) newDuration = '8'   // eighth note
    if (elapsed > 250) newDuration = 'q'   // quarter note  
    if (elapsed > 500) newDuration = 'h'   // half note
    if (elapsed > 1000) newDuration = 'w'  // whole note
    
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
    if (!this.context || !this.stave) return
    
    this.context.clear()
    
    this.stave.setContext(this.context).draw()
    
    if (this.notes.length > 0) {
      // Simple approach: just show the last note with fixed quarter note duration
      const lastNote = this.notes[this.notes.length - 1]
      
      // Create notes to fill exactly 4 quarter beats
      const notesToShow = []
      const lastNoteDuration = (lastNote as any).duration || 'q'
      const lastNoteDurationValue = this.getNoteDurationValue(lastNoteDuration)
      
      notesToShow.push(lastNote)
      
      // Fill remaining beats with rests
      let remainingBeats = 4 - lastNoteDurationValue
      while (remainingBeats > 0) {
        if (remainingBeats >= 1) {
          notesToShow.push(new StaveNote({ clef: 'treble', keys: ['b/4'], duration: 'qr' }))
          remainingBeats -= 1
        } else if (remainingBeats >= 0.5) {
          notesToShow.push(new StaveNote({ clef: 'treble', keys: ['b/4'], duration: '8r' }))
          remainingBeats -= 0.5
        } else {
          notesToShow.push(new StaveNote({ clef: 'treble', keys: ['b/4'], duration: '16r' }))
          remainingBeats -= 0.25
        }
      }
      
      this.voice = new Voice({ num_beats: 4, beat_value: 4 })
      this.voice.addTickables(notesToShow)
      
      const formatter = new Formatter()
      formatter.joinVoices([this.voice]).format([this.voice], 700)
      
      this.voice.draw(this.context, this.stave)
    }
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