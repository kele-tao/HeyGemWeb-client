import { create } from 'zustand'
import type { ProjectState } from '@/types'

interface ProjectStore extends ProjectState {
  setProject: (p: Partial<ProjectState>) => void
  resetProject: () => void
  /** 从 localStorage 恢复草稿 */
  loadDraft: () => boolean
  /** 保存到 localStorage */
  saveDraft: () => void
}

const empty: ProjectState = {
  id: '',
  title: '',
  avatarId: null,
  voiceId: null,
  script: '',
}

const DRAFT_KEY = 'heygem.draft'

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...empty,
  setProject: (p) => set((s) => ({ ...s, ...p })),
  resetProject: () => {
    set(empty)
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* ignore */
    }
  },
  loadDraft: () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return false
      const data = JSON.parse(raw) as ProjectState
      if (!data?.id) return false
      set({ ...empty, ...data })
      return true
    } catch {
      return false
    }
  },
  saveDraft: () => {
    try {
      const s = get()
      if (!s.id) {
        localStorage.removeItem(DRAFT_KEY)
        return
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(s))
    } catch {
      /* ignore */
    }
  },
}))

// 草稿自动保存（仅本地，后端不参与；契约 §六 明确保留）
let draftTimer: ReturnType<typeof setTimeout> | null = null
useProjectStore.subscribe((state) => {
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    if (!state.id) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, 500)
})
