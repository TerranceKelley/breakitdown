import OpenAI from 'openai'
import type { BreakdownResponse, BreakdownRequest } from '~/types'
import { breakdownRequestToToon } from '~/utils/toon'

export default defineEventHandler(async (event): Promise<BreakdownResponse> => {
  console.log('[DEBUG] /api/breakdown: Request received')
  const config = useRuntimeConfig(event)
  
  // Read environment variables directly (runtime config may not pick them up correctly)
  const useOllama = process.env.USE_OLLAMA === 'true'
  const ollamaUrl = process.env.OLLAMA_URL || config.ollamaUrl || 'http://localhost:11434'
  const ollamaModel = process.env.OLLAMA_MODEL || config.ollamaModel || 'gpt-oss:20b'
  const openaiApiKey = process.env.OPENAI_API_KEY || config.openaiApiKey || ''
  const openaiModel = process.env.OPENAI_MODEL || config.openaiModel || 'gpt-4o'
  
  console.log('[DEBUG] /api/breakdown: USE_OLLAMA from env:', process.env.USE_OLLAMA)
  console.log('[DEBUG] /api/breakdown: useOllama:', useOllama)
  console.log('[DEBUG] /api/breakdown: API key configured?', !!openaiApiKey)
  console.log('[DEBUG] /api/breakdown: Model:', useOllama ? ollamaModel : openaiModel)
  
  const body = await readBody(event)
  console.log('[DEBUG] /api/breakdown: Request body type:', body.idea ? 'legacy' : body.concept ? 'structured' : 'unknown')

  // Support both legacy string format and new structured format
  let request: BreakdownRequest
  
  if (body.idea && typeof body.idea === 'string') {
    // Legacy format: just a string
    const [title, ...descParts] = body.idea.split(':')
    request = {
      concept: {
        title: title.trim(),
        description: descParts.join(':').trim() || title.trim()
      }
    }
  } else if (body.concept && body.concept.title) {
    // New structured format
    request = body as BreakdownRequest
  } else {
    throw createError({
      statusCode: 400,
      message: 'Request must include either "idea" (string) or "concept" (object with title)'
    })
  }
  
  if (!useOllama && !openaiApiKey) {
    console.error('[DEBUG] /api/breakdown: ERROR - OpenAI API key is not configured and Ollama is not enabled')
    throw createError({
      statusCode: 500,
      message: 'OpenAI API key is not configured and Ollama is not enabled'
    })
  }

  // Get model from config
  const model = useOllama ? ollamaModel : openaiModel
  
  console.log('[DEBUG] /api/breakdown: Using', useOllama ? 'Ollama' : 'OpenAI')
  console.log('[DEBUG] /api/breakdown: Model:', model)

  let openai: OpenAI | null = null
  if (!useOllama) {
    console.log('[DEBUG] /api/breakdown: Initializing OpenAI client')
    openai = new OpenAI({
      apiKey: openaiApiKey
    })
  }
  console.log('[DEBUG] /api/breakdown: Using model:', model)

  try {
    console.log('[DEBUG] /api/breakdown: Converting request to TOON format')
    // Convert request to TOON format for efficient token usage
    const toonData = breakdownRequestToToon(request)

    const prompt = `Break down the following concept into 3-7 high-level sub-concepts. Each sub-concept should have a clear title and a brief description (1-2 sentences).

Use the provided context (in TOON format) to ensure the breakdown is relevant and appropriate. The sub-concepts should be components or aspects of the concept being broken down, fitting within the overall idea context.

REQUEST DATA (TOON format):
${toonData}

Return only a JSON array of objects with "title" and "description" fields, no other text.

Format your response as a JSON array like this:
[
  {"title": "Sub-concept Title", "description": "Sub-concept description"},
  {"title": "Another Sub-concept", "description": "Another description"}
]`

    let completion: any
    let content: string
    
    if (useOllama) {
      console.log('[DEBUG] /api/breakdown: Calling Ollama API...')
      console.log('[DEBUG] /api/breakdown: Ollama URL:', ollamaUrl)
      
      const response = await $fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        body: {
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that breaks down ideas into structured concepts. Always return valid JSON arrays.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          options: {
            temperature: 0.7,
            num_predict: 1000
          },
          stream: false
        }
      })
      
      content = response.message?.content || '[]'
      completion = {
        choices: [{ message: { content } }],
        usage: {
          prompt_tokens: response.prompt_eval_count || 0,
          completion_tokens: response.eval_count || 0,
          total_tokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
        }
      }
      console.log('[DEBUG] /api/breakdown: Ollama API call successful')
      console.log('[DEBUG] /api/breakdown: Usage:', completion.usage)
    } else {
      console.log('[DEBUG] /api/breakdown: Calling OpenAI API...')
      completion = await openai!.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that breaks down ideas into structured concepts. Always return valid JSON arrays.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
      console.log('[DEBUG] /api/breakdown: OpenAI API call successful')
      console.log('[DEBUG] /api/breakdown: Usage:', completion.usage)
    }

    content = completion.choices[0]?.message?.content || '[]'
    console.log('[DEBUG] /api/breakdown: Response content length:', content.length)
    
    // Extract token usage
    console.log('[DEBUG] /api/breakdown: Extracting token usage')
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
          'breakdown',
          model
        )
        console.log('[DEBUG] /api/breakdown: Token usage created successfully')
      } catch (tokenError) {
        console.error('[DEBUG] /api/breakdown: Error creating token usage:', tokenError)
      }
    }
    
    // Try to parse JSON from the response
    let concepts
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/\[[\s\S]*\]/)?.[0]
      concepts = JSON.parse(jsonMatch || content)
    } catch (parseError) {
      // Fallback: try to extract concepts from text
      console.error('Failed to parse AI response:', content)
      throw createError({
        statusCode: 500,
        message: 'Failed to parse AI response'
      })
    }

    // Validate and format the response
    if (!Array.isArray(concepts)) {
      throw createError({
        statusCode: 500,
        message: 'Invalid response format from AI'
      })
    }

    const formattedConcepts = concepts
      .filter((c: any) => c.title && c.description)
      .map((c: any) => ({
        title: String(c.title).trim(),
        description: String(c.description).trim()
      }))

    if (formattedConcepts.length === 0) {
      throw createError({
        statusCode: 500,
        message: 'No valid concepts generated'
      })
    }

    return {
      concepts: formattedConcepts,
      usage: tokenUsage
    }
  } catch (error: any) {
    console.error('[DEBUG] /api/breakdown: ERROR caught:', error)
    console.error('[DEBUG] /api/breakdown: Error type:', error?.constructor?.name)
    console.error('[DEBUG] /api/breakdown: Error message:', error?.message)
    console.error('[DEBUG] /api/breakdown: Error status:', error?.status)
    console.error('[DEBUG] /api/breakdown: Error statusCode:', error?.statusCode)
    console.error('[DEBUG] /api/breakdown: Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to break down idea'
    })
  }
})

