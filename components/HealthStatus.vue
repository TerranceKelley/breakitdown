<template>
  <div v-if="showStatus" class="fixed bottom-4 right-4 z-50">
    <div 
      :class="[
        'px-4 py-2 rounded-lg shadow-lg border text-sm transition-all',
        statusClass
      ]"
    >
      <div class="flex items-center gap-2">
        <div :class="['w-2 h-2 rounded-full', statusDotClass]"></div>
        <span class="font-medium">{{ statusText }}</span>
        <button 
          @click="showStatus = false"
          class="ml-2 text-current opacity-70 hover:opacity-100"
          title="Dismiss"
        >
          ×
        </button>
      </div>
      <div v-if="details" class="mt-1 text-xs opacity-90">
        {{ details }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHealth } from '~/composables/useHealth'

const showStatus = ref(true)
const checking = ref(true)
const { health: healthStatus, refresh } = useHealth()

const statusClass = computed(() => {
  if (!healthStatus.value) return 'bg-muted border-border text-muted-foreground'
  switch (healthStatus.value.status) {
    case 'healthy':
      return 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
    case 'degraded':
      return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400'
    case 'unhealthy':
      return 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
    default:
      return 'bg-muted border-border text-muted-foreground'
  }
})

const statusDotClass = computed(() => {
  if (!healthStatus.value) return 'bg-gray-400'
  switch (healthStatus.value.status) {
    case 'healthy':
      return 'bg-green-500 animate-pulse'
    case 'degraded':
      return 'bg-yellow-500'
    case 'unhealthy':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
})

const statusText = computed(() => {
  if (checking.value) return 'Checking AI connection...'
  if (!healthStatus.value) return 'Health check failed'
  
  const mock = healthStatus.value.services.mock
  if (mock?.enabled) {
    return 'Demo mode (mock LLM)'
  }

  const ollama = healthStatus.value.services.ollama
  const openai = healthStatus.value.services.openai
  
  if (ollama?.enabled) {
    if (ollama.reachable) {
      return `Connected to Ollama (${ollama.model})`
    } else {
      return `Ollama unreachable: ${ollama.error || 'Connection failed'}`
    }
  } else if (openai?.enabled) {
    if (openai.configured) {
      return `OpenAI configured (${openai.model})`
    } else {
      return 'OpenAI API key not configured'
    }
  }
  
  return 'No AI service configured'
})

const details = computed(() => {
  if (!healthStatus.value) return null
  
  const ollama = healthStatus.value.services.ollama
  if (ollama?.error && ollama.error.includes('not found')) {
    return ollama.error
  }
  
  return null
})

onMounted(async () => {
  try {
    if (!healthStatus.value) {
      await refresh()
    }
  } catch (error: any) {
    console.error('Health check failed:', error)
  } finally {
    checking.value = false
    // Auto-hide after 10 seconds if healthy
    if (healthStatus.value?.status === 'healthy') {
      setTimeout(() => {
        showStatus.value = false
      }, 10000)
    }
  }
})
</script>
