import { computed } from 'vue'

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    mock?: {
      enabled: boolean
      model?: string
    }
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
      error?: string
    }
  }
}

export function useHealth() {
  const health = useState<HealthResponse | null>('health', () => null)
  const loading = useState<boolean>('healthLoading', () => false)
  const error = useState<string | null>('healthError', () => null)

  const isDemoMode = computed(() => !!health.value?.services?.mock?.enabled)

  const refresh = async () => {
    if (loading.value) return
    loading.value = true
    error.value = null
    try {
      health.value = await $fetch<HealthResponse>('/api/health')
    } catch (err: any) {
      error.value = err?.message || 'Health check failed'
      health.value = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {}
      }
    } finally {
      loading.value = false
    }
  }

  return {
    health,
    loading,
    error,
    isDemoMode,
    refresh
  }
}
