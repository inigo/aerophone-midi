import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotationRenderer } from '../notation'

vi.mock('vexflow', () => {
  const MockRenderer = vi.fn().mockImplementation(() => ({
    resize: vi.fn(),
    getContext: vi.fn(() => ({
      clear: vi.fn(),
      draw: vi.fn()
    }))
  }))
  
  MockRenderer.Backends = {
    SVG: 'svg'
  }
  
  return {
    Renderer: MockRenderer,
    Stave: vi.fn().mockImplementation(() => ({
      addClef: vi.fn().mockReturnThis(),
      addTimeSignature: vi.fn().mockReturnThis(),
      setContext: vi.fn().mockReturnThis(),
      draw: vi.fn()
    })),
    StaveNote: vi.fn().mockImplementation((config) => ({
      keys: config?.keys || ['c/4'],
      addModifier: vi.fn(),
      modifiers: []
    })),
    Voice: vi.fn().mockImplementation(() => ({
      resetVoice: vi.fn(),
      addTickables: vi.fn(),
      draw: vi.fn()
    })),
    Formatter: vi.fn().mockImplementation(() => ({
      joinVoices: vi.fn().mockReturnThis(),
      format: vi.fn()
    })),
    Accidental: vi.fn().mockImplementation((type) => ({
      type: type
    }))
  }
})

describe('NotationRenderer', () => {
  let renderer: NotationRenderer
  
  beforeEach(() => {
    document.body.innerHTML = '<div id="test-container"></div>'
    renderer = new NotationRenderer('test-container')
  })

  it('should create an instance', () => {
    expect(renderer).toBeInstanceOf(NotationRenderer)
  })

  it('should handle missing container gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    new NotationRenderer('non-existent-container')
    
    expect(consoleSpy).toHaveBeenCalledWith('Container with id non-existent-container not found')
    consoleSpy.mockRestore()
  })

  it('should add note without throwing error', () => {
    expect(() => renderer.addNote(60)).not.toThrow()
  })

  it('should clear notes without throwing error', () => {
    renderer.addNote(60)
    renderer.addNote(64)
    expect(() => renderer.clearNotes()).not.toThrow()
  })

  it('should handle edge case MIDI notes', () => {
    expect(() => renderer.addNote(0)).not.toThrow()
    expect(() => renderer.addNote(127)).not.toThrow()
    expect(() => renderer.addNote(60)).not.toThrow()
  })
})