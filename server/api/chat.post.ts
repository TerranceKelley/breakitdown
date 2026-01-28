import OpenAI from 'openai'
import type { BreakdownRequest } from '~/types'
import { breakdownRequestToToon } from '~/utils/toon'

interface ChatRequest {
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
  isInitialMessage?: boolean
}

export default defineEventHandler(async (event) => {
  console.log('[DEBUG] /api/chat: Request received')
  const config = useRuntimeConfig(event)
  console.log('[DEBUG] /api/chat: API key configured?', !!config.openaiApiKey)
  console.log('[DEBUG] /api/chat: Model:', config.openaiModel || 'gpt-4-turbo-preview')
  
  const body = await readBody<ChatRequest>(event)
  console.log('[DEBUG] /api/chat: Messages count:', body.messages?.length || 0)
  console.log('[DEBUG] /api/chat: Is initial message?', body.isInitialMessage)

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

  // Check if using Ollama
  const useOllama = config.useOllama || false
  
  if (!useOllama && !config.openaiApiKey) {
    console.error('[DEBUG] /api/chat: ERROR - OpenAI API key is not configured and Ollama is not enabled')
    throw createError({
      statusCode: 500,
      message: 'OpenAI API key is not configured and Ollama is not enabled'
    })
  }

  // Get model from config
  const model = useOllama 
    ? (config.ollamaModel || 'gpt-oss:20b')
    : (config.openaiModel || 'gpt-4o')
  
  console.log('[DEBUG] /api/chat: Using', useOllama ? 'Ollama' : 'OpenAI')
  console.log('[DEBUG] /api/chat: Model:', model)

  let openai: OpenAI | null = null
  if (!useOllama) {
    console.log('[DEBUG] /api/chat: Initializing OpenAI client')
    openai = new OpenAI({
      apiKey: config.openaiApiKey
    })
  }

  try {
    console.log('[DEBUG] /api/chat: Building context and TOON format')
    // Build context for the AI
    const breakdownRequest: BreakdownRequest = {
      concept: body.conceptContext.concept,
      context: body.conceptContext.context
    }
    const toonData = breakdownRequestToToon(breakdownRequest)

    // System prompt that explains the AI's role
    const systemPrompt = `You are a helpful assistant that helps refine and improve a specific concept. Your goal is to help the user clarify, expand, and improve THIS PARTICULAR CONCEPT before they break it down into sub-concepts.

CONCEPT TO REFINE (TOON format):
${toonData}

IMPORTANT: Focus ONLY on the specific concept being discussed. All your questions and suggestions should be directly related to:
- The concept's title: "${body.conceptContext.concept.title}"
- The concept's description: "${body.conceptContext.concept.description}"
- How this concept fits within its context (parent concepts, root idea, depth in hierarchy)

Your role:
- Ask 1 thoughtful, guiding question about THIS CONCEPT to help refine and improve it
- Only ask 2 questions if they work together to clarify one aspect better (e.g., a main question with a follow-up clarification)
- Questions should be directly related to the concept's title and description
- Consider the context (parent chain, root idea, depth) when framing questions
- Help identify gaps or areas in THIS CONCEPT that need more detail or clarification
- Be conversational, helpful, and constructive
- Do NOT ask generic questions - all questions must be specific to this concept
- Keep questions concise to encourage a natural back-and-forth conversation

If this is the initial conversation, start immediately with 1 specific guiding question about this concept (or 2 if they work together to clarify one aspect). Be direct and focused.`

    // Build messages array with system prompt
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...body.messages
    ]

    // If this is the initial message, add a prompt to ask specific questions about this concept
    if (body.isInitialMessage) {
      messages.push({
        role: 'user',
        content: `Please ask me 1 specific, guiding question about the concept "${body.conceptContext.concept.title}" to help me refine and improve it. Only ask 2 questions if they work together to clarify one aspect better. Focus only on this concept and how it relates to its context. Start the conversation immediately with the question(s) - no introduction needed. Keep it conversational.`
      })
    }

    let completion: any
    let content: string
    
    if (useOllama) {
      console.log('[DEBUG] /api/chat: Calling Ollama API with', messages.length, 'messages')
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
            num_predict: 1000
          },
          stream: false
        }
      })
      
      content = response.message?.content || 'I apologize, but I encountered an error. Please try again.'
      completion = {
        choices: [{ message: { content } }],
        usage: {
          prompt_tokens: response.prompt_eval_count || 0,
          completion_tokens: response.eval_count || 0,
          total_tokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
        }
      }
      console.log('[DEBUG] /api/chat: Ollama API call successful')
      console.log('[DEBUG] /api/chat: Usage:', completion.usage)
    } else {
      console.log('[DEBUG] /api/chat: Calling OpenAI API with', messages.length, 'messages')
      completion = await openai!.chat.completions.create({
        model,
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 1000
      })
      console.log('[DEBUG] /api/chat: OpenAI API call successful')
      console.log('[DEBUG] /api/chat: Usage:', completion.usage)
    }

    content = completion.choices[0]?.message?.content || 'I apologize, but I encountered an error. Please try again.'
    console.log('[DEBUG] /api/chat: Response content length:', content.length)

    // Extract token usage
    console.log('[DEBUG] /api/chat: Extracting token usage')
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
          'chat',
          model
        )
        console.log('[DEBUG] /api/chat: Token usage created successfully')
      } catch (tokenError) {
        console.error('[DEBUG] /api/chat: Error creating token usage:', tokenError)
      }
    }

    return {
      message: content,
      usage: tokenUsage
    }
  } catch (error: any) {
    console.error('[DEBUG] /api/chat: ERROR caught:', error)
    console.error('[DEBUG] /api/chat: Error type:', error?.constructor?.name)
    console.error('[DEBUG] /api/chat: Error message:', error?.message)
    console.error('[DEBUG] /api/chat: Error status:', error?.status)
    console.error('[DEBUG] /api/chat: Error statusCode:', error?.statusCode)
    console.error('[DEBUG] /api/chat: Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to get AI response'
    })
  }
})

