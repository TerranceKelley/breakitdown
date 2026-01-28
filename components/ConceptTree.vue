<template>
  <div class="space-y-4">
    <div v-if="concepts.length === 0" class="text-center py-8 text-muted-foreground">
      No concepts yet. Break down your idea to get started!
    </div>
    
    <div v-else class="space-y-3">
      <div v-for="concept in concepts" :key="`${concept.id}-${concept.updatedAt}`" class="space-y-3">
        <!-- Parent Concept Card -->
        <ConceptCard
          :concept="concept"
          :is-expanded="isExpanded(concept.id)"
          :has-children="concept.children.length > 0"
          :is-starting-chat="props.isStartingChat === concept.id"
          @update="handleUpdate"
          @delete="handleDelete"
          @break-down="handleBreakDown"
          @toggle-expand="toggleExpand(concept.id)"
          @talk-about="handleTalkAbout"
        />
        
        <!-- Sub-concepts nested under parent -->
        <div 
          v-if="concept.children.length > 0 && isExpanded(concept.id)"
          class="ml-6 space-y-3"
        >
          <div class="border-l-2 border-border pl-4 space-y-3">
            <!-- Render children using ConceptTree to properly handle depth -->
            <ConceptTree
              :concepts="concept.children"
              :depth="currentDepth + 1"
              :expanded-concepts="expandedConcepts"
              :is-starting-chat="props.isStartingChat"
              @update="handleUpdate"
              @delete="handleDelete"
              @break-down="handleBreakDown"
              @toggle-expand="handleToggleExpand"
              @talk-about="handleTalkAbout"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Concept } from '~/types'

const props = defineProps<{
  concepts: Concept[]
  depth?: number
  expandedConcepts?: Set<string>
  isStartingChat?: string | null
}>()

const emit = defineEmits<{
  update: [concept: Concept]
  delete: [id: string]
  breakDown: [id: string]
  toggleExpand: [id: string]
  talkAbout: [id: string]
}>()

const currentDepth = computed(() => props.depth || 0)

// Manage expanded state - use prop if provided (for root), otherwise create local state
const localExpanded = ref<Set<string>>(new Set())
const expandedConcepts = computed(() => props.expandedConcepts || localExpanded.value)

const isExpanded = (conceptId: string): boolean => {
  return expandedConcepts.value.has(conceptId)
}

const toggleExpand = (conceptId: string) => {
  emit('toggleExpand', conceptId)
}

const handleToggleExpand = (conceptId: string) => {
  emit('toggleExpand', conceptId)
}

const handleUpdate = (concept: Concept) => {
  emit('update', concept)
}

const handleDelete = (id: string) => {
  emit('delete', id)
}

const handleBreakDown = (id: string) => {
  console.log(`[ConceptTree DEBUG] Break down requested for concept ID: ${id} at depth ${currentDepth.value}`)
  emit('breakDown', id)
}

const handleTalkAbout = (id: string) => {
  emit('talkAbout', id)
}
</script>

