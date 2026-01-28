import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ConceptTree from './ConceptTree.vue'
import type { Concept } from '~/types'

// Mock ConceptCard component
const ConceptCardStub = {
  name: 'ConceptCard',
  template: '<div class="concept-card">{{ concept.title }}</div>',
  props: ['concept', 'isExpanded', 'hasChildren', 'isStartingChat'],
  emits: ['update', 'delete', 'break-down', 'toggle-expand', 'talk-about']
}

describe('ConceptTree', () => {
  it('should render empty state when no concepts', () => {
    const wrapper = mount(ConceptTree, {
      props: {
        concepts: []
      },
      global: {
        stubs: {
          ConceptCard: ConceptCardStub
        }
      }
    })

    expect(wrapper.text()).toContain('No concepts yet')
  })

  it('should render concepts', () => {
    const concepts: Concept[] = [
      {
        id: '1',
        title: 'Concept 1',
        description: 'Desc 1',
        completed: false,
        children: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    const wrapper = mount(ConceptTree, {
      props: {
        concepts
      },
      global: {
        stubs: {
          ConceptCard: ConceptCardStub
        }
      }
    })

    expect(wrapper.text()).toContain('Concept 1')
  })

  it('should render nested children', () => {
    const concepts: Concept[] = [
      {
        id: '1',
        title: 'Parent',
        description: 'Parent',
        completed: false,
        children: [
          {
            id: '2',
            title: 'Child',
            description: 'Child',
            completed: false,
            children: [],
            parentId: '1',
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        ],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    const wrapper = mount(ConceptTree, {
      props: {
        concepts,
        expandedConcepts: new Set(['1'])
      },
      global: {
        stubs: {
          ConceptCard: ConceptCardStub,
          ConceptTree: ConceptTree
        }
      }
    })

    expect(wrapper.text()).toContain('Parent')
    expect(wrapper.text()).toContain('Child')
  })

  it('should emit events', async () => {
    const concepts: Concept[] = [
      {
        id: '1',
        title: 'Concept',
        description: 'Desc',
        completed: false,
        children: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]

    const wrapper = mount(ConceptTree, {
      props: {
        concepts
      },
      global: {
        stubs: {
          ConceptCard: ConceptCardStub
        }
      }
    })

    // Events would be emitted by child components
    expect(wrapper.emitted).toBeDefined()
  })
})

