import OpenAI from 'openai'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      message: 'OpenAI API key is not configured'
    })
  }

  // Get the audio file from the request
  const formData = await readFormData(event)
  const audioFile = formData.get('audio') as File
  const durationSecondsRaw = formData.get('durationSeconds')
  const durationSeconds = durationSecondsRaw ? Number(durationSecondsRaw) : undefined

  if (!audioFile) {
    throw createError({
      statusCode: 400,
      message: 'Audio file is required'
    })
  }

  // Validate file type
  if (!audioFile.type.startsWith('audio/')) {
    throw createError({
      statusCode: 400,
      message: 'Invalid file type. Please provide an audio file.'
    })
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey
  })

  try {
    // Read the file as a buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Create a File object for OpenAI
    // In Node.js 18+, File is available globally
    const file = new File([buffer], audioFile.name || 'recording.webm', {
      type: audioFile.type || 'audio/webm'
    })

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'text'
    })

    // When response_format is 'text', the response is a string
    const text = typeof transcription === 'string' ? transcription : String(transcription)

    // Track token usage (Whisper priced per minute, using duration if provided)
    let tokenUsage = undefined
    try {
      const { useTokenTracker } = await import('~/composables/useTokenTracker')
      const tracker = useTokenTracker()
      tokenUsage = tracker.createTokenUsage(
        {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        },
        'transcribe',
        'whisper-1',
        typeof durationSeconds === 'number' && !Number.isNaN(durationSeconds) ? durationSeconds : undefined
      )
    } catch (usageError) {
      console.error('Failed to record token usage for transcription:', usageError)
    }
    
    return {
      text: text.trim(),
      usage: tokenUsage
    }
  } catch (error: any) {
    console.error('OpenAI transcription error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to transcribe audio'
    })
  }
})
