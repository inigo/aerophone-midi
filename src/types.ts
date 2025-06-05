export interface MIDIMessage {
  data: Uint8Array
  timestamp: number
}

export interface MIDIDevice {
  id: string
  name: string
  manufacturer: string
  type: 'input' | 'output'
  connected: boolean
}

export interface MIDIEventData {
  channel: number
  note?: number
  velocity?: number
  controller?: number
  value?: number
  program?: number
}