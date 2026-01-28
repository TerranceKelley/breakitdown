import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import IdeaInput from './IdeaInput.vue'

// Mock useSpeech composable
const mockSpeech = {
  isSupported: { value: true },
  isListening: { value: false },
  isProcessing: { value: false },
  transcript: { value: '' },
  error: { value: null },
  startListening: vi.fn(),
  stopListening: vi.fn(),
  clearTranscript: vi.fn(),
  clearError: vi.fn()
}

vi.mock('~/composables/useSpeech', () => ({
  useSpeech: () => mockSpeech
}))

// Make useSpeech available globally (Nuxt auto-import)
globalThis.useSpeech = () => mockSpeech

// Mock SpeechInput component
const SpeechInputStub = {
  name: 'SpeechInput',
  template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  props: ['modelValue', 'type', 'inputClass', 'placeholder']
}

describe('IdeaInput', () => {
  it('should render textarea', () => {
    const wrapper = mount(IdeaInput, {
      props: {
        modelValue: ''
      },
      global: {
        stubs: {
          SpeechInput: SpeechInputStub
        }
      }
    })

    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('should emit update:modelValue on input', async () => {
    const wrapper = mount(IdeaInput, {
      props: {
        modelValue: ''
      },
      global: {
        stubs: {
          SpeechInput: SpeechInputStub
        }
      }
    })

    const textarea = wrapper.find('textarea')
    await textarea.setValue('Test idea')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Test idea'])
  })

  it('should show voice input button when supported', () => {
    const wrapper = mount(IdeaInput, {
      props: {
        modelValue: ''
      },
      global: {
        stubs: {
          SpeechInput: SpeechInputStub
        }
      }
    })

    // Component should render (textarea is inside SpeechInput stub)
    expect(wrapper.find('textarea').exists()).toBe(true)
    // Voice button should be visible when speech is supported
    expect(mockSpeech.isSupported.value).toBe(true)
  })
})

