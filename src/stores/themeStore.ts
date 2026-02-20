import { create } from 'zustand'

type ThemeMode = 'dark' | 'light' | 'system'
type ResolvedTheme = 'dark' | 'light'

interface ThemeState {
  mode: ThemeMode
  resolvedTheme: ResolvedTheme
  setMode: (mode: ThemeMode) => void
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(resolved)
  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#06080F' : '#F8FAFC')
  }
}

// Initialize from localStorage
const stored = (typeof localStorage !== 'undefined'
  ? localStorage.getItem('fc-theme')
  : null) as ThemeMode | null
const initialMode: ThemeMode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark'
const initialResolved = resolveTheme(initialMode)

// Apply immediately (also done in index.html script for flash prevention)
if (typeof document !== 'undefined') {
  applyTheme(initialResolved)
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: initialMode,
  resolvedTheme: initialResolved,
  setMode: (mode: ThemeMode) => {
    const resolved = resolveTheme(mode)
    localStorage.setItem('fc-theme', mode)
    applyTheme(resolved)
    set({ mode, resolvedTheme: resolved })
  },
}))

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const state = useThemeStore.getState()
    if (state.mode === 'system') {
      const resolved = getSystemTheme()
      applyTheme(resolved)
      useThemeStore.setState({ resolvedTheme: resolved })
    }
  })
}
