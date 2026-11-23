import { AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AvatarStatus, VideoStatus, VoiceStatus } from '@/types'

type Kind = 'video' | 'avatar' | 'voice'

const VIDEO_MAP: Record<VideoStatus, { cls: string; icon: typeof Clock }> = {
  queued: { cls: 'badge-neutral', icon: Clock },
  processing: { cls: 'badge-warning', icon: Loader2 },
  success: { cls: 'badge-success', icon: CheckCircle2 },
  failed: { cls: 'badge-danger', icon: AlertCircle },
}

const AVATAR_MAP: Record<AvatarStatus, { cls: string; icon: typeof Clock }> = {
  processing: { cls: 'badge-warning', icon: Loader2 },
  ready: { cls: 'badge-success', icon: CheckCircle2 },
  failed: { cls: 'badge-danger', icon: AlertCircle },
}

const VOICE_MAP: Record<VoiceStatus, { cls: string; icon: typeof Clock }> = {
  training: { cls: 'badge-warning', icon: Loader2 },
  complete: { cls: 'badge-success', icon: CheckCircle2 },
  failed: { cls: 'badge-danger', icon: AlertCircle },
}

interface Props {
  kind: Kind
  status: string
  className?: string
}

/** 状态徽标（弱底 + 状态色文字 + 1px 描边，设计体系 §1.6） */
export default function StatusBadge({ kind, status, className }: Props) {
  const { t } = useTranslation()

  let entry: { cls: string; icon: typeof Clock } | undefined
  let label = status

  if (kind === 'video') {
    entry = VIDEO_MAP[status as VideoStatus]
    label = t(`works.status${status.charAt(0).toUpperCase()}${status.slice(1)}`)
  } else if (kind === 'avatar') {
    entry = AVATAR_MAP[status as AvatarStatus]
    const key =
      status === 'processing' ? 'statusProcessing' : status === 'ready' ? 'statusReady' : 'statusFailed'
    label = t(`avatars.${key}`)
  } else {
    entry = VOICE_MAP[status as VoiceStatus]
    const key =
      status === 'training' ? 'statusTraining' : status === 'complete' ? 'statusComplete' : 'statusFailed'
    label = t(`voices.${key}`)
  }

  if (!entry) return null
  const Icon = entry.icon
  const spinning = status === 'processing' || status === 'training'

  return (
    <span className={`${entry.cls} ${className ?? ''}`}>
      <Icon className={`h-3 w-3 ${spinning ? 'animate-spin' : ''}`} aria-hidden />
      {label}
    </span>
  )
}
