/**
 * Light / dark theme. "system" (the default) follows the device setting.
 * The choice is a per-device preference, so it lives in localStorage.
 */

export type ThemePreference = 'system' | 'light' | 'dark'

const KEY = 'attendance-theme'
const media = typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)')

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function apply(preference: ThemePreference) {
  const dark = preference === 'dark' || (preference === 'system' && Boolean(media?.matches))
  const root = document.documentElement
  root.dataset.theme = dark ? 'dark' : 'light'
  // The status bar / browser chrome matches the app bar surface.
  const color = getComputedStyle(root).getPropertyValue('--color-surface-container').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color || (dark ? '#111113' : '#f2f3f5'))
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, preference)
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts this session.
  }
  apply(preference)
}

export function initTheme() {
  apply(readThemePreference())
  media?.addEventListener('change', () => apply(readThemePreference()))
}
