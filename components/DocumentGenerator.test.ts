import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DocumentGenerator from './DocumentGenerator.vue'
import type { Idea } from '~/types'

describe('DocumentGenerator', () => {
  const mockIdea: Idea = {
    id: '1',
    name: 'Test Idea',
    rootIdea: 'Test Idea',
    concepts: [
      {
        id: '1',
        title: 'Concept 1',
        description: 'Description 1',
        completed: false,
        children: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  it('should render generator buttons', () => {
    const wrapper = mount(DocumentGenerator, {
      props: {
        idea: mockIdea
      }
    })

    expect(wrapper.text()).toContain('Markdown')
    expect(wrapper.text()).toContain('JSON')
    expect(wrapper.text()).toContain('YAML')
  })

  it('should generate markdown', async () => {
    const wrapper = mount(DocumentGenerator, {
      props: {
        idea: mockIdea
      }
    })

    const markdownButton = wrapper.findAll('button').find(b => b.text().includes('Markdown'))
    if (markdownButton) {
      await markdownButton.trigger('click')
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 400))
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Test Idea')
    }
  })

  it('should generate JSON', async () => {
    const wrapper = mount(DocumentGenerator, {
      props: {
        idea: mockIdea
      }
    })

    const jsonButton = wrapper.findAll('button').find(b => b.text().includes('JSON'))
    if (jsonButton) {
      await jsonButton.trigger('click')
      
      await new Promise(resolve => setTimeout(resolve, 400))
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Test Idea')
    }
  })

  it('should handle null idea', () => {
    const wrapper = mount(DocumentGenerator, {
      props: {
        idea: null
      }
    })

    expect(wrapper.find('button').exists()).toBe(true)
  })
})

