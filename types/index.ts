export interface Concept {
  id: string
  title: string
  description: string
  completed: boolean
  children: Concept[]
  parentId?: string
  createdAt: number
  updatedAt: number
}

export interface Idea {
  id: string
  name: string
  rootIdea: string
  concepts: Concept[]
  createdAt: number
  updatedAt: number
  tokenUsage?: TokenUsage[] // Track token usage for this idea
}

export interface BreakdownRequest {
  concept: {
    title: string
    description: string
  }
  context?: {
    ideaName?: string
    rootIdea?: string
    parentChain?: Array<{ title: string; description: string }>
    depth?: number
  }
}

export interface BreakdownResponse {
  concepts: Omit<Concept, 'id' | 'children' | 'completed' | 'parentId' | 'createdAt' | 'updatedAt'>[]
  usage?: TokenUsage
}

export interface DocumentExport {
  format: 'markdown' | 'json' | 'yaml' | 'toon'
  content: string
  filename: string
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number // in USD
  timestamp: number
  operation: 'breakdown' | 'chat' | 'refine' | 'transcribe'
  model: string
}

