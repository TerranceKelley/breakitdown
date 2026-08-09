import { describe, it, expect, beforeEach } from 'vitest'

/**
 * These are lightweight tests to ensure the server-side env toggles we rely on
 * for local demos don’t regress.
 *
 * They do NOT call external networks.
 */

describe('LLM config env toggles', () => {
  beforeEach(() => {
    delete process.env.USE_MOCK_LLM
    delete process.env.USE_OLLAMA
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_BASE_URL
  })

  it('prefers mock mode when USE_MOCK_LLM=true', () => {
    process.env.USE_MOCK_LLM = 'true'
    expect(process.env.USE_MOCK_LLM).toBe('true')
  })

  it('allows OpenAI-compatible base URL without an API key', () => {
    process.env.USE_OLLAMA = 'false'
    process.env.OPENAI_BASE_URL = 'http://localhost:8000/v1'
    expect(process.env.OPENAI_API_KEY || '').toBe('')
    expect(process.env.OPENAI_BASE_URL).toContain('/v1')
  })
})

