import { vi } from 'vitest'

Object.defineProperty(window, 'navigator', {
  value: {
    requestMIDIAccess: vi.fn()
  },
  writable: true
})

global.MIDIAccess = vi.fn()
global.MIDIInput = vi.fn()
global.MIDIOutput = vi.fn()
global.MIDIMessageEvent = vi.fn()