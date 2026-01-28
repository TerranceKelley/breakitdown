import type { TokenUsage } from '~/types'

// Model pricing (as of 2024)
// GPT-4 Turbo: Input $10/1M, Output $30/1M
const GPT4_TURBO_INPUT_PRICE = 10 / 1_000_000 // $0.00001 per token
const GPT4_TURBO_OUTPUT_PRICE = 30 / 1_000_000 // $0.00003 per token

// GPT-3.5 Turbo: Input $0.50/1M, Output $1.50/1M (much cheaper!)
const GPT35_TURBO_INPUT_PRICE = 0.50 / 1_000_000 // $0.0000005 per token
const GPT35_TURBO_OUTPUT_PRICE = 1.50 / 1_000_000 // $0.0000015 per token

// Whisper pricing
// $0.006 per minute of audio
// We'll estimate based on audio duration if available, otherwise skip
const WHISPER_PRICE_PER_MINUTE = 0.006

export const useTokenTracker = () => {
  /**
   * Calculate cost for GPT models based on token usage and model type
   */
  const calculateGPTCost = (promptTokens: number, completionTokens: number, model: string = 'gpt-4-turbo-preview'): number => {
    // Ollama models are free (self-hosted)
    if (model.includes('ollama') || model.includes('gpt-oss') || model.includes(':')) {
      return 0
    }
    
    const isGPT35 = model.includes('gpt-3.5')
    const inputPrice = isGPT35 ? GPT35_TURBO_INPUT_PRICE : GPT4_TURBO_INPUT_PRICE
    const outputPrice = isGPT35 ? GPT35_TURBO_OUTPUT_PRICE : GPT4_TURBO_OUTPUT_PRICE
    
    const inputCost = promptTokens * inputPrice
    const outputCost = completionTokens * outputPrice
    return inputCost + outputCost
  }

  /**
   * Calculate cost for Whisper transcription
   * Note: We don't have duration info from the API, so we'll estimate or skip
   */
  const calculateWhisperCost = (durationSeconds?: number): number => {
    if (!durationSeconds) return 0
    const minutes = durationSeconds / 60
    return minutes * WHISPER_PRICE_PER_MINUTE
  }

  /**
   * Create a TokenUsage object from OpenAI API response
   */
  const createTokenUsage = (
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number },
    operation: TokenUsage['operation'],
    model: string = 'gpt-4-turbo-preview',
    whisperDurationSeconds?: number
  ): TokenUsage => {
    let cost = 0
    
    if (operation === 'transcribe') {
      cost = calculateWhisperCost(whisperDurationSeconds)
    } else {
      cost = calculateGPTCost(usage.prompt_tokens, usage.completion_tokens, model)
    }

    return {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      cost,
      timestamp: Date.now(),
      operation,
      model
    }
  }

  /**
   * Calculate total cost from an array of token usage records
   */
  const calculateTotalCost = (usageRecords: TokenUsage[]): number => {
    return usageRecords.reduce((total, usage) => total + usage.cost, 0)
  }

  /**
   * Calculate total tokens from an array of token usage records
   */
  const calculateTotalTokens = (usageRecords: TokenUsage[]): number => {
    return usageRecords.reduce((total, usage) => total + usage.totalTokens, 0)
  }

  /**
   * Get usage summary by operation type
   */
  const getUsageByOperation = (usageRecords: TokenUsage[]) => {
    const summary: Record<string, { count: number; tokens: number; cost: number }> = {}
    
    usageRecords.forEach(usage => {
      if (!summary[usage.operation]) {
        summary[usage.operation] = { count: 0, tokens: 0, cost: 0 }
      }
      summary[usage.operation].count++
      summary[usage.operation].tokens += usage.totalTokens
      summary[usage.operation].cost += usage.cost
    })
    
    return summary
  }

  /**
   * Format cost for display
   */
  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(4)}`
  }

  /**
   * Format token count for display
   */
  const formatTokens = (tokens: number): string => {
    if (tokens < 1000) {
      return tokens.toString()
    }
    return `${(tokens / 1000).toFixed(1)}k`
  }

  return {
    calculateGPTCost,
    calculateWhisperCost,
    createTokenUsage,
    calculateTotalCost,
    calculateTotalTokens,
    getUsageByOperation,
    formatCost,
    formatTokens
  }
}
