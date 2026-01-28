export const useSpeech = () => {
  const isSupported = ref(false)
  const isListening = ref(false)
  const transcript = ref('')
  const error = ref<string | null>(null)
  const isProcessing = ref(false)
  let recordingStartTime: number | null = null

  let mediaRecorder: MediaRecorder | null = null
  let audioChunks: Blob[] = []
  let stream: MediaStream | null = null

  onMounted(() => {
    // Check if MediaRecorder API is supported
    if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      isSupported.value = true
    }
  })

  const startListening = async () => {
    if (!isSupported.value) {
      error.value = 'Speech recognition is not supported in this browser. Please use a modern browser with microphone access.'
      return
    }

    if (isListening.value) {
      stopListening()
      return
    }

    transcript.value = ''
    error.value = null
    audioChunks = []

    try {
      // Request microphone access
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Check if MediaRecorder is supported
      const MediaRecorderClass = (window as any).MediaRecorder || (window as any).webkitMediaRecorder
      if (!MediaRecorderClass) {
        throw new Error('MediaRecorder API not supported')
      }

      // Create MediaRecorder with webm format (widely supported)
      const options: MediaRecorderOptions = {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/webm;codecs=opus'
      }

      mediaRecorder = new MediaRecorder(stream, options)
      isListening.value = true
      recordingStartTime = Date.now()

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        if (audioChunks.length === 0) {
          error.value = 'No audio recorded. Please try again.'
          isListening.value = false
          recordingStartTime = null
          return
        }

        // Process the audio
        await processAudio()
        
        // Stop the media stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
          stream = null
        }
        recordingStartTime = null
      }

      mediaRecorder.onerror = (event: any) => {
        error.value = 'Recording error occurred. Please try again.'
        isListening.value = false
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
          stream = null
        }
        recordingStartTime = null
      }

      // Start recording
      mediaRecorder.start()
    } catch (err: any) {
      console.error('Error starting recording:', err)
      
      let errorMessage = 'Failed to start recording. '
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage += 'Microphone permission denied. Please allow microphone access in your browser settings.'
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.'
      } else {
        errorMessage += err.message || 'Please try again.'
      }
      
      error.value = errorMessage
      isListening.value = false
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
        stream = null
      }
    }
  }

  const stopListening = () => {
    if (mediaRecorder && isListening.value && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
    isListening.value = false
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      stream = null
    }
    recordingStartTime = null
  }

  const processAudio = async () => {
    if (audioChunks.length === 0) {
      error.value = 'No audio recorded.'
      return
    }

    isProcessing.value = true
    error.value = null

    try {
      // Combine audio chunks into a single blob
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      const durationSeconds = recordingStartTime ? Math.max(0, Math.round((Date.now() - recordingStartTime) / 1000)) : undefined
      
      // Create FormData to send to server
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      if (durationSeconds !== undefined) {
        formData.append('durationSeconds', String(durationSeconds))
      }

      // Send to server for transcription
      const response = await $fetch<{ text: string; usage?: any }>('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      transcript.value = response.text.trim()
      audioChunks = []
      recordingStartTime = null
    } catch (err: any) {
      console.error('Transcription error:', err)
      error.value = err.message || 'Failed to transcribe audio. Please try again.'
    } finally {
      isProcessing.value = false
      isListening.value = false
    }
  }

  const clearTranscript = () => {
    transcript.value = ''
    error.value = null
  }
  
  const clearError = () => {
    error.value = null
  }

  onUnmounted(() => {
    stopListening()
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
  })

  return {
    isSupported: readonly(isSupported),
    isListening: readonly(isListening),
    isProcessing: readonly(isProcessing),
    transcript: readonly(transcript),
    error: readonly(error),
    startListening,
    stopListening,
    clearTranscript,
    clearError
  }
}
