import OpenAI from 'openai'

export default defineEventHandler(async (event) => {
  // Read environment variables directly (runtime config may not pick them up correctly)
  const useLocalWhisper = process.env.USE_LOCAL_WHISPER === 'true'
  const whisperUrl = process.env.WHISPER_URL || 'http://localhost:9000'
  const openaiApiKey = process.env.OPENAI_API_KEY || ''

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

  try {
    let text = ''
    let tokenUsage = undefined

    if (useLocalWhisper) {
      // Use local Whisper service
      console.log('[DEBUG] /api/transcribe: Using local Whisper at', whisperUrl)
      
      // Read the file as a buffer
      const arrayBuffer = await audioFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Create FormData for local Whisper API
      // In Node.js 18+, FormData is available globally
      const whisperFormData = new FormData()
      // Create a File-like object for FormData
      const fileBlob = new Blob([buffer], { type: audioFile.type || 'audio/webm' })
      const file = new File([fileBlob], audioFile.name || 'recording.webm', {
        type: audioFile.type || 'audio/webm'
      })
      whisperFormData.append('audio_file', file)
      whisperFormData.append('task', 'transcribe')
      whisperFormData.append('language', 'en')
      whisperFormData.append('output', 'txt')

      // Call local Whisper API
      const response = await fetch(`${whisperUrl}/asr`, {
        method: 'POST',
        body: whisperFormData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Whisper API error: ${response.status} ${errorText}`)
      }

      text = await response.text()

      // Track token usage (local Whisper is free)
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
          'whisper-local',
          typeof durationSeconds === 'number' && !Number.isNaN(durationSeconds) ? durationSeconds : undefined
        )
      } catch (usageError) {
        console.error('Failed to record token usage for transcription:', usageError)
      }
    } else {
      // Fallback to OpenAI Whisper
      if (!openaiApiKey) {
        throw createError({
          statusCode: 500,
          message: 'OpenAI API key is not configured and local Whisper is not enabled'
        })
      }

      console.log('[DEBUG] /api/transcribe: Using OpenAI Whisper')
      
      const openai = new OpenAI({
        apiKey: openaiApiKey
      })

      // Read the file as a buffer
      const arrayBuffer = await audioFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Create a File object for OpenAI
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
      text = typeof transcription === 'string' ? transcription : String(transcription)

      // Track token usage (Whisper priced per minute, using duration if provided)
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
    }
    
    return {
      text: text.trim(),
      usage: tokenUsage
    }
  } catch (error: any) {
    console.error('Transcription error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to transcribe audio'
    })
  }
})
