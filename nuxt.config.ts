// https://nuxt.com/docs/api/configuration/nuxt-config
import esbuild from 'rollup-plugin-esbuild'

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  build: {
    transpile: ['authme']
  },
  modules: [
    'authme',
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],
  hooks: {
    'nitro:build:before'(nitro) {
      const plugins = nitro.options.rollupConfig?.plugins ?? []
      nitro.options.rollupConfig = nitro.options.rollupConfig ?? {}
      nitro.options.rollupConfig.plugins = [
        ...(Array.isArray(plugins) ? plugins : [plugins]),
        esbuild({
          include: /node_modules\/authme\/.*\.ts$/,
          exclude: []
        })
      ]
    }
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    // These are read from environment variables at runtime
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o', // Default to GPT-4o (newer, faster, cheaper than gpt-4-turbo). Options: 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'
    useOllama: process.env.USE_OLLAMA || 'false', // Use Ollama instead of OpenAI (read as string, convert in handlers)
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434', // Ollama API URL
    ollamaModel: process.env.OLLAMA_MODEL || 'gpt-oss:20b', // Ollama model name
    whisperUrl: process.env.WHISPER_URL || 'http://localhost:9000', // Local Whisper API URL
    useLocalWhisper: process.env.USE_LOCAL_WHISPER || 'false', // Use local Whisper instead of OpenAI
    ttsUrl: process.env.TTS_URL || 'http://localhost:9001', // Local TTS API URL
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

