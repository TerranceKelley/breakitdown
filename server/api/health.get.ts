interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    ollama?: {
      enabled: boolean
      reachable: boolean
      model?: string
      error?: string
    }
    openai?: {
      enabled: boolean
      configured: boolean
      model?: string
    }
  }
}

export default defineEventHandler(async (event): Promise<HealthResponse> => {
  const config = useRuntimeConfig(event)
  
  // Read environment variables directly
  const useOllama = process.env.USE_OLLAMA === 'true'
  const ollamaUrl = process.env.OLLAMA_URL || config.ollamaUrl || 'http://localhost:11434'
  const ollamaModel = process.env.OLLAMA_MODEL || config.ollamaModel || 'gpt-oss:20b'
  const openaiApiKey = process.env.OPENAI_API_KEY || config.openaiApiKey || ''
  const openaiModel = process.env.OPENAI_MODEL || config.openaiModel || 'gpt-4o'
  
  const response: HealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  }
  
  // Check Ollama if enabled
  if (useOllama) {
    response.services.ollama = {
      enabled: true,
      reachable: false,
      model: ollamaModel
    }
    
    try {
      // Test connection by checking if Ollama is reachable
      const testResponse = await $fetch(`${ollamaUrl}/api/tags`, {
        method: 'GET',
        timeout: 5000 // 5 second timeout
      }).catch((err) => {
        throw err
      })
      
      // Check if the model is available
      const models = (testResponse as any)?.models || []
      const modelAvailable = models.some((m: any) => 
        m.name === ollamaModel || m.model === ollamaModel
      )
      
      response.services.ollama.reachable = true
      if (!modelAvailable) {
        response.services.ollama.error = `Model ${ollamaModel} not found. Available models: ${models.map((m: any) => m.name).join(', ')}`
        response.status = 'degraded'
      }
    } catch (error: any) {
      response.services.ollama.reachable = false
      response.services.ollama.error = error.message || 'Connection failed'
      response.status = 'unhealthy'
    }
  } else {
    response.services.ollama = {
      enabled: false,
      reachable: false
    }
  }
  
  // Check OpenAI if not using Ollama
  if (!useOllama) {
    response.services.openai = {
      enabled: true,
      configured: !!openaiApiKey,
      model: openaiModel
    }
    
    if (!openaiApiKey) {
      response.status = 'unhealthy'
      response.services.openai.error = 'API key not configured'
    }
  } else {
    response.services.openai = {
      enabled: false,
      configured: false
    }
  }
  
  // Set status code based on health
  if (response.status === 'unhealthy') {
    setResponseStatus(event, 503) // Service Unavailable
  } else if (response.status === 'degraded') {
    setResponseStatus(event, 200) // OK but degraded
  }
  
  return response
})
