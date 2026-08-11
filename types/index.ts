export type IdeaMode =
  | 'generic'
  | 'project_plan'
  | 'outline'
  | 'prompt_pack'
  | 'training'
  | 'book'
  | 'app'

export type ConceptChunkType =
  | 'outcome'
  | 'step'
  | 'deliverable'
  | 'decision'
  | 'risk'
  | 'example'
  | 'definition'
  | 'resource'

export interface ConceptRefinement {
  /** Schema-driven fields (keyed by schema field id). */
  fields?: Record<string, string>
  /** A short conversational summary of what we know and what's next. */
  summary?: string
  /** Open questions we still want to answer before breaking down further. */
  openQuestions?: string[]
  /** Freeform notes/assumptions captured during "Talk about it". */
  notes?: string[]
  updatedAt?: number
}

export interface SchemaHint {
  mode?: IdeaMode
  missingLeafFields?: string[]
}

export interface Concept {
  id: string
  title: string
  description: string
  completed: boolean
  children: Concept[]
  parentId?: string
  chunkType?: ConceptChunkType
  refinement?: ConceptRefinement
  createdAt: number
  updatedAt: number
}

export interface Idea {
  id: string
  name: string
  rootIdea: string
  mode?: IdeaMode
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
    schemaHint?: SchemaHint
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
  operation: 'breakdown' | 'chat' | 'refine' | 'transcribe' | 'synthesize'
  model: string
}
