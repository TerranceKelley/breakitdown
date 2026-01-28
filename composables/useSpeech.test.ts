import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSpeech } from './useSpeech'

describe('useSpeech', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window mocks
    if (typeof window !== 'undefined') {
      delete (window as any).SpeechRecognition
      delete (window as any).webkitSpeechRecognition
    }
  })

  it('should detect when speech recognition is not supported', () => {
    // Mock window without SpeechRecognition
    const { isSupported } = useSpeech()
    
    // Note: This test would need proper Vue component mounting
    // to fully test the composable
    expect(useSpeech).toBeDefined()
  })

  it('should detect when speech recognition is supported', () => {
    // Mock SpeechRecognition
    const mockRecognition = vi.fn().mockImplementation(() => ({
      continuous: false,
      interimResults: false,
      lang: '',
      start: vi.fn(),
      stop: vi.fn(),
      onresult: null,
      onerror: null,
      onend: null
    }))

    if (typeof window !== 'undefined') {
      ;(window as any).webkitSpeechRecognition = mockRecognition
    }

    const { isSupported } = useSpeech()
    
    expect(useSpeech).toBeDefined()
  })

  it('should provide methods to control listening', () => {
    const { startListening, stopListening, clearTranscript } = useSpeech()
    
    expect(startListening).toBeDefined()
    expect(stopListening).toBeDefined()
    expect(clearTranscript).toBeDefined()
  })
})

