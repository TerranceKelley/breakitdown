export default defineEventHandler(async (event) => {
  // Read environment variables directly
  const ttsUrl = process.env.TTS_URL || 'http://localhost:9001'

  // Get the text from the request body
  const body = await readBody(event)
  const text = body?.text || body

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw createError({
      statusCode: 400,
      message: 'Text is required for synthesis'
    })
  }

  try {
    console.log('[DEBUG] /api/synthesize: Using TTS at', ttsUrl)
    
    // Call local TTS API (Piper HTTP)
    const response = await fetch(`${ttsUrl}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: text.trim()
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`TTS API error: ${response.status} ${errorText}`)
    }

    // Get the audio data as a buffer
    const audioBuffer = await response.arrayBuffer()
    const audioData = Buffer.from(audioBuffer)

    // Determine content type (Piper returns WAV)
    const contentType = response.headers.get('content-type') || 'audio/wav'

    // Track token usage (local TTS is free)
    let tokenUsage = undefined
    try {
      const { useTokenTracker } = await import('~/composables/useTokenTracker')
      const tracker = useTokenTracker()
      // Estimate tokens: roughly 1 token per 4 characters
      const estimatedTokens = Math.ceil(text.length / 4)
      tokenUsage = tracker.createTokenUsage(
        {
          prompt_tokens: estimatedTokens,
          completion_tokens: 0,
          total_tokens: estimatedTokens
        },
        'synthesize',
        'piper-tts',
        undefined
      )
    } catch (usageError) {
      console.error('Failed to record token usage for synthesis:', usageError)
    }

    // Set response headers for audio
    setHeader(event, 'Content-Type', contentType)
    setHeader(event, 'Content-Length', String(audioData.length))
    setHeader(event, 'Cache-Control', 'no-cache')

    // Return the audio buffer - Nuxt will handle binary response
    return audioData
  } catch (error: any) {
    console.error('TTS synthesis error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to synthesize speech'
    })
  }
})
