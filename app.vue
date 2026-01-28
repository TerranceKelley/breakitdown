<template>
  <div class="min-h-screen bg-background">
    <header class="border-b border-border bg-card">
      <div class="container mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">Breakitdown</h1>
          <p class="text-muted-foreground">Break down your ideas into actionable concepts</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="store.currentIdea"
            @click="goHome"
            class="p-2 hover:bg-accent rounded transition-colors"
            title="Go home"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="container mx-auto px-4 py-8">
      <div v-if="!store.currentIdea" class="max-w-2xl mx-auto space-y-6">
        <div class="space-y-4">
          <h2 class="text-2xl font-semibold">Start a New Idea</h2>
          <div>
            <label class="block text-sm font-medium mb-2">Idea Name</label>
            <SpeechInput
              v-model="ideaName"
              type="text"
              placeholder="My Awesome Idea"
              input-class="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Your Idea</label>
            <IdeaInput v-model="idea" placeholder="Type or speak your idea here..." />
          </div>
          <BreakItDownButton
            :disabled="isButtonDisabled"
            :is-loading="ai.isLoading.value"
            @click="handleInitialBreakdown"
          />
          <div v-if="ai.error.value" class="p-4 bg-destructive/10 border border-destructive rounded-lg text-destructive">
            {{ ai.error.value }}
          </div>
      </div>

      <div v-if="store.ideas.length > 0" class="mt-8 pt-8 border-t">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-semibold">Previous Ideas</h3>
          <button
            @click="showUsageSummary = !showUsageSummary"
            class="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
          >
            {{ showUsageSummary ? 'Hide Usage' : 'Show Usage' }}
          </button>
        </div>
        <div v-if="showUsageSummary" class="mb-4 grid gap-3 md:grid-cols-2">
          <div
            v-for="usage in ideaUsageSummary"
            :key="usage.id"
            class="p-3 border border-border rounded-lg bg-muted/40"
          >
            <div class="flex items-center justify-between">
              <div class="font-semibold">{{ usage.name }}</div>
              <div class="text-xs text-muted-foreground">{{ tracker.formatTokens(usage.totalTokens) }} tokens</div>
            </div>
            <div class="text-sm text-primary font-semibold mt-1">{{ tracker.formatCost(usage.totalCost) }}</div>
          </div>
        </div>
        <div class="space-y-2">
          <div
            v-for="idea in store.ideas"
            :key="idea.id"
            class="group flex items-center gap-2 p-4 border border-border rounded-lg hover:border-primary transition-colors"
            >
              <button
                @click="loadIdea(idea.id)"
                class="flex-1 text-left"
              >
                <div class="font-semibold">{{ idea.name }}</div>
                <div class="text-sm text-muted-foreground">{{ idea.rootIdea }}</div>
              </button>
              <button
                @click.stop="handleDeleteIdea(idea.id, idea.name)"
                class="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Delete idea"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="space-y-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 class="text-2xl font-semibold">{{ store.currentIdea?.name }}</h2>
            <p class="text-muted-foreground">{{ store.currentIdea?.rootIdea }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              @click="addNewConcept"
              class="px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
            >
              Add Concept
            </button>
            <button
              @click="showGenerator = !showGenerator"
              :class="[
                'px-4 py-2 rounded transition-colors',
                showGenerator
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              ]"
            >
              {{ showGenerator ? 'Hide' : 'Generate Documents' }}
            </button>
            <button
              @click="startNewIdea"
              class="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
            >
              New Idea
            </button>
          </div>
        </div>

        <!-- Token Counter -->
        <TokenCounter
          v-if="store.currentIdea && store.currentIdea.tokenUsage && store.currentIdea.tokenUsage.length > 0"
          :token-usage="store.currentIdea.tokenUsage"
          class="mb-6"
        />

        <div v-if="showGenerator && store.isIdeaComplete()" class="p-6 border border-border rounded-lg bg-card">
          <DocumentGenerator :idea="store.currentIdea" />
        </div>

        <div v-else-if="showGenerator && !store.isIdeaComplete()" class="p-6 border border-border rounded-lg bg-muted">
          <p class="text-muted-foreground mb-2">
            Complete all concepts before generating documents.
          </p>
          <div v-if="store.getIncompleteConcepts().length > 0" class="text-sm text-muted-foreground">
            <p class="font-semibold mb-1">Incomplete concepts ({{ store.getIncompleteConcepts().length }}):</p>
            <ul class="list-disc list-inside space-y-1">
              <li v-for="concept in store.getIncompleteConcepts().slice(0, 10)" :key="concept.id">
                {{ concept.title }}
              </li>
              <li v-if="store.getIncompleteConcepts().length > 10" class="italic">
                ... and {{ store.getIncompleteConcepts().length - 10 }} more
              </li>
            </ul>
          </div>
        </div>

        <div>
          <div v-if="store.currentIdea && store.currentIdea.concepts.length > 0" class="mb-4 flex gap-2">
            <button
              @click="expandAllConcepts"
              class="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
            >
              Expand All
            </button>
            <button
              @click="collapseAllConcepts"
              class="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
            >
              Collapse All
            </button>
          </div>
          <ConceptTree
            :concepts="store.currentIdea?.concepts || []"
            :expanded-concepts="expandedConcepts"
            :is-starting-chat="isStartingChat"
            @update="handleConceptUpdate"
            @delete="handleConceptDelete"
            @break-down="handleConceptBreakDown"
            @toggle-expand="handleToggleExpand"
            @talk-about="handleTalkAbout"
          />
        </div>

        <!-- Add Concept Modal -->
        <div v-if="showAddConcept" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-card p-6 rounded-lg max-w-md w-full mx-4">
            <h3 class="text-xl font-semibold mb-4">Add New Concept</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">Title</label>
                <SpeechInput
                  v-model="newConceptTitle"
                  type="text"
                  placeholder="Concept title"
                  input-class="w-full p-2 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Description</label>
                <SpeechInput
                  v-model="newConceptDescription"
                  type="textarea"
                  placeholder="Concept description"
                  input-class="w-full p-2 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[100px]"
                />
              </div>
              <div class="flex gap-2">
                <button
                  @click="saveNewConcept"
                  :disabled="!newConceptTitle.trim()"
                  class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  @click="cancelAddConcept"
                  class="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Concept Chat Modal -->
      <ConceptChatModal
        v-if="chatConceptId && store.currentIdea && getChatConcept() && !isStartingChat"
        :is-open="true"
        :concept="getChatConcept()!"
        :concept-context="getConceptContext(chatConceptId!)"
        @close="handleChatClose"
        @apply-changes="handleChatApplyChanges"
        @token-usage="handleTokenUsage"
      />
    </main>
    
    <HealthStatus />
  </div>
</template>

<script setup lang="ts">
const store = useIdeaStore()
const ai = useAI()
const tracker = useTokenTracker()

const ideaName = ref('')
const idea = ref('')
const showGenerator = ref(false)
const showAddConcept = ref(false)
const newConceptTitle = ref('')
const newConceptDescription = ref('')
const chatConceptId = ref<string | null>(null)
const isStartingChat = ref<string | null>(null) // Track which concept is loading
const showUsageSummary = ref(false)

const isButtonDisabled = computed(() => {
  const ideaTrimmed = idea.value.trim()
  const ideaNameTrimmed = ideaName.value.trim()
  const disabled = !ideaTrimmed || !ideaNameTrimmed
  
  // Only log when state changes or when debugging
  if (process.env.NODE_ENV === 'development') {
    // Reduced logging - only log occasionally
  }
  
  return disabled
})

onMounted(async () => {
  await store.loadIdeas()
})

const handleInitialBreakdown = async () => {
  if (!idea.value.trim() || !ideaName.value.trim()) {
    return
  }

  const ideaObj = store.createIdea(ideaName.value, idea.value)
  await store.breakDownIdea(idea.value)
  await store.saveCurrentIdea()

  ideaName.value = ''
  idea.value = ''
}

const loadIdea = async (id: string) => {
  await store.loadIdea(id)
}

const goHome = () => {
  store.currentIdea = null
}

const handleDeleteIdea = async (id: string, ideaName: string) => {
  if (store.currentIdea?.id === id) {
    if (!confirm(`Are you sure you want to delete "${ideaName}"? This will close the current idea.`)) {
      return
    }
  } else {
    if (!confirm(`Are you sure you want to delete "${ideaName}"?`)) {
      return
    }
  }
  
  try {
    console.log('[DEBUG] Deleting idea:', id, ideaName)
    await store.deleteIdea(id)
    console.log('[DEBUG] Idea deleted successfully:', id)
  } catch (error) {
    console.error('[DEBUG] Error deleting idea:', error)
    alert(`Failed to delete idea: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const startNewIdea = () => {
  if (confirm('Are you sure you want to start a new idea? Current idea will be saved.')) {
    store.resetIdea()
    ideaName.value = ''
    idea.value = ''
    showGenerator.value = false
  }
}

const addNewConcept = () => {
  showAddConcept.value = true
  newConceptTitle.value = ''
  newConceptDescription.value = ''
}

const saveNewConcept = () => {
  if (!newConceptTitle.value.trim()) return

  store.addConcept({
    title: newConceptTitle.value.trim(),
    description: newConceptDescription.value.trim(),
    completed: false
  })

  showAddConcept.value = false
  newConceptTitle.value = ''
  newConceptDescription.value = ''
}

const cancelAddConcept = () => {
  showAddConcept.value = false
  newConceptTitle.value = ''
  newConceptDescription.value = ''
}

const handleConceptUpdate = () => {
  store.saveCurrentIdea()
}

const handleConceptDelete = () => {
  store.saveCurrentIdea()
}

const handleConceptBreakDown = async (id: string) => {
  await store.breakDownConcept(id)
  await store.saveCurrentIdea()
}

// Expand/collapse functionality
const expandedConcepts = ref<Set<string>>(new Set())

const handleToggleExpand = (conceptId: string) => {
  if (expandedConcepts.value.has(conceptId)) {
    expandedConcepts.value.delete(conceptId)
  } else {
    expandedConcepts.value.add(conceptId)
  }
}

const expandAllConcepts = () => {
  if (!store.currentIdea) return
  const allConcepts = store.getAllConcepts()
  expandedConcepts.value = new Set(allConcepts.map(c => c.id))
}

const collapseAllConcepts = () => {
  expandedConcepts.value.clear()
}

const ideaUsageSummary = computed(() => {
  return store.ideas.map(idea => {
    const usage = idea.tokenUsage || []
    return {
      id: idea.id,
      name: idea.name,
      totalTokens: tracker.calculateTotalTokens(usage),
      totalCost: tracker.calculateTotalCost(usage)
    }
  })
})

const handleTalkAbout = async (conceptId: string) => {
  console.log('[DEBUG] Talk About It clicked for concept:', conceptId)
  
  // Close any existing modal
  if (chatConceptId.value) {
    chatConceptId.value = null
  }
  
  // Set loading state
  isStartingChat.value = conceptId
  
  try {
    // Get concept and context
    const concept = store.getAllConcepts().find(c => c.id === conceptId)
    if (!concept || !store.currentIdea) {
      isStartingChat.value = null
      return
    }
    
    const context = getConceptContext(conceptId)
    
    // Start conversation in background (don't open modal yet)
    // Use the same chat instance that the modal will use
    const chat = useChat()
    // Clear any previous conversation
    chat.clearChat()
    await chat.startConversation({
      concept: {
        title: concept.title,
        description: concept.description
      },
      context
    })
    
    // Once questions are received, open the modal
    // Small delay to ensure state is updated
    await nextTick()
    chatConceptId.value = conceptId
  } catch (error) {
    console.error('[DEBUG] Error starting chat:', error)
    isStartingChat.value = null
  } finally {
    // Clear loading state after a brief moment to allow modal to open
    setTimeout(() => {
      isStartingChat.value = null
    }, 100)
  }
}

const handleChatClose = () => {
  chatConceptId.value = null
}

const handleTokenUsage = (usage: any) => {
  if (!store.currentIdea) return
  
  if (!store.currentIdea.tokenUsage) {
    store.currentIdea.tokenUsage = []
  }
  store.currentIdea.tokenUsage.push(usage)
  store.saveCurrentIdea()
}

const handleChatApplyChanges = async (title: string, description: string) => {
  if (!chatConceptId.value) {
    console.error('[DEBUG] No concept ID for applying changes')
    return
  }
  
  console.log('[DEBUG] Applying changes to concept:', chatConceptId.value, { title, description })
  
  // Verify concept exists
  const concept = store.getAllConcepts().find(c => c.id === chatConceptId.value)
  if (!concept) {
    console.error('[DEBUG] Concept not found:', chatConceptId.value)
    return
  }
  
  // Update the concept (this will save automatically)
  try {
    await store.updateConcept(chatConceptId.value, {
      title: title.trim(),
      description: description.trim()
    })
    console.log('[DEBUG] Changes applied and saved successfully')
  } catch (error) {
    console.error('[DEBUG] Error updating concept:', error)
    alert('Failed to save changes. Please try again.')
    return
  }
  
  chatConceptId.value = null
}

// Helper to get the concept for chat
const getChatConcept = () => {
  if (!chatConceptId.value || !store.currentIdea) return null
  return store.getAllConcepts().find(c => c.id === chatConceptId.value) || null
}

// Helper to get concept context for chat
const getConceptContext = (conceptId: string) => {
  if (!store.currentIdea) return {}
  
  const concept = store.getAllConcepts().find(c => c.id === conceptId)
  if (!concept) return {}

  // Build parent chain using store's helper (with safety check)
  let parentChain: Array<{ title: string; description: string }> = []
  if (typeof store.getParentChain === 'function') {
    const chain = store.getParentChain(conceptId)
    parentChain = chain.map(c => ({ title: c.title, description: c.description }))
  } else {
    // Fallback: build parent chain manually
    let currentId = concept.parentId
    while (currentId) {
      const parent = store.getAllConcepts().find(c => c.id === currentId)
      if (parent) {
        parentChain.unshift({ title: parent.title, description: parent.description })
        currentId = parent.parentId
      } else {
        break
      }
    }
  }

  // Get depth (with safety check)
  const depth = typeof store.getConceptDepth === 'function' 
    ? store.getConceptDepth(conceptId) 
    : undefined

  return {
    ideaName: store.currentIdea.name,
    rootIdea: store.currentIdea.rootIdea,
    parentChain: parentChain.length > 0 ? parentChain : undefined,
    depth
  }
}
</script>
