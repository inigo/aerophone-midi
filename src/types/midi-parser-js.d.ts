declare module 'midi-parser-js' {
  interface MidiEvent {
    deltaTime: number
    type: number
    data?: number[]
  }

  interface MidiTrack {
    event: MidiEvent[]
  }

  interface MidiData {
    track: MidiTrack[]
    timeDivision: number
    formatType: number
  }

  function parse(data: Uint8Array): MidiData
  
  export default { parse }
}