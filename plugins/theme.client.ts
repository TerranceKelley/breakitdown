export default defineNuxtPlugin(() => {
  // Initialize theme immediately on client
  if (process.client) {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = stored === 'light' || stored === 'dark' 
      ? stored 
      : prefersDark ? 'dark' : 'light'
    
    const html = document.documentElement
    if (initialTheme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }
})

