import { useState, useEffect } from 'react'
import type { ThemeMode } from '@/db/schema'

function applyTheme(theme: ThemeMode): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', dark)
  try {
    localStorage.setItem('nota-theme', theme)
  } catch {
    // Theme still applies for this session.
  }
  const color = dark ? '#151513' : '#f7f6f2'
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = color
  })
}

export function useTheme(initialTheme: ThemeMode = 'system') {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyTheme(theme)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [theme])

  return {
    theme,
    setTheme,
  }
}

export function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem('nota-theme') as ThemeMode
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    // Ignore localStorage errors
  }
  return 'system'
}

export default useTheme
