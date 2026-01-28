<template>
  <div
    :class="[
      'p-4 border rounded-lg transition-all',
      concept.completed
        ? 'bg-muted border-muted-foreground/20'
        : 'bg-card border-border hover:border-primary/50',
      isEditing && 'ring-2 ring-ring'
    ]"
  >
    <div v-if="!isEditing" class="space-y-3">
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1">
          <h3
            :class="[
              'font-semibold text-lg',
              concept.completed && 'line-through text-muted-foreground'
            ]"
          >
            {{ concept.title }}
          </h3>
          <p
            v-if="concept.description"
            :class="[
              'text-sm text-muted-foreground mt-1',
              concept.completed && 'line-through'
            ]"
          >
            {{ concept.description }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              :checked="concept.completed"
              @change="toggleComplete"
              class="w-4 h-4 rounded border-input"
            />
            <span class="text-sm">Complete</span>
          </label>
        </div>
      </div>
      
      <div class="flex items-center gap-2 pt-2 border-t">
        <button
          v-if="hasChildren"
          @click="handleToggleExpand"
          class="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
          :title="isExpanded ? 'Collapse' : 'Expand'"
        >
          {{ isExpanded ? '▼' : '▶' }}
        </button>
        <button
          @click="startEditing"
          class="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
        >
          Edit
        </button>
        <button
          @click="handleTalkAbout"
          :disabled="isStartingChat"
          class="px-3 py-1 text-sm bg-accent text-accent-foreground rounded hover:bg-accent/80 disabled:opacity-50 flex items-center gap-2"
        >
          <svg
            v-if="isStartingChat"
            class="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isStartingChat ? 'Loading...' : 'Talk About It' }}
        </button>
        <button
          @click="handleBreakDown"
          :disabled="isBreakingDown"
          class="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
        >
          {{ isBreakingDown ? 'Breaking down...' : 'Break Down' }}
        </button>
        <button
          @click="handleDelete"
          class="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 ml-auto"
        >
          Delete
        </button>
      </div>
    </div>

    <div v-else class="space-y-3">
      <SpeechInput
        v-model="editTitle"
        type="text"
        placeholder="Concept title"
        input-class="w-full p-2 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <SpeechInput
        v-model="editDescription"
        type="textarea"
        placeholder="Concept description"
        input-class="w-full p-2 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[80px]"
      />
      <div class="flex gap-2">
        <button
          @click="saveEdit"
          class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Save
        </button>
        <button
          @click="cancelEdit"
          class="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Concept } from '~/types'

const props = defineProps<{
  concept: Concept
  isExpanded?: boolean
  hasChildren?: boolean
  isStartingChat?: boolean
}>()

const emit = defineEmits<{
  update: [concept: Concept]
  delete: [id: string]
  breakDown: [id: string]
  toggleExpand: []
  talkAbout: [id: string]
}>()

const store = useIdeaStore()
const isEditing = ref(false)
const isBreakingDown = ref(false)
const editTitle = ref(props.concept.title)
const editDescription = ref(props.concept.description)

const isExpanded = computed(() => props.isExpanded ?? false)
const hasChildren = computed(() => props.hasChildren ?? props.concept.children.length > 0)

const startEditing = () => {
  editTitle.value = props.concept.title
  editDescription.value = props.concept.description
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  editTitle.value = props.concept.title
  editDescription.value = props.concept.description
}

const saveEdit = async () => {
  await store.updateConcept(props.concept.id, {
    title: editTitle.value.trim(),
    description: editDescription.value.trim()
  })
  isEditing.value = false
  emit('update', { ...props.concept, title: editTitle.value, description: editDescription.value })
}

const toggleComplete = async () => {
  await store.updateConcept(props.concept.id, {
    completed: !props.concept.completed
  })
}

const handleDelete = () => {
  if (confirm('Are you sure you want to delete this concept?')) {
    store.deleteConcept(props.concept.id)
    emit('delete', props.concept.id)
  }
}

const handleBreakDown = async () => {
  isBreakingDown.value = true
  console.log(`[ConceptCard DEBUG] Breaking down concept: "${props.concept.title}" (ID: ${props.concept.id})`)
  console.log(`[ConceptCard DEBUG] Concept parentId: ${props.concept.parentId || 'none (root)'}`)
  console.log(`[ConceptCard DEBUG] Concept has ${props.concept.children.length} existing children`)
  // Only emit the event - let the parent handle the actual breakdown
  emit('breakDown', props.concept.id)
  // Note: The actual breakdown is handled by the parent component (app.vue)
  // We set isBreakingDown to false after a short delay to allow the parent to process
  setTimeout(() => {
    isBreakingDown.value = false
  }, 100)
}

const handleToggleExpand = () => {
  emit('toggleExpand')
}

const handleTalkAbout = () => {
  emit('talkAbout', props.concept.id)
}
</script>

