export const useTheme = () => {
  const theme = useState<'light' | 'dark'>('theme', () => 'light')

  const updateThemeClass = (themeValue: 'light' | 'dark') => {
    if (process.client) {
      const html = document.documentElement
      if (themeValue === 'dark') {
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
      }
    }
  }

  const setTheme = (newTheme: 'light' | 'dark') => {
    theme.value = newTheme
    if (process.client) {
      localStorage.setItem('theme', newTheme)
      updateThemeClass(newTheme)
    }
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  // Initialize theme on client
  if (process.client) {
    // Get initial theme from localStorage or system preference
    const stored = localStorage.getItem('theme')
    const initialTheme = stored === 'light' || stored === 'dark' 
      ? stored 
      : window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? 'dark' 
        : 'light'
    
    theme.value = initialTheme
    updateThemeClass(initialTheme)

    // Watch for theme changes
    watch(theme, (newTheme) => {
      updateThemeClass(newTheme)
    })
  }

  return {
    theme: readonly(theme),
    setTheme,
    toggleTheme
  }
}

