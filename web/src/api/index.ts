import type { AppData, Avatar, Voice } from '@/types'

// 后端基础路径(开发用 vite proxy,生产用 nginx 反代)
const BASE = ''

async function http<T>(
  url: string,
  init?: RequestInit & { raw?: boolean },
): Promise<T> {
  const res = await fetch(BASE + url, init)
  if (!res.ok) {
    let detail: string | undefined
    try {
      const data = await res.json()
      detail = data.detail ?? data.message
    } catch {
      /* ignore */
    }
    throw new Error(detail || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  /** 拉取所有持久化数据 */
  getData: () => http<AppData>('/api/data'),

  /** 保存所有数据(整体覆盖) */
  saveData: (data: AppData) =>
    http<{ message: string }>('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  /** 声音训练 */
  trainVoice: (audioFile: File) => {
    const fd = new FormData()
    fd.append('audio_file', audioFile)
    return http<{
      msg: string
      asr_format_audio_url: string
      reference_audio_text: string
    }>('/api/model-training', { method: 'POST', body: fd })
  },

  /** 上传数字人 */
  uploadAvatar: (title: string, videoFile: File) => {
    const fd = new FormData()
    fd.append('title', title)
    fd.append('video_file', videoFile)
    return http<Avatar>('/api/upload-avatar', { method: 'POST', body: fd })
  },

  /** 合成音频 - 后端返回 audio/wav 二进制 */
  synthesizeAudio: (text: string, voice: Voice) =>
    fetch('/api/audio-synthesis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        reference_audio: voice.asr_format_audio_url,
        reference_text: voice.reference_audio_text,
      }),
    }),

  /** 试听声音 - 走服务端缓存 */
  auditionVoice: (voiceId: string, text: string, voice: Voice) =>
    http<{ url: string }>('/api/audition-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voice_id: voiceId,
        text,
        reference_audio: voice.asr_format_audio_url,
        reference_text: voice.reference_audio_text,
      }),
    }),

  /** 视频合成(加入队列) */
  synthesizeVideo: (params: {
    audioBlob: Blob
    avatar: Avatar
    projectTitle: string
  }) => {
    const fd = new FormData()
    fd.append(
      'audio_file',
      new File([params.audioBlob], 'audio.wav', { type: 'audio/wav' }),
    )
    fd.append('video_path', params.avatar.videoPath)
    fd.append('project_title', params.projectTitle)
    fd.append('avatar_id', params.avatar.id)
    return http<{ message: string; task_code: string }>('/api/video-synthesis', {
      method: 'POST',
      body: fd,
    })
  },

  /** 批量进度查询 */
  batchCheck: (codes: string[]) =>
    http<
      Array<{
        code: string
        status: string
        video_url?: string
        msg?: string
      }>
    >('/api/batch-progress-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codes }),
    }),
}
