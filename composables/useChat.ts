interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ConceptContext {
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

export const useChat = () => {
  // Use useState to share state across all components
  const messages = useState<ChatMessage[]>('chat-messages', () => [])
  const isLoading = useState<boolean>('chat-loading', () => false)
  const error = useState<string | null>('chat-error', () => null)
  const conceptContext = useState<ConceptContext | null>('chat-context', () => null)

  const startConversation = async (context: ConceptContext) => {
    conceptContext.value = context
    messages.value = []
    error.value = null
    isLoading.value = true

    console.log('[useChat] Starting conversation with:', { context, isInitialMessage: true })

    try {
      const response = await $fetch<{ message: string; usage?: any }>('/api/chat', {
        method: 'POST',
        body: {
          messages: [],
          conceptContext: context,
          isInitialMessage: true
        }
      })

      console.log('[useChat] Received response:', response)

      if (response && response.message) {
        messages.value.push({
          role: 'assistant',
          content: response.message
        })
        console.log('[useChat] Added message to chat, total messages:', messages.value.length)
        
        // Return usage if available
        if (response.usage) {
          return { usage: response.usage }
        }
      } else {
        console.error('[useChat] Invalid response format:', response)
        error.value = 'Invalid response from server'
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to start conversation'
      console.error('[useChat] Chat error:', err)
    } finally {
      isLoading.value = false
    }
  }

  const sendMessage = async (userMessage: string) => {
    if (!conceptContext.value || !userMessage.trim()) {
      return
    }

    // Add user message to history
    messages.value.push({
      role: 'user',
      content: userMessage.trim()
    })

    isLoading.value = true
    error.value = null

    try {
      // Build messages array for API (excluding system message)
      const apiMessages = messages.value.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const response = await $fetch<{ message: string; usage?: any }>('/api/chat', {
        method: 'POST',
        body: {
          messages: apiMessages,
          conceptContext: conceptContext.value,
          isInitialMessage: false
        }
      })

      messages.value.push({
        role: 'assistant',
        content: response.message
      })
      
      // Return usage if available
      if (response.usage) {
        return { usage: response.usage }
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to send message'
      console.error('Chat error:', err)
      // Remove the user message if sending failed
      messages.value.pop()
    } finally {
      isLoading.value = false
    }
  }

  const clearChat = () => {
    messages.value = []
    error.value = null
    conceptContext.value = null
    isLoading.value = false
  }

  return {
    messages: readonly(messages),
    isLoading: readonly(isLoading),
    error: readonly(error),
    conceptContext: readonly(conceptContext),
    startConversation,
    sendMessage,
    clearChat
  }
}

