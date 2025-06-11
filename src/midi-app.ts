import { WebMidi, Input } from 'webmidi'
import { NotationRenderer } from './notation'

export class MIDIApp {
  private deviceListElement: HTMLElement | null = null
  private messageLogElement: HTMLElement | null = null
  private messageCount = 0
  private notationRenderer: NotationRenderer

  constructor() {
    this.deviceListElement = document.getElementById('device-list')
    this.messageLogElement = document.getElementById('message-log')
    this.notationRenderer = new NotationRenderer('stave-container')
  }

  initialize(): void {
    this.updateDeviceList()
    this.setupDeviceListeners()
    
    WebMidi.addListener('connected', () => {
      this.updateDeviceList()
    })
    
    WebMidi.addListener('disconnected', () => {
      this.updateDeviceList()
    })
  }

  private updateDeviceList(): void {
    if (!this.deviceListElement) return

    this.deviceListElement.innerHTML = ''
    
    const inputs = WebMidi.inputs
    const outputs = WebMidi.outputs
    
    if (inputs.length === 0 && outputs.length === 0) {
      this.deviceListElement.innerHTML = '<p>No MIDI devices found</p>'
      return
    }
    
    if (inputs.length > 0) {
      const inputsDiv = document.createElement('div')
      inputsDiv.innerHTML = '<h3>Inputs:</h3>'
      inputs.forEach(input => {
        const deviceDiv = document.createElement('div')
        deviceDiv.textContent = `${input.name} (${input.manufacturer})`
        inputsDiv.appendChild(deviceDiv)
      })
      this.deviceListElement.appendChild(inputsDiv)
    }
    
    if (outputs.length > 0) {
      const outputsDiv = document.createElement('div')
      outputsDiv.innerHTML = '<h3>Outputs:</h3>'
      outputs.forEach(output => {
        const deviceDiv = document.createElement('div')
        deviceDiv.textContent = `${output.name} (${output.manufacturer})`
        outputsDiv.appendChild(deviceDiv)
      })
      this.deviceListElement.appendChild(outputsDiv)
    }
  }

  private setupDeviceListeners(): void {
    WebMidi.inputs.forEach(input => {
      this.setupInputListeners(input)
    })
  }

  private setupInputListeners(input: Input): void {
    input.addListener('noteon', (event) => {
      this.notationRenderer.startNote(event.note.number)
      this.logMessage(`${input.name}: Note ON - ${event.note.name}${event.note.octave} (velocity: ${(event as any).velocity || 127})`)
    })
    
    input.addListener('noteoff', (event) => {
      this.notationRenderer.endNote(event.note.number)
      this.logMessage(`${input.name}: Note OFF - ${event.note.name}${event.note.octave}`)
    })
    
    input.addListener('midimessage', (event) => {
      this.logMessage(`${input.name}: ${this.formatMIDIMessage(event.message)}`)
    })
  }

  private formatMIDIMessage(message: any): string {
    const data = Array.from(message.data || message.rawData || [])
    return `[${data.map((byte: any) => byte.toString(16).padStart(2, '0')).join(' ')}]`
  }

  private logMessage(message: string): void {
    if (!this.messageLogElement) return
    
    this.messageCount++
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `${timestamp} - ${message}\n`
    
    this.messageLogElement.textContent += logEntry
    
    if (this.messageCount > 100) {
      const lines = this.messageLogElement.textContent?.split('\n') || []
      this.messageLogElement.textContent = lines.slice(-50).join('\n')
      this.messageCount = 50
    }
    
    this.messageLogElement.scrollTop = this.messageLogElement.scrollHeight
  }
}