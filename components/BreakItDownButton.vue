<template>
  <button
    @click="handleClick"
    :class="[
      'relative px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      (disabled || isLoading)
        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
        : 'bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer',
      isLoading && 'animate-pulse'
    ]"
    type="button"
    :aria-disabled="disabled || isLoading"
  >
    <span class="relative z-10 flex items-center gap-2">
      <svg
        v-if="!isLoading"
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
      <span v-else class="animate-spin">⟳</span>
      {{ isLoading ? 'Breaking it down...' : 'Break It Down' }}
    </span>
    
    <!-- Animated particles effect -->
    <div v-if="showParticles" class="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
      <div
        v-for="i in 12"
        :key="i"
        class="absolute w-2 h-2 bg-white rounded-full opacity-75 animate-ping"
        :style="{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 0.5}s`,
          animationDuration: `${0.5 + Math.random() * 0.5}s`
        }"
      />
    </div>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{
  disabled?: boolean
  isLoading?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const showParticles = ref(false)

const handleClick = () => {
  // If disabled or loading, prevent action
  if (props.disabled || props.isLoading) {
    return
  }
  
  showParticles.value = true
  emit('click')
  
  setTimeout(() => {
    showParticles.value = false
  }, 1000)
}
</script>

<style scoped>
@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}
</style>

