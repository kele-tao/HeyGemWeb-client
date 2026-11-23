// 全局类型定义 - 与后端契约（ai-docs/后端设计/API_Contract）严格对齐
// 字段命名统一 snake_case，前端不得再出现 camelCase 版本

/** 作品状态：排队 / 处理中 / 成功 / 失败 */
export type VideoStatus = 'queued' | 'processing' | 'success' | 'failed'
/** 声音状态：训练中 / 可用 / 失败 */
export type VoiceStatus = 'training' | 'complete' | 'failed'
/** 数字人状态：处理中 / 可用 / 失败 */
export type AvatarStatus = 'processing' | 'ready' | 'failed'
/** AI 运行模式：mock（演示）/ live（真实） */
export type AiMode = 'mock' | 'live' | string

/** 当前账号（GET /api/auth/me） */
export interface User {
  id: string
  email: string
  created_at: string
  last_login_at: string | null
}

/** 登录/注册响应 */
export interface AuthResponse {
  user: User
  access_token: string
  token_type: string
  expires_in: number
}

/** 刷新令牌响应 */
export interface RefreshResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface Avatar {
  id: string
  name: string
  status: AvatarStatus
  thumb_url: string | null
  video_url: string | null
  duration_ms: number | null
  width: number | null
  height: number | null
  size_bytes: number | null
  error_code: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface Voice {
  id: string
  name: string
  status: VoiceStatus
  sample_url: string | null
  duration_ms: number | null
  size_bytes: number | null
  error_code: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface Video {
  id: string
  title: string
  status: VideoStatus
  progress: number
  queue_position: number | null
  thumb_url: string | null
  stream_url: string | null
  download_url: string | null
  share_url: string | null
  avatar_id: string | null
  voice_id: string | null
  script: string | null
  category: string | null
  duration_ms: number | null
  error_code: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

/** 批量进度（GET /api/videos/progress） */
export interface VideoProgress {
  id: string
  status: VideoStatus
  progress: number
  queue_position: number | null
  error_code: string | null
  error_message: string | null
  stream_url: string | null
  download_url: string | null
  share_url: string | null
  updated_at: string
}

/** 首屏统计（bootstrap.stats） */
export interface Stats {
  videos: number
  avatars: number
  voices: number
  success_rate: number | null
  active_tasks: number
}

/** 服务端运行信息（bootstrap.server） */
export interface ServerInfo {
  ai_mode: AiMode
  app_env: string
  version: string
}

export interface SystemStatus {
  app_env: string
  ai_mode: AiMode
  version: string
  services?: Record<string, boolean>
}

/** GET /api/bootstrap */
export interface Bootstrap {
  user: User
  avatars: Avatar[]
  voices: Voice[]
  videos: Video[]
  stats: Stats
  server: ServerInfo
}

/** GET /api/videos/{id}/share */
export interface ShareResult {
  share_token: string
  share_url: string
}

/** POST /api/voices/{id}/audition */
export interface AuditionResult {
  url: string
  cached: boolean
}

/** 编辑器本地草稿（仅存于 localStorage，后端不参与） */
export interface ProjectState {
  id: string
  title: string
  avatarId: string | null
  voiceId: string | null
  script: string
}

/** 分页查询参数 */
export interface ListQuery {
  status?: string
  q?: string
  limit?: number
  offset?: number
}
