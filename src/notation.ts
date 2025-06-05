import { Renderer, Stave, StaveNote, Voice, Formatter } from 'vexflow'

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
    const noteName = this.midiToNoteName(midiNote)
    const octave = this.midiToOctave(midiNote)
    
    try {
      const note = new StaveNote({
        clef: 'treble',
        keys: [`${noteName}/${octave}`],
        duration: 'q'
      })
      
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
      const displayNotes = this.notes.slice(-8)
      
      // Pad notes to fill 4 beats if needed
      const paddedNotes = [...displayNotes]
      while (paddedNotes.length < 4) {
        paddedNotes.push(new StaveNote({
          clef: 'treble',
          keys: ['b/4'],
          duration: 'qr' // quarter rest
        }))
      }
      
      this.voice = new Voice({ num_beats: 4, beat_value: 4 })
      this.voice.addTickables(paddedNotes)
      
      const formatter = new Formatter()
      formatter.joinVoices([this.voice]).format([this.voice], 700)
      
      this.voice.draw(this.context, this.stave)
    }
  }

  private midiToNoteName(midiNote: number): string {
    const noteNames = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']
    return noteNames[midiNote % 12]
  }

  private midiToOctave(midiNote: number): number {
    return Math.floor(midiNote / 12) - 1
  }

  clearNotes(): void {
    this.notes = []
    this.redrawStave()
  }
}