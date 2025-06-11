import { WebMidi } from 'webmidi'
import { MIDIApp } from './midi-app'
import { MidiFileHandler } from './midi-file-handler'

class AppRouter {
  private midiApp: MIDIApp | null = null
  private midiFileHandler: MidiFileHandler | null = null

  constructor() {
    this.initializeNavigation()
    this.initializeLivePage()
    this.initializeFilePage()
  }

  private initializeNavigation(): void {
    const livePageBtn = document.getElementById('live-page-btn')
    const filePageBtn = document.getElementById('file-page-btn')
    
    livePageBtn?.addEventListener('click', () => this.showPage('live'))
    filePageBtn?.addEventListener('click', () => this.showPage('file'))
  }

  private showPage(page: 'live' | 'file'): void {
    
    const livePage = document.getElementById('live-page')
    const filePage = document.getElementById('file-page')
    const liveBtn = document.getElementById('live-page-btn')
    const fileBtn = document.getElementById('file-page-btn')
    
    if (page === 'live') {
      livePage?.style.setProperty('display', 'block')
      filePage?.style.setProperty('display', 'none')
      liveBtn?.classList.add('active')
      fileBtn?.classList.remove('active')
    } else {
      livePage?.style.setProperty('display', 'none')
      filePage?.style.setProperty('display', 'block')
      liveBtn?.classList.remove('active')
      fileBtn?.classList.add('active')
    }
  }

  private async initializeLivePage(): Promise<void> {
    const statusElement = document.getElementById('midi-status')
    
    try {
      await WebMidi.enable()
      
      if (statusElement) {
        statusElement.textContent = 'MIDI enabled successfully'
        statusElement.style.color = 'green'
      }
      
      this.midiApp = new MIDIApp()
      this.midiApp.initialize()
      
    } catch (error) {
      console.error('Failed to enable WebMIDI:', error)
      
      if (statusElement) {
        statusElement.textContent = `MIDI error: ${error}`
        statusElement.style.color = 'red'
      }
    }
  }

  private initializeFilePage(): void {
    this.midiFileHandler = new MidiFileHandler('file-stave-container')
    
    const fileInput = document.getElementById('midi-file-input') as HTMLInputElement
    const clearBtn = document.getElementById('clear-notes-btn')
    
    fileInput?.addEventListener('change', async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (file && this.midiFileHandler) {
        try {
          await this.midiFileHandler.handleFileUpload(file)
        } catch (error) {
          console.error('Error handling file upload:', error)
          alert('Error processing MIDI file. Please ensure it is a valid .mid file.')
        }
      }
    })
    
    clearBtn?.addEventListener('click', () => {
      this.midiFileHandler?.clearNotes()
      if (fileInput) fileInput.value = ''
    })
  }
}

new AppRouter()