import { describe, it, expect } from 'vitest'
import type { Concept, Idea, BreakdownResponse, DocumentExport } from './index'

describe('Types', () => {
  describe('Concept', () => {
    it('should have all required fields', () => {
      const concept: Concept = {
        id: '1',
        title: 'Test Concept',
        description: 'Test Description',
        completed: false,
        children: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      expect(concept.id).toBeDefined()
      expect(concept.title).toBeDefined()
      expect(concept.description).toBeDefined()
      expect(concept.completed).toBeDefined()
      expect(concept.children).toBeDefined()
      expect(concept.createdAt).toBeDefined()
      expect(concept.updatedAt).toBeDefined()
    })

    it('should support optional parentId', () => {
      const concept: Concept = {
        id: '1',
        title: 'Test',
        description: 'Test',
        completed: false,
        children: [],
        parentId: 'parent-1',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      expect(concept.parentId).toBe('parent-1')
    })
  })

  describe('Idea', () => {
    it('should have all required fields', () => {
      const idea: Idea = {
        id: '1',
        name: 'Test Idea',
        rootIdea: 'Test Idea',
        concepts: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      expect(idea.id).toBeDefined()
      expect(idea.name).toBeDefined()
      expect(idea.rootIdea).toBeDefined()
      expect(idea.concepts).toBeDefined()
      expect(idea.createdAt).toBeDefined()
      expect(idea.updatedAt).toBeDefined()
    })
  })

  describe('BreakdownResponse', () => {
    it('should have concepts array', () => {
      const response: BreakdownResponse = {
        concepts: [
          {
            title: 'Concept 1',
            description: 'Description 1'
          }
        ]
      }

      expect(response.concepts).toBeDefined()
      expect(response.concepts.length).toBe(1)
      expect(response.concepts[0].title).toBe('Concept 1')
    })
  })

  describe('DocumentExport', () => {
    it('should support all export formats', () => {
      const markdown: DocumentExport = {
        format: 'markdown',
        content: '# Test',
        filename: 'test.md'
      }

      const json: DocumentExport = {
        format: 'json',
        content: '{}',
        filename: 'test.json'
      }

      const yaml: DocumentExport = {
        format: 'yaml',
        content: 'test: value',
        filename: 'test.yaml'
      }

      expect(markdown.format).toBe('markdown')
      expect(json.format).toBe('json')
      expect(yaml.format).toBe('yaml')
    })
  })
})

