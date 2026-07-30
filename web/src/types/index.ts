// 全局类型定义 - 与后端 /api/data 返回结构对齐

export type VideoStatus = 'queued' | 'processing' | 'success' | 'failed'
export type VoiceStatus = 'training' | 'complete'

export interface Voice {
  id: string
  name: string
  status: VoiceStatus
  date: string
  asr_format_audio_url: string
  reference_audio_text: string
  /** 原始样本 URL(可选) */
  reference_audio_url?: string
}

export interface Avatar {
  id: string
  title: string
  date: string
  videoUrl: string
  thumbUrl: string
  /** 服务端磁盘路径,合成视频时回传 */
  videoPath: string
}

export interface GeneratedVideo {
  id: string
  task_code: string
  title: string
  thumbUrl: string | null
  videoUrl: string | null
  date: string
  status: VideoStatus
  avatarId: string
  error_message?: string
  /** 合成进度 0-100 */
  progress?: number
  /** 分类/标签 */
  category?: string
  /** 时长(秒) */
  duration?: number
}

export interface AppData {
  voices: Voice[]
  avatars: Avatar[]
  generatedVideos: GeneratedVideo[]
}

export interface ProjectState {
  id: string
  title: string
  avatarId: string | null
  script: string
  /** 合成后从后端拿到的最终 URL */
  audioUrl: string | null
  videoUrl: string | null
}
