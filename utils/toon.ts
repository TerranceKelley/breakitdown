/**
 * TOON (Token-Oriented Object Notation) utilities
 * A compact format for LLM prompts that reduces token usage
 */

/**
 * Escape a value for TOON format (CSV-style)
 * Handles commas, quotes, and newlines in values
 */
function escapeToonValue(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }
  
  const str = String(value)
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  
  return str
}

/**
 * Convert an array of objects to TOON format
 * @param key - The key name for the array
 * @param array - Array of objects with the same structure
 * @param indent - Indentation level (number of spaces)
 */
export function arrayToToon(key: string, array: any[], indent = 0): string {
  if (array.length === 0) {
    return `${' '.repeat(indent)}${key}[0]{}:\n`
  }
  
  // Get field names from first object
  const firstItem = array[0]
  const fields = Object.keys(firstItem)
  const fieldsStr = fields.join(',')
  
  // Build TOON format
  const indentStr = ' '.repeat(indent)
  const dataIndentStr = ' '.repeat(indent + 2)
  
  let result = `${indentStr}${key}[${array.length}]{${fieldsStr}}:\n`
  
  // Add each row
  for (const item of array) {
    const values = fields.map(field => escapeToonValue(item[field]))
    result += `${dataIndentStr}${values.join(',')}\n`
  }
  
  return result
}

/**
 * Convert an object to TOON format
 * @param key - The key name for the object
 * @param obj - Object to convert
 * @param indent - Indentation level (number of spaces)
 */
export function objectToToon(key: string, obj: any, indent = 0): string {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return ''
  }
  
  const fields = Object.keys(obj)
  if (fields.length === 0) {
    return `${' '.repeat(indent)}${key}{}:\n`
  }
  
  const fieldsStr = fields.join(',')
  const indentStr = ' '.repeat(indent)
  const dataIndentStr = ' '.repeat(indent + 2)
  
  const values = fields.map(field => escapeToonValue(obj[field]))
  
  return `${indentStr}${key}{${fieldsStr}}:\n${dataIndentStr}${values.join(',')}\n`
}

/**
 * Convert a BreakdownRequest to TOON format
 */
export function breakdownRequestToToon(request: {
  concept: { title: string; description: string }
  context?: {
    ideaName?: string
    rootIdea?: string
    parentChain?: Array<{ title: string; description: string }>
    depth?: number
  }
}): string {
  let result = ''
  
  // Convert concept
  result += objectToToon('concept', request.concept)
  
  // Convert context if present
  if (request.context) {
    const contextObj: any = {}
    if (request.context.ideaName) contextObj.ideaName = request.context.ideaName
    if (request.context.rootIdea) contextObj.rootIdea = request.context.rootIdea
    if (request.context.depth !== undefined) contextObj.depth = request.context.depth
    
    if (Object.keys(contextObj).length > 0) {
      result += objectToToon('context', contextObj)
    }
    
    // Convert parent chain if present
    if (request.context.parentChain && request.context.parentChain.length > 0) {
      result += arrayToToon('parentChain', request.context.parentChain)
    }
  }
  
  return result
}

/**
 * Convert an Idea to TOON format for export
 */
export function ideaToToon(idea: {
  name: string
  rootIdea: string
  concepts: Array<{
    id: string
    title: string
    description: string
    completed: boolean
    children: any[]
    parentId?: string
    createdAt: number
    updatedAt: number
  }>
  createdAt: number
  updatedAt: number
}): string {
  let result = ''
  
  // Idea metadata
  result += objectToToon('idea', {
    name: idea.name,
    rootIdea: idea.rootIdea,
    createdAt: new Date(idea.createdAt).toISOString(),
    updatedAt: new Date(idea.updatedAt).toISOString()
  })
  
  // Convert concepts recursively
  result += convertConceptsToToon(idea.concepts)
  
  return result
}

/**
 * Convert concepts array to TOON format (recursive)
 */
function convertConceptsToToon(concepts: Array<{
  id: string
  title: string
  description: string
  completed: boolean
  children: any[]
  parentId?: string
  createdAt: number
  updatedAt: number
}>, indent = 0): string {
  if (concepts.length === 0) {
    return ''
  }
  
  const indentStr = ' '.repeat(indent)
  const dataIndentStr = ' '.repeat(indent + 2)
  
  // Build concepts array
  let result = `${indentStr}concepts[${concepts.length}]{id,title,description,completed,parentId,createdAt,updatedAt}:\n`
  
  // Add each concept
  for (const concept of concepts) {
    const values = [
      escapeToonValue(concept.id),
      escapeToonValue(concept.title),
      escapeToonValue(concept.description),
      escapeToonValue(concept.completed),
      escapeToonValue(concept.parentId || ''),
      escapeToonValue(new Date(concept.createdAt).toISOString()),
      escapeToonValue(new Date(concept.updatedAt).toISOString())
    ]
    result += `${dataIndentStr}${values.join(',')}\n`
    
    // Recursively add children
    if (concept.children && concept.children.length > 0) {
      result += convertConceptsToToon(concept.children, indent + 2)
    }
  }
  
  return result
}

