import { describe, it, expect } from 'vitest'
import { MODE_SCHEMAS, getModeSchema, getRequiredLeafFieldIds } from './index'

describe('schemas', () => {
  it('has a generic mode', () => {
    expect(MODE_SCHEMAS.generic.id).toBe('generic')
    expect(MODE_SCHEMAS.generic.leafFields.length).toBeGreaterThan(0)
  })

  it('falls back to generic mode', () => {
    expect(getModeSchema(undefined).id).toBe('generic')
  })

  it('returns required leaf fields', () => {
    const required = getRequiredLeafFieldIds('project_plan')
    expect(required).toContain('outcome')
    expect(required).toContain('definitionOfDone')
  })
})

