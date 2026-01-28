import OpenAI from 'openai'
import type { BreakdownRequest } from '~/types'
import { breakdownRequestToToon } from '~/utils/toon'

interface RefineConceptRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  conceptContext: {
    concept: {
      title: string
      description: string
    }
    context?: {
      ideaName?: string
      rootIdea?: string
      parentChain?: Array<{ title: string; description: string }>
      depth?: number
    }
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody<RefineConceptRequest>(event)

  if (!body.messages || !Array.isArray(body.messages)) {
    throw createError({
      statusCode: 400,
      message: 'Messages array is required'
    })
  }

  if (!body.conceptContext || !body.conceptContext.concept) {
    throw createError({
      statusCode: 400,
      message: 'Concept context is required'
    })
  }

  // Check if using Ollama (handle both string 'true' and boolean true)
  const useOllama = config.useOllama === true || config.useOllama === 'true' || false
  
  if (!useOllama && !config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      message: 'OpenAI API key is not configured and Ollama is not enabled'
    })
  }

  // Get model from config
  const model = useOllama 
    ? (config.ollamaModel || 'gpt-oss:20b')
    : (config.openaiModel || 'gpt-4o')

  let openai: OpenAI | null = null
  if (!useOllama) {
    openai = new OpenAI({
      apiKey: config.openaiApiKey
    })
  }

  try {
    // Build context for the AI
    const breakdownRequest: BreakdownRequest = {
      concept: body.conceptContext.concept,
      context: body.conceptContext.context
    }
    const toonData = breakdownRequestToToon(breakdownRequest)

    // System prompt for refining the concept
    const systemPrompt = `You are a skilled editor helping to refine a concept based on a conversation. Your task is to synthesize the discussion and create an improved, polished version of the concept's title and description.

CONCEPT CONTEXT (TOON format):
${toonData}

Based on the conversation history provided, generate a refined version of the concept that:
- Incorporates all the insights, clarifications, and improvements discussed
- Maintains consistency with the parent concepts and root idea
- Is clear, well-written, and professional
- Preserves the original intent while improving clarity and detail

Return ONLY a JSON object with "title" and "description" fields. No other text.`

    // Build messages array with system prompt and conversation history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...body.messages,
      {
        role: 'user',
        content: 'Based on our conversation, please provide a refined version of this concept. Return a JSON object with "title" and "description" fields only.'
      }
    ]

    let completion: any
    let content: string
    
    if (useOllama) {
      const ollamaUrl = config.ollamaUrl || 'http://localhost:11434'
      
      const response = await $fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        body: {
          model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          options: {
            temperature: 0.7,
            num_predict: 500
          },
          stream: false,
          format: 'json'
        }
      })
      
      content = response.message?.content || '{}'
      completion = {
        choices: [{ message: { content } }],
        usage: {
          prompt_tokens: response.prompt_eval_count || 0,
          completion_tokens: response.eval_count || 0,
          total_tokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
        }
      }
    } else {
      completion = await openai!.chat.completions.create({
        model,
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      } as any)
      content = completion.choices[0]?.message?.content || '{}'
    }
    
    // Extract token usage
    const usage = completion.usage
    let tokenUsage = undefined
    if (usage) {
      try {
        const { useTokenTracker } = await import('~/composables/useTokenTracker')
        const tracker = useTokenTracker()
        tokenUsage = tracker.createTokenUsage(
          {
            prompt_tokens: usage.prompt_tokens || 0,
            completion_tokens: usage.completion_tokens || 0,
            total_tokens: usage.total_tokens || 0
          },
          'refine',
          model
        )
      } catch (tokenError) {
        console.error('Error creating token usage:', tokenError)
      }
    }
    
    // Parse the JSON response
    let refinedConcept
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)?.[0]
      refinedConcept = JSON.parse(jsonMatch || content)
    } catch (parseError) {
      console.error('Failed to parse refined concept response:', content)
      throw createError({
        statusCode: 500,
        message: 'Failed to parse AI response'
      })
    }

    // Validate response
    if (!refinedConcept.title || !refinedConcept.description) {
      throw createError({
        statusCode: 500,
        message: 'Invalid response format from AI'
      })
    }

    return {
      title: String(refinedConcept.title).trim(),
      description: String(refinedConcept.description).trim(),
      usage: tokenUsage
    }
  } catch (error: any) {
    console.error('OpenAI Refine Concept API error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to refine concept'
    })
  }
})

