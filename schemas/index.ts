import type { Concept, IdeaMode, ConceptChunkType } from '~/types'

export type FieldType = 'string' | 'string[]'

export interface FieldSchema {
  id: string
  label: string
  type: FieldType
  description?: string
  requiredForLeafReady?: boolean
}

export interface ModeSchema {
  id: IdeaMode
  label: string
  description: string
  defaultChunkTypes: ConceptChunkType[]
  leafFields: FieldSchema[]
}

const sharedLeafFields: FieldSchema[] = [
  {
    id: 'outcome',
    label: 'Outcome',
    type: 'string',
    description: 'What changes when this is successful?',
    requiredForLeafReady: true
  },
  {
    id: 'scope',
    label: 'Scope',
    type: 'string',
    description: 'What is in and out for this chunk?',
    requiredForLeafReady: true
  },
  {
    id: 'constraints',
    label: 'Constraints',
    type: 'string[]',
    description: 'Time/budget/tools/rules that must be respected.'
  },
  {
    id: 'definitionOfDone',
    label: 'Definition of done',
    type: 'string[]',
    description: 'Concrete acceptance criteria / checks.',
    requiredForLeafReady: true
  },
  {
    id: 'nextAction',
    label: 'Next action',
    type: 'string',
    description: 'The first small step to move this forward.',
    requiredForLeafReady: true
  }
]

export const MODE_SCHEMAS: Record<IdeaMode, ModeSchema> = {
  generic: {
    id: 'generic',
    label: 'Generic',
    description: 'A flexible breakdown that can become an outline or a plan.',
    defaultChunkTypes: ['outcome', 'step', 'deliverable', 'decision', 'risk'],
    leafFields: sharedLeafFields
  },
  project_plan: {
    id: 'project_plan',
    label: 'Project plan',
    description: 'Optimized for phased delivery, dependencies, and execution.',
    defaultChunkTypes: ['outcome', 'step', 'deliverable', 'risk', 'decision'],
    leafFields: [
      ...sharedLeafFields,
      { id: 'dependencies', label: 'Dependencies', type: 'string[]' },
      { id: 'risks', label: 'Risks', type: 'string[]' }
    ]
  },
  outline: {
    id: 'outline',
    label: 'Outline',
    description: 'Optimized for clear structure and coverage.',
    defaultChunkTypes: ['definition', 'example', 'step', 'resource'],
    leafFields: [
      { id: 'thesis', label: 'Thesis / point', type: 'string', requiredForLeafReady: true },
      { id: 'keyPoints', label: 'Key points', type: 'string[]', requiredForLeafReady: true },
      { id: 'examples', label: 'Examples', type: 'string[]' },
      { id: 'nextAction', label: 'Next action', type: 'string', requiredForLeafReady: true }
    ]
  },
  prompt_pack: {
    id: 'prompt_pack',
    label: 'Prompt pack',
    description: 'Optimized for reusable prompts and evaluation.',
    defaultChunkTypes: ['definition', 'example', 'deliverable'],
    leafFields: [
      { id: 'systemPrompt', label: 'System prompt', type: 'string', requiredForLeafReady: true },
      { id: 'rubric', label: 'Rubric', type: 'string[]', requiredForLeafReady: true },
      { id: 'fewShots', label: 'Few-shot examples', type: 'string[]' },
      { id: 'testCases', label: 'Test cases', type: 'string[]', requiredForLeafReady: true }
    ]
  },
  training: {
    id: 'training',
    label: 'Training',
    description: 'Optimized for lessons, practice, and assessment.',
    defaultChunkTypes: ['definition', 'example', 'step', 'deliverable'],
    leafFields: [
      { id: 'learningObjective', label: 'Learning objective', type: 'string', requiredForLeafReady: true },
      { id: 'exercise', label: 'Exercise', type: 'string', requiredForLeafReady: true },
      { id: 'assessment', label: 'Assessment', type: 'string', requiredForLeafReady: true },
      { id: 'nextAction', label: 'Next action', type: 'string', requiredForLeafReady: true }
    ]
  },
  book: {
    id: 'book',
    label: 'Book',
    description: 'Optimized for chapters, sections, and narrative clarity.',
    defaultChunkTypes: ['definition', 'example', 'step'],
    leafFields: [
      { id: 'purpose', label: 'Purpose', type: 'string', requiredForLeafReady: true },
      { id: 'audience', label: 'Audience', type: 'string' },
      { id: 'beats', label: 'Beats / sections', type: 'string[]', requiredForLeafReady: true },
      { id: 'nextAction', label: 'Next action', type: 'string', requiredForLeafReady: true }
    ]
  },
  app: {
    id: 'app',
    label: 'App / Product',
    description: 'Optimized for building something users will use.',
    defaultChunkTypes: ['outcome', 'deliverable', 'decision', 'risk', 'step'],
    leafFields: [
      { id: 'user', label: 'User / persona', type: 'string', requiredForLeafReady: true },
      { id: 'problem', label: 'Problem', type: 'string', requiredForLeafReady: true },
      { id: 'successMetric', label: 'Success metric', type: 'string', requiredForLeafReady: true },
      { id: 'constraints', label: 'Constraints', type: 'string[]' },
      { id: 'nextAction', label: 'Next action', type: 'string', requiredForLeafReady: true }
    ]
  }
}

export function getModeSchema(mode: IdeaMode | undefined): ModeSchema {
  if (!mode) return MODE_SCHEMAS.generic
  return MODE_SCHEMAS[mode] ?? MODE_SCHEMAS.generic
}

export function getRequiredLeafFieldIds(mode: IdeaMode | undefined): string[] {
  const schema = getModeSchema(mode)
  return schema.leafFields.filter((f) => !!f.requiredForLeafReady).map((f) => f.id)
}

export function getMissingLeafFields(concept: Pick<Concept, 'refinement'>, mode: IdeaMode | undefined): string[] {
  const required = getRequiredLeafFieldIds(mode)
  const fields = concept.refinement?.fields ?? {}
  return required.filter((fieldId) => !String(fields[fieldId] ?? '').trim())
}

