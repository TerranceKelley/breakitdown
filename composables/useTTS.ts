export const useTTS = () => {
  const isSupported = ref(true) // Browser support for audio playback
  const isSpeaking = ref(false)
  const error = ref<string | null>(null)
  const isProcessing = ref(false)
  let currentAudio: HTMLAudioElement | null = null

  const speak = async (text: string) => {
    if (!text || text.trim().length === 0) {
      error.value = 'No text provided for speech synthesis'
      return
    }

    // Stop any currently playing audio
    stop()

    isProcessing.value = true
    error.value = null

    try {
      // Call the synthesize endpoint
      const response = await $fetch<Blob>('/api/synthesize', {
        method: 'POST',
        body: { text: text.trim() },
        responseType: 'blob'
      })

      // Create audio element and play
      const audioUrl = URL.createObjectURL(response)
      currentAudio = new Audio(audioUrl)
      isSpeaking.value = true

      currentAudio.onended = () => {
        isSpeaking.value = false
        URL.revokeObjectURL(audioUrl)
        currentAudio = null
      }

      currentAudio.onerror = (err) => {
        error.value = 'Failed to play audio'
        isSpeaking.value = false
        isProcessing.value = false
        URL.revokeObjectURL(audioUrl)
        currentAudio = null
        console.error('Audio playback error:', err)
      }

      await currentAudio.play()
      isProcessing.value = false
    } catch (err: any) {
      console.error('TTS synthesis error:', err)
      error.value = err.message || 'Failed to synthesize speech. Please try again.'
      isProcessing.value = false
      isSpeaking.value = false
    }
  }

  const stop = () => {
    if (currentAudio) {
      currentAudio.pause()
      currentAudio.currentTime = 0
      currentAudio = null
    }
    isSpeaking.value = false
  }

  const clearError = () => {
    error.value = null
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isSupported: readonly(isSupported),
    isSpeaking: readonly(isSpeaking),
    isProcessing: readonly(isProcessing),
    error: readonly(error),
    speak,
    stop,
    clearError
  }
}
