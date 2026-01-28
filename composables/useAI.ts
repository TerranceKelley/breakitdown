import type { BreakdownResponse, BreakdownRequest } from '~/types'

export const useAI = () => {
  const config = useRuntimeConfig()
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const breakDownIdea = async (idea: string | BreakdownRequest): Promise<BreakdownResponse | null> => {
    isLoading.value = true
    error.value = null

    try {
      let requestBody: BreakdownRequest
      
      // Support both string (legacy) and structured format
      if (typeof idea === 'string') {
        if (!idea.trim()) {
          error.value = 'Idea cannot be empty'
          return null
        }
        // Convert string to structured format
        const [title, ...descParts] = idea.split(':')
        requestBody = {
          concept: {
            title: title.trim(),
            description: descParts.join(':').trim() || title.trim()
          }
        }
      } else {
        requestBody = idea
      }

      const response = await $fetch<BreakdownResponse & { usage?: any }>('/api/breakdown', {
        method: 'POST',
        body: requestBody
      })

      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to break down idea'
      console.error('AI breakdown error:', err)
      return null
    } finally {
      isLoading.value = false
    }
  }

  return {
    breakDownIdea,
    isLoading: readonly(isLoading),
    error: readonly(error)
  }
}

