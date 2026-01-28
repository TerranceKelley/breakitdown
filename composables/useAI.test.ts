import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAI } from './useAI'

// Mock $fetch
vi.mock('#app', () => ({
  useRuntimeConfig: () => ({
    openaiApiKey: 'test-key',
    public: {
      appName: 'Breakitdown'
    }
  })
}))

global.$fetch = vi.fn()

describe('useAI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should break down an idea successfully', async () => {
    const mockResponse = {
      concepts: [
        { title: 'Concept 1', description: 'Description 1' },
        { title: 'Concept 2', description: 'Description 2' }
      ]
    }

    ;(global.$fetch as any).mockResolvedValue(mockResponse)

    const { breakDownIdea, isLoading, error } = useAI()

    const result = await breakDownIdea('Build a web app')

    expect(result).toEqual(mockResponse)
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(global.$fetch).toHaveBeenCalledWith('/api/breakdown', {
      method: 'POST',
      body: {
        concept: {
          title: 'Build a web app',
          description: 'Build a web app'
        }
      }
    })
  })

  it('should handle empty idea', async () => {
    const { breakDownIdea, error } = useAI()

    const result = await breakDownIdea('')

    expect(result).toBeNull()
    expect(error.value).toBe('Idea cannot be empty')
  })

  it('should handle API errors', async () => {
    const mockError = new Error('API Error')
    ;(global.$fetch as any).mockRejectedValue(mockError)

    const { breakDownIdea, error } = useAI()

    const result = await breakDownIdea('Test idea')

    expect(result).toBeNull()
    expect(error.value).toBe('API Error')
  })

  it('should trim whitespace from idea', async () => {
    const mockResponse = { concepts: [] }
    ;(global.$fetch as any).mockResolvedValue(mockResponse)

    const { breakDownIdea } = useAI()

    await breakDownIdea('  Test idea  ')

    expect(global.$fetch).toHaveBeenCalledWith('/api/breakdown', {
      method: 'POST',
      body: {
        concept: {
          title: 'Test idea',
          description: 'Test idea'
        }
      }
    })
  })
})

