import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BreakItDownButton from './BreakItDownButton.vue'

describe('BreakItDownButton', () => {
  it('should render button with text', () => {
    const wrapper = mount(BreakItDownButton)

    expect(wrapper.text()).toContain('Break It Down')
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('should emit click event', async () => {
    const wrapper = mount(BreakItDownButton)

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('should be disabled when disabled prop is true', () => {
    const wrapper = mount(BreakItDownButton, {
      props: {
        disabled: true
      }
    })

    // Component uses aria-disabled and CSS classes instead of disabled attribute
    expect(wrapper.find('button').attributes('aria-disabled')).toBe('true')
  })

  it('should show loading state', () => {
    const wrapper = mount(BreakItDownButton, {
      props: {
        isLoading: true
      }
    })

    expect(wrapper.text()).toContain('Breaking it down...')
  })

  it('should not emit click when disabled', async () => {
    const wrapper = mount(BreakItDownButton, {
      props: {
        disabled: true
      }
    })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('click')).toBeFalsy()
  })
})

