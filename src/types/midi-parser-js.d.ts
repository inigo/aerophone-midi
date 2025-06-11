declare module 'midi-parser-js' {
  interface MidiEvent {
    deltaTime?: number
    type: number
    data?: number[]
    channel?: number
  }

  interface MidiTrack {
    event?: MidiEvent[]
    events?: MidiEvent[]
  }

  interface MidiData {
    track?: MidiTrack[]
    tracks?: MidiTrack[]
    timeDivision?: number
    formatType?: number
  }

  const MidiParser: {
    parse(data: Uint8Array): MidiData
  }
  
  export default MidiParser
}