import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageOff, Loader2, Pause, Pencil, Play, Trash2, Wand2 } from 'lucide-react'
import { cn, formatDateTime, formatDuration } from '@/lib/utils'
import type { Avatar } from '@/types'
import StatusBadge from '@/components/ui/StatusBadge'

interface Props {
  avatar: Avatar
  onDelete: () => void
  onRename: () => void
  onUse: () => void
  busy?: boolean
}

export default function AvatarCard({ avatar, onDelete, onRename, onUse, busy }: Props) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [broken, setBroken] = useState(false)
  const ready = avatar.status === 'ready'
  const processing = avatar.status === 'processing'

  const togglePlay = () => {
    const el = videoRef.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
    } else {
      el.currentTime = 0
      void el
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
    }
  }

  return (
    <div className="card group overflow-hidden transition-colors hover:border-[rgb(var(--hairline-strong))]">
      <div className="preview-frame aspect-video rounded-none">
        {avatar.thumb_url && !broken ? (
          <img
            src={avatar.thumb_url}
            alt={avatar.name}
            onError={() => setBroken(true)}
            className={cn('h-full w-full object-cover', processing && 'opacity-60')}
          />
        ) : avatar.video_url && !broken ? (
          <video
            ref={videoRef}
            src={avatar.video_url}
            muted
            playsInline
            loop
            preload="metadata"
            onEnded={() => setPlaying(false)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/25">
            <ImageOff className="h-7 w-7" aria-hidden />
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/55 to-transparent" />
        <div className="absolute left-2 top-2">
          <StatusBadge kind="avatar" status={avatar.status} />
        </div>

        {processing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/45 text-white">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span className="text-[11px]">{t('avatars.processingHint')}</span>
          </div>
        )}

        {avatar.status === 'failed' && (
          <div className="absolute inset-x-0 bottom-0 p-2.5 preview-scrim">
            <p className="line-clamp-2 text-[11px] leading-snug text-white/85">
              {avatar.error_message || t('avatars.failedHint')}
            </p>
          </div>
        )}

        {avatar.video_url && avatar.status === 'ready' && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={playing ? '暂停预览' : '播放预览'}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-[rgb(20_20_19)]">
              {playing ? (
                <Pause className="h-4 w-4" aria-hidden />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden />
              )}
            </span>
          </button>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="flex items-center gap-1 rounded-md bg-black/55 p-1">
            <button
              type="button"
              onClick={onRename}
              className="rounded p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
              aria-label={t('avatars.rename')}
              title={t('avatars.rename')}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="rounded p-1.5 text-white/80 hover:bg-white/15 hover:text-[rgb(var(--danger))] disabled:opacity-40"
              aria-label={t('common.delete')}
              title={t('common.delete')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium" title={avatar.name}>
            {avatar.name}
          </div>
          <div className="num mt-0.5 text-[11px] text-[rgb(var(--text-3))]">
            {formatDateTime(avatar.created_at)}
            {avatar.duration_ms != null && ` · ${formatDuration(avatar.duration_ms)}`}
          </div>
        </div>
        <button
          type="button"
          onClick={onUse}
          disabled={!ready}
          className="btn btn-secondary btn-sm flex-shrink-0"
          title={!ready ? t('avatars.processingHint') : t('avatars.use')}
        >
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          {t('avatars.use')}
        </button>
      </div>
    </div>
  )
}
