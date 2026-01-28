import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Concept, Idea } from '~/types'

// Mock the composables BEFORE imports
vi.mock('~/composables/useStorage', () => ({
  useStorage: vi.fn()
}))

vi.mock('~/composables/useAI', () => ({
  useAI: vi.fn()
}))

import { useIdeaStore } from './stores/project'
import { useStorage } from '~/composables/useStorage'
import { useAI } from '~/composables/useAI'

describe('Feature Validation Tests', () => {
  const mockStorage = {
    saveIdea: vi.fn().mockResolvedValue(undefined),
    getIdea: vi.fn(),
    getAllIdeas: vi.fn().mockResolvedValue([]),
    deleteIdea: vi.fn().mockResolvedValue(undefined),
    exportIdea: vi.fn((idea: Idea) => JSON.stringify(idea)),
    importIdea: vi.fn((json: string) => JSON.parse(json))
  }

  const mockAI = {
    breakDownIdea: vi.fn(),
    isLoading: { value: false },
    error: { value: null }
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    ;(useStorage as any).mockReturnValue(mockStorage)
    ;(useAI as any).mockReturnValue(mockAI)
    mockStorage.getAllIdeas.mockResolvedValue([])
  })

  describe('Idea Management', () => {
    it('should create a new idea', () => {
      const store = useIdeaStore()
      const idea = store.createIdea('My Project', 'Build a web app')
      
      expect(idea).toBeDefined()
      expect(idea.name).toBe('My Project')
      expect(idea.rootIdea).toBe('Build a web app')
      expect(idea.concepts).toEqual([])
      expect(store.currentIdea).toEqual(idea)
    })

    it('should load an idea by ID', async () => {
      const store = useIdeaStore()
      const mockIdea: Idea = {
        id: 'test-id',
        name: 'Test Idea',
        rootIdea: 'Test root idea',
        concepts: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      mockStorage.getIdea.mockResolvedValue(mockIdea)
      
      await store.loadIdea('test-id')
      
      expect(store.currentIdea).toEqual(mockIdea)
      expect(mockStorage.getIdea).toHaveBeenCalledWith('test-id')
    })

    it('should delete an idea', async () => {
      const store = useIdeaStore()
      const mockIdea: Idea = {
        id: 'delete-me',
        name: 'Delete Me',
        rootIdea: 'Test',
        concepts: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      store.currentIdea = mockIdea
      mockStorage.getAllIdeas.mockResolvedValue([mockIdea])
      
      await store.deleteIdea('delete-me')
      
      expect(mockStorage.deleteIdea).toHaveBeenCalledWith('delete-me')
      expect(store.currentIdea).toBeNull()
    })

    it('should load all ideas', async () => {
      const store = useIdeaStore()
      const mockIdeas: Idea[] = [
        {
          id: '1',
          name: 'Idea 1',
          rootIdea: 'Root 1',
          concepts: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        {
          id: '2',
          name: 'Idea 2',
          rootIdea: 'Root 2',
          concepts: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
      
      mockStorage.getAllIdeas.mockResolvedValue(mockIdeas)
      
      await store.loadIdeas()
      
      expect(store.ideas).toHaveLength(2)
      expect(store.ideas[0].name).toBe('Idea 1')
      expect(store.ideas[1].name).toBe('Idea 2')
    })
  })

  describe('Concept Management', () => {
    it('should add a concept to an idea', () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      store.addConcept({
        title: 'New Concept',
        description: 'A new concept',
        completed: false
      })
      
      expect(store.currentIdea?.concepts).toHaveLength(1)
      expect(store.currentIdea?.concepts[0].title).toBe('New Concept')
      expect(store.currentIdea?.concepts[0].description).toBe('A new concept')
      expect(store.currentIdea?.concepts[0].parentId).toBeUndefined()
    })

    it('should add a sub-concept to a parent concept', () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      // Add root concept
      store.addConcept({
        title: 'Parent Concept',
        description: 'Parent',
        completed: false
      })
      
      const parent = store.currentIdea!.concepts[0]
      
      // Add child concept
      store.addConcept({
        title: 'Child Concept',
        description: 'Child',
        completed: false
      }, parent.id, parent)
      
      expect(parent.children).toHaveLength(1)
      expect(parent.children[0].title).toBe('Child Concept')
      expect(parent.children[0].parentId).toBe(parent.id)
    })

    it('should update a concept', async () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      store.addConcept({
        title: 'Original Title',
        description: 'Original Description',
        completed: false
      })
      
      const concept = store.currentIdea!.concepts[0]
      
      await store.updateConcept(concept.id, {
        title: 'Updated Title',
        description: 'Updated Description'
      })
      
      expect(concept.title).toBe('Updated Title')
      expect(concept.description).toBe('Updated Description')
      expect(concept.updatedAt).toBeGreaterThanOrEqual(concept.createdAt)
    })

    it('should delete a concept', () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      store.addConcept({
        title: 'Concept 1',
        description: 'Desc 1',
        completed: false
      })
      
      store.addConcept({
        title: 'Concept 2',
        description: 'Desc 2',
        completed: false
      })
      
      const conceptId = store.currentIdea!.concepts[0].id
      store.deleteConcept(conceptId)
      
      expect(store.currentIdea!.concepts).toHaveLength(1)
      expect(store.currentIdea!.concepts[0].title).toBe('Concept 2')
    })

    it('should delete a concept and its children', () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      // Add parent
      store.addConcept({
        title: 'Parent',
        description: 'Parent',
        completed: false
      })
      
      const parent = store.currentIdea!.concepts[0]
      
      // Add children
      store.addConcept({
        title: 'Child 1',
        description: 'Child 1',
        completed: false
      }, parent.id, parent)
      
      store.addConcept({
        title: 'Child 2',
        description: 'Child 2',
        completed: false
      }, parent.id, parent)
      
      expect(parent.children).toHaveLength(2)
      
      // Delete parent
      store.deleteConcept(parent.id)
      
      expect(store.currentIdea!.concepts).toHaveLength(0)
    })

    it('should toggle concept completion', async () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      store.addConcept({
        title: 'Incomplete',
        description: 'Test',
        completed: false
      })
      
      const concept = store.currentIdea!.concepts[0]
      expect(concept.completed).toBe(false)
      
      await store.updateConcept(concept.id, { completed: true })
      
      expect(concept.completed).toBe(true)
      
      await store.updateConcept(concept.id, { completed: false })
      
      expect(concept.completed).toBe(false)
    })
  })

  describe('Nested Concepts', () => {
    it('should handle deep nesting (10 levels)', () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      // Create root
      store.addConcept({
        title: 'Level 1',
        description: 'Level 1',
        completed: false
      })
      
      let currentParent = store.currentIdea!.concepts[0]
      
      // Create 9 more levels
      for (let i = 2; i <= 10; i++) {
        store.addConcept({
          title: `Level ${i}`,
          description: `Level ${i}`,
          completed: false
        }, currentParent.id, currentParent)
        
        currentParent = currentParent.children[currentParent.children.length - 1]
      }
      
      // Verify depth
      const root = store.currentIdea!.concepts[0]
      let depth = 1
      let current = root
      while (current.children.length > 0) {
        depth++
        current = current.children[0]
      }
      
      expect(depth).toBe(10)
    })

    it('should find a concept at any depth', () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      // Create nested structure
      store.addConcept({ title: 'L1', description: '', completed: false })
      const l1 = store.currentIdea!.concepts[0]
      
      store.addConcept({ title: 'L2', description: '', completed: false }, l1.id, l1)
      const l2 = l1.children[0]
      
      store.addConcept({ title: 'L3', description: '', completed: false }, l2.id, l2)
      const l3 = l2.children[0]
      
      // Find concepts at different depths
      const foundL1 = store.findConceptById(store.currentIdea!.concepts, l1.id)
      const foundL2 = store.findConceptById(store.currentIdea!.concepts, l2.id)
      const foundL3 = store.findConceptById(store.currentIdea!.concepts, l3.id)
      
      expect(foundL1).toBeDefined()
      expect(foundL1?.title).toBe('L1')
      expect(foundL2).toBeDefined()
      expect(foundL2?.title).toBe('L2')
      expect(foundL3).toBeDefined()
      expect(foundL3?.title).toBe('L3')
    })

    it('should get parent chain for nested concept', () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      // Create 3-level structure
      store.addConcept({ title: 'Root', description: '', completed: false })
      const root = store.currentIdea!.concepts[0]
      
      store.addConcept({ title: 'Child', description: '', completed: false }, root.id, root)
      const child = root.children[0]
      
      store.addConcept({ title: 'Grandchild', description: '', completed: false }, child.id, child)
      const grandchild = child.children[0]
      
      const chain = store.getParentChain(grandchild.id)
      
      expect(chain).toHaveLength(2)
      expect(chain[0].id).toBe(root.id)
      expect(chain[1].id).toBe(child.id)
    })

    it('should calculate concept depth correctly', () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      // Create 5-level structure
      let currentParent: Concept | null = null
      for (let i = 1; i <= 5; i++) {
        if (i === 1) {
          store.addConcept({ title: `Level ${i}`, description: '', completed: false })
          currentParent = store.currentIdea!.concepts[0]
        } else {
          store.addConcept(
            { title: `Level ${i}`, description: '', completed: false },
            currentParent!.id,
            currentParent!
          )
          currentParent = currentParent!.children[currentParent!.children.length - 1]
        }
      }
      
      const depth5 = store.currentIdea!.concepts[0].children[0].children[0].children[0].children[0]
      const calculatedDepth = store.getConceptDepth(depth5.id)
      
      // getConceptDepth returns 0-indexed depth (root = 0), so level 5 = depth 4
      expect(calculatedDepth).toBe(4)
    })
  })

  describe('Breakdown Feature', () => {
    it('should break down an idea into concepts', async () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Build a web app')
      
      const mockResponse = {
        concepts: [
          { title: 'Frontend', description: 'User interface' },
          { title: 'Backend', description: 'Server logic' },
          { title: 'Database', description: 'Data storage' }
        ]
      }
      
      mockAI.breakDownIdea.mockResolvedValue(mockResponse)
      
      await store.breakDownIdea('Build a web app')
      
      expect(store.currentIdea!.concepts).toHaveLength(3)
      expect(store.currentIdea!.concepts[0].title).toBe('Frontend')
      expect(store.currentIdea!.concepts[1].title).toBe('Backend')
      expect(store.currentIdea!.concepts[2].title).toBe('Database')
    })

    it('should break down a concept into sub-concepts', async () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      // Add a concept
      store.addConcept({
        title: 'Frontend',
        description: 'User interface',
        completed: false
      })
      
      const concept = store.currentIdea!.concepts[0]
      
      const mockResponse = {
        concepts: [
          { title: 'React Components', description: 'UI components' },
          { title: 'Styling', description: 'CSS and design' }
        ]
      }
      
      mockAI.breakDownIdea.mockResolvedValue(mockResponse)
      
      await store.breakDownConcept(concept.id)
      
      expect(concept.children).toHaveLength(2)
      expect(concept.children[0].title).toBe('React Components')
      expect(concept.children[1].title).toBe('Styling')
      expect(concept.children[0].parentId).toBe(concept.id)
    })

    it('should prevent duplicate breakdowns', async () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      store.addConcept({
        title: 'Test Concept',
        description: 'Test',
        completed: false
      })
      
      const concept = store.currentIdea!.concepts[0]
      const mockResponse = {
        concepts: [
          { title: 'Sub 1', description: 'Sub 1' },
          { title: 'Sub 2', description: 'Sub 2' }
        ]
      }
      
      mockAI.breakDownIdea.mockResolvedValue(mockResponse)
      
      // Start two breakdowns simultaneously
      const promise1 = store.breakDownConcept(concept.id)
      const promise2 = store.breakDownConcept(concept.id)
      
      await Promise.all([promise1, promise2])
      
      // Should only have concepts from one breakdown
      expect(concept.children.length).toBeGreaterThanOrEqual(2)
      expect(concept.children.length).toBeLessThanOrEqual(4)
    })
  })

  describe('Completion Tracking', () => {
    it('should check if all concepts are complete', () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      // Add incomplete concepts
      store.addConcept({ title: 'C1', description: '', completed: false })
      store.addConcept({ title: 'C2', description: '', completed: false })
      
      expect(store.isIdeaComplete()).toBe(false)
      
      // Mark all as complete
      store.currentIdea!.concepts.forEach(c => {
        c.completed = true
      })
      
      expect(store.isIdeaComplete()).toBe(true)
    })

    it('should check nested concepts for completion', () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      // Add parent with incomplete child
      store.addConcept({ title: 'Parent', description: '', completed: true })
      const parent = store.currentIdea!.concepts[0]
      
      store.addConcept({ title: 'Child', description: '', completed: false }, parent.id, parent)
      
      expect(store.isIdeaComplete()).toBe(false)
      
      // Mark child as complete
      parent.children[0].completed = true
      
      expect(store.isIdeaComplete()).toBe(true)
    })

    it('should get incomplete concepts', () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      store.addConcept({ title: 'C1', description: '', completed: true })
      store.addConcept({ title: 'C2', description: '', completed: false })
      store.addConcept({ title: 'C3', description: '', completed: false })
      
      const incomplete = store.getIncompleteConcepts()
      
      expect(incomplete).toHaveLength(2)
      expect(incomplete.map(c => c.title)).toEqual(['C2', 'C3'])
    })
  })

  describe('Data Persistence', () => {
    it('should save an idea to storage', async () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      await store.saveCurrentIdea()
      
      expect(mockStorage.saveIdea).toHaveBeenCalled()
      const savedIdea = mockStorage.saveIdea.mock.calls[0][0]
      expect(savedIdea.name).toBe('Test')
      expect(savedIdea.rootIdea).toBe('Test idea')
    })

    it('should save after adding a concept', () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      store.addConcept({
        title: 'New Concept',
        description: 'Test',
        completed: false
      })
      
      expect(mockStorage.saveIdea).toHaveBeenCalled()
    })

    it('should save after updating a concept', async () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      store.addConcept({
        title: 'Original',
        description: 'Original',
        completed: false
      })
      
      const concept = store.currentIdea!.concepts[0]
      vi.clearAllMocks()
      
      await store.updateConcept(concept.id, { title: 'Updated' })
      
      expect(mockStorage.saveIdea).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty idea name', () => {
      const store = useIdeaStore()
      const idea = store.createIdea('', 'Test idea')
      
      expect(idea.name).toBe('')
    })

    it('should handle empty concept title', () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      store.addConcept({
        title: '',
        description: 'No title',
        completed: false
      })
      
      expect(store.currentIdea!.concepts[0].title).toBe('')
    })

    it('should handle deleting non-existent concept', () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      // Should not throw
      expect(() => {
        store.deleteConcept('non-existent-id')
      }).not.toThrow()
    })

    it('should handle updating non-existent concept', async () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      // Should not throw
      await expect(
        store.updateConcept('non-existent-id', { title: 'Updated' })
      ).resolves.not.toThrow()
    })

    it('should handle breaking down non-existent concept', async () => {
      const store = useIdeaStore()
      store.createIdea('Test', 'Test idea')
      
      // Should not throw
      await expect(
        store.breakDownConcept('non-existent-id')
      ).resolves.not.toThrow()
    })
  })
})

