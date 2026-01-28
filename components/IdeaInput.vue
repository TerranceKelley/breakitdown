<template>
  <div class="space-y-4">
    <div class="relative">
      <textarea
        :value="localIdea"
        :placeholder="placeholder"
        class="w-full min-h-[120px] p-4 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
        @input="handleInput"
      />
      <div v-if="speech.isSupported.value" class="absolute bottom-2 right-2">
        <button
          @click="toggleSpeech"
          :class="[
            'p-2 rounded-full transition-colors',
            speech.isListening.value
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          ]"
          :title="speech.isListening.value ? 'Stop recording' : speech.isProcessing.value ? 'Processing...' : 'Start voice input'"
          :disabled="speech.isProcessing.value"
        >
          <svg
            v-if="!speech.isListening.value"
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <svg
            v-else-if="speech.isProcessing.value"
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
      </div>
    </div>
    <div v-if="speech.isProcessing.value" class="text-sm text-muted-foreground">
      Processing audio...
    </div>
    <div v-else-if="speech.transcript.value && !speech.isListening.value" class="text-sm text-muted-foreground">
      Transcript: {{ speech.transcript.value }}
    </div>
    <div 
      v-if="speech.error.value" 
      class="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-2 flex items-center justify-between gap-2"
    >
      <span>{{ speech.error.value }}</span>
      <button
        @click="speech.clearError()"
        class="text-destructive hover:text-destructive/80"
        title="Dismiss"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const speech = useSpeech()
const localIdea = ref(props.modelValue)

watch(() => props.modelValue, (newVal) => {
  localIdea.value = newVal
})

watch(() => speech.transcript.value, (newVal) => {
  if (newVal && !speech.isListening.value) {
    localIdea.value = newVal
    emit('update:modelValue', newVal)
    speech.clearTranscript()
  }
})

const handleInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  localIdea.value = target.value
  emit('update:modelValue', target.value)
}

const toggleSpeech = () => {
  if (speech.isListening.value) {
    speech.stopListening()
    if (speech.transcript.value) {
      localIdea.value = speech.transcript.value
      emit('update:modelValue', speech.transcript.value)
      speech.clearTranscript()
    }
  } else {
    speech.startListening()
  }
}
</script>

