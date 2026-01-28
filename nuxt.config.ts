// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o', // Default to GPT-4o (newer, faster, cheaper than gpt-4-turbo). Options: 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'
    useOllama: process.env.USE_OLLAMA === 'true', // Use Ollama instead of OpenAI
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434', // Ollama API URL
    ollamaModel: process.env.OLLAMA_MODEL || 'gpt-oss:20b', // Ollama model name
    public: {
      appName: 'Breakitdown'
    }
  },
  vite: {
    test: {
      globals: true,
      environment: 'jsdom'
    }
  }
})

