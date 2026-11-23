import { create } from 'zustand'
import { api } from '@/api'
import { ApiError } from '@/api/client'
import type { Avatar, Bootstrap, ServerInfo, Stats, User, Video, VideoProgress, Voice } from '@/types'

const EMPTY_STATS: Stats = {
  videos: 0,
  avatars: 0,
  voices: 0,
  success_rate: null,
  active_tasks: 0,
}

interface AppState {
  user: User | null
  avatars: Avatar[]
  voices: Voice[]
  videos: Video[]
  stats: Stats
  server: ServerInfo | null
  /** 首屏数据是否已就绪 */
  isDataLoaded: boolean
  /** 首屏加载中 */
  isLoading: boolean
  /** 加载失败文案（后端不可用时明确报错，不做本地回退） */
  loadError: string | null
  /** 最近使用的数字人 / 声音（仅本地偏好） */
  recentAvatarId: string | null
  recentVoiceId: string | null

  applyBootstrap: (data: Bootstrap) => void
  setBootstrap: (data: Bootstrap) => void
  setLoading: (loading: boolean) => void
  setLoadError: (message: string | null) => void
  resetData: () => void

  setAvatars: (list: Avatar[]) => void
  setVoices: (list: Voice[]) => void
  setVideos: (list: Video[]) => void
  upsertAvatar: (avatar: Avatar) => void
  removeAvatar: (id: string) => void
  upsertVoice: (voice: Voice) => void
  removeVoice: (id: string) => void
  upsertVideo: (video: Video) => void
  removeVideo: (id: string) => void
  applyProgress: (list: VideoProgress[]) => void

  getAvatarById: (id: string | null | undefined) => Avatar | undefined
  getVoiceById: (id: string | null | undefined) => Voice | undefined
  setRecent: (kind: 'avatar' | 'voice', id: string) => void
}

function sortByCreatedDesc<T extends { created_at: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

/** 用本地资源数量补充统计，保证增删后立即一致 */
function deriveStats(state: {
  videos: Video[]
  avatars: Avatar[]
  voices: Voice[]
  stats: Stats
}): Stats {
  const finished = state.videos.filter((v) => v.status === 'success' || v.status === 'failed')
  const success = state.videos.filter((v) => v.status === 'success').length
  return {
    videos: state.videos.length,
    avatars: state.avatars.length,
    voices: state.voices.length,
    success_rate: finished.length === 0 ? null : success / finished.length,
    active_tasks: state.videos.filter((v) => v.status === 'queued' || v.status === 'processing')
      .length,
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  avatars: [],
  voices: [],
  videos: [],
  stats: EMPTY_STATS,
  server: null,
  isDataLoaded: false,
  isLoading: false,
  loadError: null,
  recentAvatarId: null,
  recentVoiceId: null,

  applyBootstrap: (data) => {
    const avatars = sortByCreatedDesc(data.avatars ?? [])
    const voices = sortByCreatedDesc(data.voices ?? [])
    const videos = sortByCreatedDesc(data.videos ?? [])
    set({
      user: data.user ?? null,
      avatars,
      voices,
      videos,
      stats: data.stats ?? deriveStats({ avatars, voices, videos, stats: EMPTY_STATS }),
      server: data.server ?? null,
      isDataLoaded: true,
      isLoading: false,
      loadError: null,
    })
  },
  setBootstrap: (data) => get().applyBootstrap(data),
  setLoading: (isLoading) => set({ isLoading }),
  setLoadError: (loadError) => set({ loadError, isLoading: false }),
  resetData: () =>
    set({
      user: null,
      avatars: [],
      voices: [],
      videos: [],
      stats: EMPTY_STATS,
      server: null,
      isDataLoaded: false,
      isLoading: false,
      loadError: null,
    }),

  setAvatars: (list) =>
    set((s) => {
      const avatars = sortByCreatedDesc(list)
      return { avatars, stats: deriveStats({ ...s, avatars }) }
    }),
  setVoices: (list) =>
    set((s) => {
      const voices = sortByCreatedDesc(list)
      return { voices, stats: deriveStats({ ...s, voices }) }
    }),
  setVideos: (list) =>
    set((s) => {
      const videos = sortByCreatedDesc(list)
      return { videos, stats: deriveStats({ ...s, videos }) }
    }),

  upsertAvatar: (avatar) =>
    set((s) => {
      const exists = s.avatars.some((a) => a.id === avatar.id)
      const avatars = sortByCreatedDesc(
        exists ? s.avatars.map((a) => (a.id === avatar.id ? avatar : a)) : [avatar, ...s.avatars],
      )
      return { avatars, stats: deriveStats({ ...s, avatars }) }
    }),
  removeAvatar: (id) =>
    set((s) => {
      const avatars = s.avatars.filter((a) => a.id !== id)
      return {
        avatars,
        stats: deriveStats({ ...s, avatars }),
        recentAvatarId: s.recentAvatarId === id ? null : s.recentAvatarId,
      }
    }),
  upsertVoice: (voice) =>
    set((s) => {
      const exists = s.voices.some((v) => v.id === voice.id)
      const voices = sortByCreatedDesc(
        exists ? s.voices.map((v) => (v.id === voice.id ? voice : v)) : [voice, ...s.voices],
      )
      return { voices, stats: deriveStats({ ...s, voices }) }
    }),
  removeVoice: (id) =>
    set((s) => {
      const voices = s.voices.filter((v) => v.id !== id)
      return {
        voices,
        stats: deriveStats({ ...s, voices }),
        recentVoiceId: s.recentVoiceId === id ? null : s.recentVoiceId,
      }
    }),
  upsertVideo: (video) =>
    set((s) => {
      const exists = s.videos.some((v) => v.id === video.id)
      const videos = sortByCreatedDesc(
        exists ? s.videos.map((v) => (v.id === video.id ? video : v)) : [video, ...s.videos],
      )
      return { videos, stats: deriveStats({ ...s, videos }) }
    }),
  removeVideo: (id) =>
    set((s) => {
      const videos = s.videos.filter((v) => v.id !== id)
      return { videos, stats: deriveStats({ ...s, videos }) }
    }),
  applyProgress: (list) =>
    set((s) => {
      if (list.length === 0) return {}
      const map = new Map(list.map((p) => [p.id, p]))
      const videos = s.videos.map((v) => {
        const p = map.get(v.id)
        if (!p) return v
        return {
          ...v,
          status: p.status,
          progress: p.progress,
          queue_position: p.queue_position,
          error_code: p.error_code,
          error_message: p.error_message,
          stream_url: p.stream_url ?? v.stream_url,
          download_url: p.download_url ?? v.download_url,
          share_url: p.share_url ?? v.share_url,
          updated_at: p.updated_at,
        }
      })
      return { videos, stats: deriveStats({ ...s, videos }) }
    }),

  getAvatarById: (id) => (id ? get().avatars.find((a) => a.id === id) : undefined),
  getVoiceById: (id) => (id ? get().voices.find((v) => v.id === id) : undefined),
  setRecent: (kind, id) =>
    set(() => (kind === 'avatar' ? { recentAvatarId: id } : { recentVoiceId: id })),
}))

/** 拉取首屏聚合数据（后端不可用时明确报错并提示重试） */
export async function bootstrapData(): Promise<void> {
  const store = useAppStore.getState()
  store.setLoading(true)
  try {
    const data = await api.bootstrap()
    useAppStore.getState().applyBootstrap(data)
  } catch (err) {
    const e = err as ApiError
    useAppStore.getState().setLoadError(e?.message || '数据加载失败，请稍后重试')
  }
}