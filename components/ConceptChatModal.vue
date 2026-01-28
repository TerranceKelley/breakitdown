<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-card border border-border rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="p-6 border-b border-border">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <h2 class="text-2xl font-bold mb-2">Refine Concept</h2>
            <div class="space-y-1">
              <h3 class="font-semibold text-lg">{{ concept.title }}</h3>
              <p v-if="concept.description" class="text-sm text-muted-foreground">{{ concept.description }}</p>
            </div>
          </div>
          <button
            @click="closeModal"
            class="p-2 rounded-lg hover:bg-secondary transition-colors"
            title="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Chat Messages Area -->
      <div class="flex-1 overflow-y-auto p-6 space-y-4" ref="messagesContainer">
        <div v-if="messages.length === 0 && !chat.isLoading.value" class="text-center text-muted-foreground py-8">
          Starting conversation...
        </div>
        <div
          v-for="(message, index) in messages"
          :key="`message-${index}-${message.content.substring(0, 20)}`"
          :class="[
            'flex',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          ]"
        >
          <div
            :class="[
              'max-w-[80%] rounded-lg p-4',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            ]"
          >
            <div class="whitespace-pre-wrap">{{ message.content }}</div>
          </div>
        </div>
        
        <!-- Loading Indicator -->
        <div v-if="chat.isLoading.value" class="flex justify-start">
          <div class="bg-muted text-muted-foreground rounded-lg p-4">
            <div class="flex items-center gap-2">
              <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Thinking...</span>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="chat.error.value" class="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {{ chat.error.value }}
        </div>
      </div>

      <!-- Input Area -->
      <div class="p-6 border-t border-border">
        <div class="flex gap-2">
          <div class="flex-1">
            <SpeechInput
              v-model="inputMessage"
              type="textarea"
              placeholder="Type your response or ask a question..."
              input-class="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[60px]"
              @update:modelValue="inputMessage = $event"
            />
          </div>
          <button
            @click="handleSend"
            :disabled="!inputMessage.trim() || chat.isLoading.value"
            class="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="p-6 border-t border-border flex items-center justify-between">
        <button
          @click="handleGenerateAndShowForm"
          :disabled="isGenerating || chat.messages.value.length === 0"
          class="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 disabled:opacity-50"
        >
          {{ isGenerating ? 'Generating...' : 'Apply Changes' }}
        </button>
        <button
          @click="closeModal"
          class="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80"
        >
          Close
        </button>
      </div>
    </div>

    <!-- Apply Changes Form Modal -->
    <div v-if="showApplyForm" class="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div class="bg-card border border-border rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div class="p-6 border-b border-border">
          <h3 class="text-xl font-semibold">Apply Refined Concept</h3>
        </div>
        <div class="flex-1 overflow-y-auto p-6 space-y-4">
          <div v-if="generateError" class="p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
            {{ generateError }}
            <p class="mt-1 text-xs">You can still edit manually below.</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Title</label>
            <SpeechInput
              v-model="refinedTitle"
              type="text"
              placeholder="Refined title"
              input-class="w-full p-3 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Description</label>
            <SpeechInput
              v-model="refinedDescription"
              type="textarea"
              placeholder="Refined description"
              input-class="w-full p-3 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[300px]"
            />
          </div>
        </div>
        <div class="p-6 border-t border-border flex gap-2">
          <button
            @click="handleApplyChanges"
            :disabled="isGenerating"
            class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {{ isGenerating ? 'Generating...' : 'Apply' }}
          </button>
          <button
            @click="showApplyForm = false"
            :disabled="isGenerating"
            class="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Concept } from '~/types'

const props = defineProps<{
  isOpen: boolean
  concept: Concept
  conceptContext: {
    ideaName?: string
    rootIdea?: string
    parentChain?: Array<{ title: string; description: string }>
    depth?: number
  }
}>()

const emit = defineEmits<{
  close: []
  applyChanges: [title: string, description: string]
  tokenUsage: [usage: any]
}>()

const chat = useChat()
const inputMessage = ref('')
const showApplyForm = ref(false)
const refinedTitle = ref(props.concept.title)
const refinedDescription = ref(props.concept.description)
const messagesContainer = ref<HTMLElement | null>(null)
const hasStartedConversation = ref(false)
const isGenerating = ref(false)
const generateError = ref<string | null>(null)

// Create a computed property for messages to ensure reactivity
const messages = computed(() => chat.messages.value)

// Watch for concept changes
watch(() => props.concept, (newConcept) => {
  refinedTitle.value = newConcept.title
  refinedDescription.value = newConcept.description
}, { immediate: true })

// Auto-scroll to bottom when new messages arrive
watch(() => messages.value.length, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
})

// Function to start the conversation
const startConversation = async () => {
  if (hasStartedConversation.value) return
  
  // Reset form
  refinedTitle.value = props.concept.title
  refinedDescription.value = props.concept.description
  showApplyForm.value = false
  inputMessage.value = ''
  
  // Clear any previous chat
  chat.clearChat()
  hasStartedConversation.value = true
  
  // Start conversation with context
  console.log('[ConceptChatModal] Starting conversation with context:', {
    concept: props.concept,
    context: props.conceptContext
  })
  
  try {
    const result = await chat.startConversation({
      concept: {
        title: props.concept.title,
        description: props.concept.description
      },
      context: props.conceptContext
    })
    console.log('[ConceptChatModal] Conversation started, messages:', chat.messages.value)
    
    // Track token usage if available
    if (result?.usage) {
      emit('tokenUsage', result.usage)
    }
  } catch (error) {
    console.error('[ConceptChatModal] Error starting conversation:', error)
    hasStartedConversation.value = false
  }
}

// Check if conversation already has messages (started before modal opened)
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    // Check if conversation was already started (messages exist)
    if (chat.messages.value.length > 0) {
      // Conversation already started, just mark as started
      hasStartedConversation.value = true
      refinedTitle.value = props.concept.title
      refinedDescription.value = props.concept.description
      showApplyForm.value = false
      inputMessage.value = ''
    } else if (!hasStartedConversation.value) {
      // No messages yet, start conversation
      await startConversation()
    }
  } else {
    chat.clearChat()
    hasStartedConversation.value = false
  }
})

// Also check on mount if modal is already open
onMounted(() => {
  if (props.isOpen) {
    if (chat.messages.value.length > 0) {
      hasStartedConversation.value = true
    } else if (!hasStartedConversation.value) {
      startConversation()
    }
  }
})

const handleSend = async () => {
  if (!inputMessage.value.trim() || chat.isLoading.value) {
    return
  }

  const message = inputMessage.value.trim()
  inputMessage.value = ''
  const result = await chat.sendMessage(message)
  
  // Track token usage if available
  if (result?.usage) {
    emit('tokenUsage', result.usage)
  }
}

const handleGenerateAndShowForm = async () => {
  // Generate refined concept using AI based on conversation
  isGenerating.value = true
  generateError.value = null
  
  try {
    const response = await $fetch<{ title: string; description: string; usage?: any }>('/api/refine-concept', {
      method: 'POST',
      body: {
        messages: chat.messages.value.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        conceptContext: {
          concept: {
            title: props.concept.title,
            description: props.concept.description
          },
          context: props.conceptContext
        }
      }
    })
    
    // Update the form with AI-generated refinements
    refinedTitle.value = response.title
    refinedDescription.value = response.description
    
    // Track token usage if available
    if (response.usage) {
      emit('tokenUsage', response.usage)
    }
    
    // Show the form for user to review/edit
    showApplyForm.value = true
  } catch (err: any) {
    generateError.value = err.message || 'Failed to generate refined concept'
    console.error('Error generating refined concept:', err)
    // Still show form with original values so user can edit manually
    showApplyForm.value = true
  } finally {
    isGenerating.value = false
  }
}

const handleApplyChanges = () => {
  // Apply the refined changes
  emit('applyChanges', refinedTitle.value.trim(), refinedDescription.value.trim())
  showApplyForm.value = false
  closeModal()
}

const closeModal = () => {
  emit('close')
}
</script>

