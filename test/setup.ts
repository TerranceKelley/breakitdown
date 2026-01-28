import { vi } from 'vitest'
import * as Vue from 'vue'

// Make Vue functions available globally for tests (Nuxt auto-imports)
globalThis.ref = Vue.ref
globalThis.computed = Vue.computed
globalThis.reactive = Vue.reactive
globalThis.readonly = Vue.readonly
globalThis.watch = Vue.watch
globalThis.onMounted = Vue.onMounted
globalThis.onUnmounted = Vue.onUnmounted

// Mock Nuxt composables
globalThis.useRuntimeConfig = vi.fn(() => ({
  openaiApiKey: 'test-key',
  public: {
    appName: 'Breakitdown'
  }
}))

// Note: Individual test files should set up their own mocks for composables
// Global mocks here would interfere with tests that need real implementations

// Mock #app imports
vi.mock('#app/nuxt-vitest-app-entry', () => ({
  default: () => Promise.resolve()
}))

