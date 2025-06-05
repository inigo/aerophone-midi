import { WebMidi } from 'webmidi'
import { MIDIApp } from './midi-app'

async function initializeApp() {
  const statusElement = document.getElementById('midi-status')
  
  try {
    await WebMidi.enable()
    
    if (statusElement) {
      statusElement.textContent = 'MIDI enabled successfully'
      statusElement.style.color = 'green'
    }
    
    const app = new MIDIApp()
    app.initialize()
    
  } catch (error) {
    console.error('Failed to enable WebMIDI:', error)
    
    if (statusElement) {
      statusElement.textContent = `MIDI error: ${error}`
      statusElement.style.color = 'red'
    }
  }
}

initializeApp()