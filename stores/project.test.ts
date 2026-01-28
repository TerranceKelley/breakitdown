import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock the composables
const mockStorage = {
  saveIdea: vi.fn().mockResolvedValue(undefined),
  getIdea: vi.fn(),
  getAllIdeas: vi.fn().mockResolvedValue([]),
  deleteIdea: vi.fn().mockResolvedValue(undefined)
}

const mockAI = {
  breakDownIdea: vi.fn().mockResolvedValue({ concepts: [] }),
  isLoading: { value: false },
  error: { value: null }
}

vi.mock('~/composables/useStorage', () => ({
  useStorage: () => mockStorage
}))

vi.mock('~/composables/useAI', () => ({
  useAI: () => mockAI
}))

import { useIdeaStore } from './project'
import type { Concept } from '~/types'

describe('Project Store - Deep Nesting', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should handle 10 levels of nested concepts', () => {
    const store = useIdeaStore()
    
    // Create an idea
    const idea = store.createIdea('Test Idea', 'Test idea')
    expect(idea).toBeDefined()
    expect(store.currentIdea).toBeDefined()

    // Create a root concept
    store.addConcept({
      title: 'Level 1',
      description: 'Root concept',
      completed: false
    })

    const rootConcept = store.currentIdea!.concepts[0]
    expect(rootConcept).toBeDefined()
    expect(rootConcept.children.length).toBe(0)

    // Manually create 10 levels of nested concepts
    let currentParentId = rootConcept.id
    const concepts: Concept[] = []

    for (let level = 2; level <= 10; level++) {
      const newConcept: Concept = {
        id: crypto.randomUUID(),
        title: `Level ${level}`,
        description: `Concept at level ${level}`,
        completed: false,
        children: [],
        parentId: currentParentId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      // Find parent and add child
      const parent = store.currentIdea!.concepts[0]
      let currentParent = parent
      for (let i = 1; i < level - 1; i++) {
        currentParent = currentParent.children[0]
      }
      currentParent.children.push(newConcept)
      concepts.push(newConcept)
      currentParentId = newConcept.id
    }

    // Verify all levels exist
    const allConcepts = store.getAllConcepts()
    expect(allConcepts.length).toBe(10) // 1 root + 9 nested

    // Verify depth
    let depth = 0
    let current = store.currentIdea!.concepts[0]
    while (current.children.length > 0) {
      depth++
      current = current.children[0]
    }
    expect(depth).toBe(9) // 9 levels of nesting (root is level 0)
  })

  it('should find concepts at any depth', () => {
    const store = useIdeaStore()
    store.createIdea('Test', 'Test')
    
    // Create nested structure
    store.addConcept({ title: 'A', description: 'A', completed: false })
    const a = store.currentIdea!.concepts[0]
    
    store.addConcept({ title: 'B', description: 'B', completed: false }, a.id)
    const b = a.children[0]
    
    store.addConcept({ title: 'C', description: 'C', completed: false }, b.id)
    const c = b.children[0]

    // Test finding at different depths
    const foundA = store.currentIdea!.concepts.find(concept => concept.id === a.id)
    expect(foundA).toBeDefined()
    expect(foundA!.title).toBe('A')

    const foundB = a.children.find(concept => concept.id === b.id)
    expect(foundB).toBeDefined()
    expect(foundB!.title).toBe('B')

    const foundC = b.children.find(concept => concept.id === c.id)
    expect(foundC).toBeDefined()
    expect(foundC!.title).toBe('C')
  })

  it('should add concepts to correct parent at any depth', () => {
    const store = useIdeaStore()
    store.createIdea('Test', 'Test')
    
    // Create 5 levels deep
    store.addConcept({ title: 'L1', description: 'L1', completed: false })
    const l1 = store.currentIdea!.concepts[0]
    
    store.addConcept({ title: 'L2', description: 'L2', completed: false }, l1.id)
    const l2 = l1.children[0]
    
    store.addConcept({ title: 'L3', description: 'L3', completed: false }, l2.id)
    const l3 = l2.children[0]
    
    store.addConcept({ title: 'L4', description: 'L4', completed: false }, l3.id)
    const l4 = l3.children[0]
    
    store.addConcept({ title: 'L5', description: 'L5', completed: false }, l4.id)
    const l5 = l4.children[0]

    // Add a concept to L5
    store.addConcept({ title: 'L6', description: 'L6', completed: false }, l5.id)

    // Verify it was added to the correct parent
    expect(l5.children.length).toBe(1)
    expect(l5.children[0].title).toBe('L6')
    expect(l5.children[0].parentId).toBe(l5.id)

    // Verify other levels weren't affected
    expect(l1.children.length).toBe(1)
    expect(l2.children.length).toBe(1)
    expect(l3.children.length).toBe(1)
    expect(l4.children.length).toBe(1)
  })
})
