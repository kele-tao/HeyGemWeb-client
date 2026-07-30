import { create } from 'zustand'
import type { ProjectState } from '@/types'

interface ProjectStore extends ProjectState {
  setProject: (p: Partial<ProjectState>) => void
  resetProject: () => void
  /** 从 localStorage 恢复 */
  loadDraft: () => boolean
  /** 保存到 localStorage */
  saveDraft: () => void
}

const empty: ProjectState = {
  id: '',
  title: '',
  avatarId: null,
  script: '',
  audioUrl: null,
  videoUrl: null,
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
      set(data)
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
      // 不存 audioUrl (blob URL 重启失效)
      const { audioUrl: _ignored, ...rest } = s
      localStorage.setItem(DRAFT_KEY, JSON.stringify(rest))
    } catch {
      /* ignore */
    }
  },
}))

// 自动保存草稿(节流)
let draftTimer: ReturnType<typeof setTimeout> | null = null
useProjectStore.subscribe((state) => {
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    if (state.id) {
      try {
        const { audioUrl: _ignored, ...rest } = state
        localStorage.setItem(DRAFT_KEY, JSON.stringify(rest))
      } catch {
        /* ignore */
      }
    }
  }, 500)
})
