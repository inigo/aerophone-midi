import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MIDIApp } from '../midi-app'

vi.mock('webmidi', () => ({
  WebMidi: {
    inputs: [],
    outputs: [],
    addListener: vi.fn(),
    enable: vi.fn()
  }
}))

describe('MIDIApp', () => {
  let app: MIDIApp
  
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="device-list"></div>
      <pre id="message-log"></pre>
    `
    app = new MIDIApp()
  })

  it('should create an instance', () => {
    expect(app).toBeInstanceOf(MIDIApp)
  })

  it('should initialize without errors', () => {
    expect(() => app.initialize()).not.toThrow()
  })
})