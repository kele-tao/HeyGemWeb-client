import { create } from 'zustand'
import { api } from '@/api'
import type { AppData, Avatar, GeneratedVideo, Voice } from '@/types'

interface AppState {
  voices: Voice[]
  avatars: Avatar[]
  videos: GeneratedVideo[]
  isDataLoaded: boolean
  /** 最近使用的模特 ID */
  recentAvatarId: string | null
  /** 最近使用的声音 ID */
  recentVoiceId: string | null

  // 增删
  addVoice: (v: Voice) => void
  addAvatar: (a: Avatar) => void
  addVideo: (v: GeneratedVideo) => void
  removeVoice: (id: string) => void
  removeAvatar: (id: string) => void
  removeVideo: (id: string) => void
  updateVideo: (taskCode: string, patch: Partial<GeneratedVideo>) => void

  // 全量
  setData: (data: Partial<AppData>) => void

  // 工具
  getVoiceById: (id: string) => Voice | undefined
  getAvatarById: (id: string) => Avatar | undefined
  setRecent: (kind: 'avatar' | 'voice', id: string) => void
}

/** 防御性数据校验 */
function sanitizeData(raw: unknown): AppData {
  const r = (raw ?? {}) as Partial<AppData>
  return {
    voices: Array.isArray(r.voices) ? r.voices.filter(isVoice) : [],
    avatars: Array.isArray(r.avatars) ? r.avatars.filter(isAvatar) : [],
    generatedVideos: Array.isArray(r.generatedVideos)
      ? r.generatedVideos.filter(isVideo)
      : [],
  }
}

function isVoice(v: unknown): v is Voice {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    (o.status === 'training' || o.status === 'complete') &&
    typeof o.date === 'string'
  )
}

function isAvatar(a: unknown): a is Avatar {
  if (!a || typeof a !== 'object') return false
  const o = a as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.date === 'string' &&
    typeof o.videoUrl === 'string' &&
    typeof o.thumbUrl === 'string' &&
    typeof o.videoPath === 'string'
  )
}

function isVideo(v: unknown): v is GeneratedVideo {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.date === 'string' &&
    (o.status === 'queued' ||
      o.status === 'processing' ||
      o.status === 'success' ||
      o.status === 'failed')
  )
}

export const useAppStore = create<AppState>((set, get) => ({
  voices: [],
  avatars: [],
  videos: [],
  isDataLoaded: false,
  recentAvatarId: null,
  recentVoiceId: null,

  addVoice: (v) => set((s) => ({ voices: [v, ...s.voices] })),
  addAvatar: (a) => set((s) => ({ avatars: [a, ...s.avatars] })),
  addVideo: (v) => set((s) => ({ videos: [v, ...s.videos] })),
  removeVoice: (id) =>
    set((s) => ({
      voices: s.voices.filter((v) => v.id !== id),
      recentVoiceId: s.recentVoiceId === id ? null : s.recentVoiceId,
    })),
  removeAvatar: (id) =>
    set((s) => ({
      avatars: s.avatars.filter((a) => a.id !== id),
      recentAvatarId: s.recentAvatarId === id ? null : s.recentAvatarId,
    })),
  removeVideo: (id) =>
    set((s) => ({ videos: s.videos.filter((v) => v.id !== id) })),
  updateVideo: (taskCode, patch) =>
    set((s) => ({
      videos: s.videos.map((v) =>
        v.task_code === taskCode ? { ...v, ...patch } : v,
      ),
    })),

  setData: (data) => {
    const sanitized = sanitizeData(data)
    set({
      voices: sanitized.voices,
      avatars: sanitized.avatars,
      videos: sanitized.generatedVideos,
      isDataLoaded: true,
    })
  },

  getVoiceById: (id) => get().voices.find((v) => v.id === id),
  getAvatarById: (id) => get().avatars.find((a) => a.id === id),
  setRecent: (kind, id) =>
    set(() =>
      kind === 'avatar' ? { recentAvatarId: id } : { recentVoiceId: id },
    ),
}))

// ---------- 初始化 + 自动保存 ----------
let saveTimer: ReturnType<typeof setTimeout> | null = null
let isSaving = false

export async function bootstrapData() {
  try {
    const data = await api.getData()
    useAppStore.getState().setData(data)
  } catch {
    if (import.meta.env.DEV) console.error('Failed to load data')
    useAppStore.getState().setData({})
  }
}

useAppStore.subscribe((state) => {
  if (!state.isDataLoaded) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    if (isSaving) return
    isSaving = true
    try {
      await api.saveData({
        voices: state.voices,
        avatars: state.avatars,
        generatedVideos: state.videos,
      })
    } catch {
      if (import.meta.env.DEV) console.error('Auto-save failed')
    } finally {
      isSaving = false
    }
  }, 800)
})
