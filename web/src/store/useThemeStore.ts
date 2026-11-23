import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  toggle: () => void
  set: (t: Theme) => void
}

const STORAGE_KEY = 'heygem.theme'

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

/** 深色优先：无历史偏好时默认深色（设计体系 §1.1） */
const initial: Theme = readStored() ?? 'dark'

function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  try {
    localStorage.setItem(STORAGE_KEY, t)
  } catch {
    /* ignore */
  }
}

applyTheme(initial)

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initial,
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    set({ theme: next })
  },
  set: (t) => {
    applyTheme(t)
    set({ theme: t })
  },
}))
