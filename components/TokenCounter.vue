<template>
  <div v-if="tokenUsage && tokenUsage.length > 0" class="bg-card border border-border rounded-lg p-4">
    <div class="flex items-center justify-between mb-3">
      <div>
        <h3 class="font-semibold text-lg">Token Usage & Cost</h3>
        <p class="text-xs text-muted-foreground mt-1">
          Model: {{ primaryModel || 'Mixed' }}
        </p>
      </div>
      <button
        @click="isExpanded = !isExpanded"
        class="p-1 rounded hover:bg-secondary transition-colors"
        :title="isExpanded ? 'Collapse' : 'Expand'"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          :class="{ 'rotate-180': isExpanded }"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <div class="text-center p-3 bg-muted rounded-lg">
        <div class="text-2xl font-bold text-primary">{{ formatTokens(totalTokens) }}</div>
        <div class="text-xs text-muted-foreground mt-1">Total Tokens</div>
      </div>
      <div class="text-center p-3 bg-muted rounded-lg">
        <div class="text-2xl font-bold text-primary">{{ formatCost(totalCost) }}</div>
        <div class="text-xs text-muted-foreground mt-1">Total Cost</div>
      </div>
      <div class="text-center p-3 bg-muted rounded-lg">
        <div class="text-2xl font-bold text-primary">{{ formatTokens(totalPromptTokens) }}</div>
        <div class="text-xs text-muted-foreground mt-1">Prompt Tokens</div>
      </div>
      <div class="text-center p-3 bg-muted rounded-lg">
        <div class="text-2xl font-bold text-primary">{{ formatTokens(totalCompletionTokens) }}</div>
        <div class="text-xs text-muted-foreground mt-1">Completion Tokens</div>
      </div>
    </div>

    <!-- Breakdown by Operation -->
    <div v-if="isExpanded" class="space-y-3">
      <div class="border-t border-border pt-3">
        <h4 class="font-medium mb-2">Breakdown by Operation</h4>
        <div class="space-y-2">
          <div
            v-for="(summary, operation) in usageByOperation"
            :key="operation"
            class="flex items-center justify-between p-2 bg-muted rounded text-sm"
          >
            <div class="flex items-center gap-2">
              <span class="font-medium capitalize">{{ operation }}</span>
              <span class="text-muted-foreground">({{ summary.count }}x)</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-muted-foreground">{{ formatTokens(summary.tokens) }} tokens</span>
              <span class="font-medium">{{ formatCost(summary.cost) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Usage -->
      <div class="border-t border-border pt-3">
        <h4 class="font-medium mb-2">Recent Usage</h4>
        <div class="space-y-2 max-h-48 overflow-y-auto">
          <div
            v-for="(usage, index) in recentUsage"
            :key="index"
            class="flex items-center justify-between p-2 bg-muted rounded text-xs"
          >
            <div class="flex items-center gap-2">
              <span class="font-medium capitalize">{{ usage.operation }}</span>
              <span class="text-muted-foreground">{{ formatTime(usage.timestamp) }}</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-muted-foreground">{{ formatTokens(usage.totalTokens) }}</span>
              <span class="font-medium">{{ formatCost(usage.cost) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TokenUsage } from '~/types'
import { useTokenTracker } from '~/composables/useTokenTracker'

const props = defineProps<{
  tokenUsage?: TokenUsage[]
}>()

const tracker = useTokenTracker()
const isExpanded = ref(false)

const totalTokens = computed(() => {
  if (!props.tokenUsage || props.tokenUsage.length === 0) return 0
  return tracker.calculateTotalTokens(props.tokenUsage)
})

const totalCost = computed(() => {
  if (!props.tokenUsage || props.tokenUsage.length === 0) return 0
  return tracker.calculateTotalCost(props.tokenUsage)
})

const totalPromptTokens = computed(() => {
  if (!props.tokenUsage || props.tokenUsage.length === 0) return 0
  return props.tokenUsage.reduce((sum, usage) => sum + usage.promptTokens, 0)
})

const totalCompletionTokens = computed(() => {
  if (!props.tokenUsage || props.tokenUsage.length === 0) return 0
  return props.tokenUsage.reduce((sum, usage) => sum + usage.completionTokens, 0)
})

const usageByOperation = computed(() => {
  if (!props.tokenUsage || props.tokenUsage.length === 0) return {}
  return tracker.getUsageByOperation(props.tokenUsage)
})

const recentUsage = computed(() => {
  if (!props.tokenUsage || props.tokenUsage.length === 0) return []
  return [...props.tokenUsage].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10)
})

const primaryModel = computed(() => {
  if (!props.tokenUsage || props.tokenUsage.length === 0) return null
  const models = props.tokenUsage.map(u => u.model)
  const modelCounts = models.reduce((acc, model) => {
    acc[model] = (acc[model] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  return Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
})

const formatCost = (cost: number) => tracker.formatCost(cost)
const formatTokens = (tokens: number) => tracker.formatTokens(tokens)

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}
</script>

