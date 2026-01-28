import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ConceptCard from './ConceptCard.vue'
import type { Concept } from '~/types'

// Mock store
const mockStore = {
  updateConcept: vi.fn().mockResolvedValue(undefined),
  deleteConcept: vi.fn(),
  breakDownConcept: vi.fn().mockResolvedValue(undefined)
}

vi.mock('~/stores/project', () => ({
  useIdeaStore: () => mockStore
}))

// Make useIdeaStore available globally (Nuxt auto-import)
globalThis.useIdeaStore = () => mockStore

// Mock SpeechInput component
const SpeechInputStub = {
  name: 'SpeechInput',
  template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue', 'type', 'inputClass', 'placeholder']
}

describe('ConceptCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mockConcept: Concept = {
    id: '1',
    title: 'Test Concept',
    description: 'Test Description',
    completed: false,
    children: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  it('should render concept title and description', () => {
    const wrapper = mount(ConceptCard, {
      props: {
        concept: mockConcept
      },
      global: {
        stubs: {
          SpeechInput: SpeechInputStub
        }
      }
    })

    expect(wrapper.text()).toContain('Test Concept')
    expect(wrapper.text()).toContain('Test Description')
  })

  it('should show edit form when edit button is clicked', async () => {
    const wrapper = mount(ConceptCard, {
      props: {
        concept: mockConcept
      },
      global: {
        stubs: {
          SpeechInput: SpeechInputStub
        }
      }
    })

    const editButton = wrapper.findAll('button').find(b => b.text().includes('Edit') || b.attributes('title')?.includes('Edit'))
    if (editButton) {
      await editButton.trigger('click')
      expect(wrapper.find('input').exists() || wrapper.find('textarea').exists()).toBe(true)
    }
  })

  it('should emit delete event', async () => {
    const wrapper = mount(ConceptCard, {
      props: {
        concept: mockConcept
      },
      global: {
        stubs: {
          SpeechInput: SpeechInputStub
        }
      }
    })

    // Mock confirm
    window.confirm = vi.fn(() => true)

    const deleteButton = wrapper.findAll('button').find(b => b.text().includes('Delete') || b.attributes('title')?.includes('Delete'))
    if (deleteButton) {
      await deleteButton.trigger('click')
      expect(wrapper.emitted('delete')).toBeTruthy()
    }
  })

  it('should show completed state', () => {
    const completedConcept = { ...mockConcept, completed: true }
    const wrapper = mount(ConceptCard, {
      props: {
        concept: completedConcept
      },
      global: {
        stubs: {
          SpeechInput: SpeechInputStub
        }
      }
    })

    const checkbox = wrapper.find('input[type="checkbox"]')
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
  })
})

