import { http, uploadWithProgress } from './client'
import type {
  AuditionResult,
  Avatar,
  Bootstrap,
  ListQuery,
  ShareResult,
  SystemStatus,
  Video,
  VideoProgress,
  Voice,
} from '@/types'

export * from './client'
export * as authApi from './auth'

/** 运行环境信息（无需登录） */
export function systemStatus(): Promise<SystemStatus> {
  return http.get<SystemStatus>('/api/system/status')
}

/** 首屏聚合（替代旧 GET /api/data） */
export function bootstrap(): Promise<Bootstrap> {
  return http.get<Bootstrap>('/api/bootstrap')
}

// ------------------------------- 数字人 ------------------------------------
export const avatars = {
  list: (query?: Pick<ListQuery, 'status' | 'limit' | 'offset'>) =>
    http.get<Avatar[]>('/api/avatars', query),
  create: (name: string, videoFile: File, onProgress?: (p: number) => void) => {
    const fd = new FormData()
    fd.append('name', name)
    fd.append('video_file', videoFile)
    return uploadWithProgress<Avatar>('/api/avatars', fd, onProgress)
  },
  get: (id: string) => http.get<Avatar>(`/api/avatars/${id}`),
  update: (id: string, name: string) => http.patch<Avatar>(`/api/avatars/${id}`, { name }),
  remove: (id: string) => http.delete<null>(`/api/avatars/${id}`),
}

// -------------------------------- 声音 -------------------------------------
export const voices = {
  list: (query?: Pick<ListQuery, 'status' | 'limit' | 'offset'>) =>
    http.get<Voice[]>('/api/voices', query),
  create: (name: string, audioFile: File, onProgress?: (p: number) => void) => {
    const fd = new FormData()
    fd.append('name', name)
    fd.append('audio_file', audioFile)
    return uploadWithProgress<Voice>('/api/voices', fd, onProgress)
  },
  get: (id: string) => http.get<Voice>(`/api/voices/${id}`),
  update: (id: string, name: string) => http.patch<Voice>(`/api/voices/${id}`, { name }),
  remove: (id: string) => http.delete<null>(`/api/voices/${id}`),
  /** 试听（服务端按文本哈希缓存） */
  audition: (id: string, text: string) =>
    http.post<AuditionResult>(`/api/voices/${id}/audition`, { text }),
  /** 语音合成：返回 wav 二进制，前端自行 createObjectURL */
  speech: (id: string, text: string) => http.blob(`/api/voices/${id}/speech`, { text }),
}

// -------------------------------- 作品 -------------------------------------
export interface CreateVideoInput {
  title: string
  avatar_id: string
  audio_file: File | Blob
  voice_id?: string
  script?: string
  category?: string
}

export const videos = {
  list: (query?: ListQuery) =>
    http.get<Video[]>('/api/videos', {
      status: query?.status,
      q: query?.q,
      limit: query?.limit,
      offset: query?.offset,
    }),
  create: (input: CreateVideoInput, onProgress?: (p: number) => void) => {
    const fd = new FormData()
    fd.append('title', input.title)
    fd.append('avatar_id', input.avatar_id)
    const file =
      input.audio_file instanceof File
        ? input.audio_file
        : new File([input.audio_file], 'audio.wav', { type: 'audio/wav' })
    fd.append('audio_file', file)
    if (input.voice_id) fd.append('voice_id', input.voice_id)
    if (input.script) fd.append('script', input.script)
    if (input.category) fd.append('category', input.category)
    return uploadWithProgress<Video>('/api/videos', fd, onProgress)
  },
  get: (id: string) => http.get<Video>(`/api/videos/${id}`),
  update: (id: string, title: string) => http.patch<Video>(`/api/videos/${id}`, { title }),
  remove: (id: string) => http.delete<null>(`/api/videos/${id}`),
  retry: (id: string) => http.post<Video>(`/api/videos/${id}/retry`),
  /** 批量进度（最多 50 个 id） */
  progress: (ids: string[]) => {
    if (ids.length === 0) return Promise.resolve<VideoProgress[]>([])
    return http.get<VideoProgress[]>('/api/videos/progress', {
      ids: ids.slice(0, 50).join(','),
    })
  },
  share: (id: string) => http.post<ShareResult>(`/api/videos/${id}/share`),
  unshare: (id: string) => http.delete<null>(`/api/videos/${id}/share`),
}

export const api = {
  systemStatus,
  bootstrap,
  avatars,
  voices,
  videos,
}

export default api