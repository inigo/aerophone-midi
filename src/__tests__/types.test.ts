import { describe, it, expect } from 'vitest'
import type { MIDIMessage, MIDIDevice, MIDIEventData } from '../types'

describe('Types', () => {
  it('should define MIDIMessage interface correctly', () => {
    const message: MIDIMessage = {
      data: new Uint8Array([144, 60, 127]),
      timestamp: Date.now()
    }
    
    expect(message.data).toBeInstanceOf(Uint8Array)
    expect(typeof message.timestamp).toBe('number')
  })

  it('should define MIDIDevice interface correctly', () => {
    const device: MIDIDevice = {
      id: 'device-1',
      name: 'Test Device',
      manufacturer: 'Test Manufacturer',
      type: 'input',
      connected: true
    }
    
    expect(device.type).toBe('input')
    expect(device.connected).toBe(true)
  })

  it('should define MIDIEventData interface correctly', () => {
    const eventData: MIDIEventData = {
      channel: 1,
      note: 60,
      velocity: 127
    }
    
    expect(eventData.channel).toBe(1)
    expect(eventData.note).toBe(60)
    expect(eventData.velocity).toBe(127)
  })
})