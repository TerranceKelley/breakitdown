<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold">Generate Documents</h2>
      <button
        v-if="generatedContent"
        @click="clearGenerated"
        class="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
      >
        Clear
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <button
        @click="generateMarkdown"
        :disabled="isGenerating"
        class="p-4 border border-border rounded-lg hover:border-primary transition-colors text-left disabled:opacity-50"
      >
        <div class="font-semibold mb-1">Markdown</div>
        <div class="text-sm text-muted-foreground">Generate a markdown document</div>
      </button>

      <button
        @click="generateJSON"
        :disabled="isGenerating"
        class="p-4 border border-border rounded-lg hover:border-primary transition-colors text-left disabled:opacity-50"
      >
        <div class="font-semibold mb-1">JSON</div>
        <div class="text-sm text-muted-foreground">Generate structured JSON</div>
      </button>

      <button
        @click="generateYAML"
        :disabled="isGenerating"
        class="p-4 border border-border rounded-lg hover:border-primary transition-colors text-left disabled:opacity-50"
      >
        <div class="font-semibold mb-1">YAML</div>
        <div class="text-sm text-muted-foreground">Generate YAML format</div>
      </button>

      <button
        @click="generateTOON"
        :disabled="isGenerating"
        class="p-4 border border-border rounded-lg hover:border-primary transition-colors text-left disabled:opacity-50"
      >
        <div class="font-semibold mb-1">TOON</div>
        <div class="text-sm text-muted-foreground">Generate TOON format (token-efficient)</div>
      </button>
    </div>

    <div v-if="isGenerating" class="text-center py-4 text-muted-foreground">
      Generating document...
    </div>

    <div v-if="generatedContent" class="mt-6">
      <div class="flex items-center justify-between mb-2">
        <label class="text-sm font-medium">Generated {{ currentFormat.toUpperCase() }}</label>
        <button
          @click="downloadFile"
          class="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm"
        >
          Download
        </button>
      </div>
      <pre class="p-4 bg-muted rounded-lg overflow-auto max-h-[500px] text-sm"><code>{{ generatedContent }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { stringify } from 'yaml'
import type { Idea, Concept } from '~/types'
import { ideaToToon } from '~/utils/toon'

const props = defineProps<{
  idea: Idea | null
}>()

const isGenerating = ref(false)
const generatedContent = ref('')
const currentFormat = ref<'markdown' | 'json' | 'yaml' | 'toon'>('markdown')

const flattenConcepts = (concepts: Concept[], level = 0): string => {
  let result = ''
  concepts.forEach(concept => {
    const indent = '  '.repeat(level)
    result += `${indent}- ${concept.title}${concept.completed ? ' ✓' : ''}\n`
    if (concept.description) {
      result += `${indent}  ${concept.description}\n`
    }
    if (concept.children.length > 0) {
      result += flattenConcepts(concept.children, level + 1)
    }
  })
  return result
}

const generateMarkdown = () => {
  if (!props.idea) {
    console.error('Cannot generate markdown: idea is null')
    return
  }

  isGenerating.value = true
  currentFormat.value = 'markdown'

  setTimeout(() => {
    try {
      let content = `# ${props.idea!.name}\n\n`
      content += `**Root Idea:** ${props.idea!.rootIdea}\n\n`
      content += `## Concepts\n\n`
      content += flattenConcepts(props.idea!.concepts)
      content += `\n---\n\n`
      content += `*Generated on ${new Date().toLocaleString()}*\n`

      generatedContent.value = content
    } catch (error) {
      console.error('Error generating markdown:', error)
      generatedContent.value = 'Error generating markdown. Please check the console for details.'
    }
    isGenerating.value = false
  }, 300)
}

const generateJSON = () => {
  if (!props.idea) {
    console.error('Cannot generate JSON: idea is null')
    return
  }

  isGenerating.value = true
  currentFormat.value = 'json'

  setTimeout(() => {
    try {
      const exportData = {
        name: props.idea!.name,
        rootIdea: props.idea!.rootIdea,
        concepts: props.idea!.concepts,
        createdAt: new Date(props.idea!.createdAt).toISOString(),
        updatedAt: new Date(props.idea!.updatedAt).toISOString()
      }

      generatedContent.value = JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error('Error generating JSON:', error)
      generatedContent.value = 'Error generating JSON. Please check the console for details.'
    }
    isGenerating.value = false
  }, 300)
}

const generateYAML = () => {
  if (!props.idea) {
    console.error('Cannot generate YAML: idea is null')
    return
  }

  isGenerating.value = true
  currentFormat.value = 'yaml'

  setTimeout(() => {
    try {
      const exportData = {
        name: props.idea!.name,
        rootIdea: props.idea!.rootIdea,
        concepts: props.idea!.concepts,
        createdAt: new Date(props.idea!.createdAt).toISOString(),
        updatedAt: new Date(props.idea!.updatedAt).toISOString()
      }

      generatedContent.value = stringify(exportData)
    } catch (error) {
      console.error('Error generating YAML:', error)
      generatedContent.value = 'Error generating YAML. Please check the console for details.'
    }
    isGenerating.value = false
  }, 300)
}

const generateTOON = () => {
  if (!props.idea) {
    console.error('Cannot generate TOON: idea is null')
    return
  }

  isGenerating.value = true
  currentFormat.value = 'toon'

  setTimeout(() => {
    try {
      generatedContent.value = ideaToToon(props.idea!)
    } catch (error) {
      console.error('Error generating TOON:', error)
      generatedContent.value = `Error generating TOON format: ${error instanceof Error ? error.message : String(error)}. Please check the console for details.`
    }
    isGenerating.value = false
  }, 300)
}

const downloadFile = () => {
  if (!generatedContent.value || !props.idea) return

  const extensions = {
    markdown: 'md',
    json: 'json',
    yaml: 'yaml',
    toon: 'toon'
  }

  const extension = extensions[currentFormat.value]
  const filename = `${props.idea.name.replace(/\s+/g, '-')}.${extension}`
  const blob = new Blob([generatedContent.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const clearGenerated = () => {
  generatedContent.value = ''
  currentFormat.value = 'markdown'
}
</script>

