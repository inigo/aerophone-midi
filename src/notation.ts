import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow'

export class NotationRenderer {
  private renderer: Renderer | null = null
  private context: any = null
  private stave: Stave | null = null
  private notes: StaveNote[] = []
  private voice: Voice | null = null

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

  addNote(midiNote: number): void {
    const { noteName, octave, accidental } = this.midiToNoteInfo(midiNote)
    
    try {
      const note = new StaveNote({
        clef: 'treble',
        keys: [`${noteName}/${octave}`],
        duration: 'q'
      })
      
      // Add accidental if needed
      if (accidental) {
        note.addModifier(accidental, 0)
      }
      
      this.notes.push(note)
      this.redrawStave()
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  private redrawStave(): void {
    if (!this.context || !this.stave) return
    
    this.context.clear()
    
    this.stave.setContext(this.context).draw()
    
    if (this.notes.length > 0) {
      const displayNotes = this.notes.slice(-16) // Show last 16 notes
      
      // Use sixteenth notes to fit more notes
      const compactNotes = displayNotes.map(note => {
        const compactNote = new StaveNote({
          clef: 'treble',
          keys: note.keys || ['c/4'], // Keep the same pitch or default
          duration: '16' // Sixteenth note
        })
        
        // Copy any modifiers (like accidentals) from original note
        if (note.modifiers) {
          note.modifiers.forEach((modifier: any) => {
            compactNote.addModifier(modifier, 0)
          })
        }
        
        return compactNote
      })
      
      // Pad to fill exactly 4 beats (16 sixteenth notes = 4 quarter notes)
      while (compactNotes.length < 16) {
        compactNotes.push(new StaveNote({
          clef: 'treble',
          keys: ['b/4'],
          duration: '16r' // sixteenth rest
        }))
      }
      
      this.voice = new Voice({ num_beats: 4, beat_value: 4 })
      this.voice.addTickables(compactNotes)
      
      const formatter = new Formatter()
      formatter.joinVoices([this.voice]).format([this.voice], 700)
      
      this.voice.draw(this.context, this.stave)
    }
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