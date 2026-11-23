import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/api'
import { ApiError } from '@/api/client'
import { cn, formatDateTime, formatDuration } from '@/lib/utils'
import type { Voice } from '@/types'
import StatusBadge from '@/components/ui/StatusBadge'

interface Props {
  voice: Voice
  onDelete: () => void
  onRename: () => void
  busy?: boolean
}

export default function VoiceCard({ voice, onDelete, onRename, busy }: Props) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const complete = voice.status === 'complete'

  useEffect(
    () => () => {
      audioRef.current?.pause()
      audioRef.current = null
    },
    [],
  )

  const audition = async () => {
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    if (!complete) return
    setLoading(true)
    try {
      const result = await api.voices.audition(voice.id, t('voices.auditionText'))
      const audio = new Audio(result.url)
      audioRef.current = audio
      audio.onended = () => setPlaying(false)
      audio.onerror = () => {
        setPlaying(false)
        toast.error(t('notify.networkError'))
      }
      await audio.play()
      setPlaying(true)
    } catch (err) {
      const e = err as ApiError
      toast.error(e.message || t('notify.networkError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card group flex flex-col gap-3 p-4 transition-colors hover:border-[rgb(var(--hairline-strong))]">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border',
            complete
              ? 'border-[rgb(var(--accent))]/25 bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))]'
              : 'border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text-3))]',
          )}
          aria-hidden
        >
          {voice.status === 'training' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="text-xs font-semibold">AI</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium" title={voice.name}>
            {voice.name}
          </div>
          <div className="num mt-0.5 text-[11px] text-[rgb(var(--text-3))]">
            {formatDateTime(voice.created_at)}
            {voice.duration_ms != null && ` · ${formatDuration(voice.duration_ms)}`}
          </div>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={onRename}
            className="btn btn-ghost btn-icon btn-sm"
            aria-label={t('voices.rename')}
            title={t('voices.rename')}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="btn btn-ghost btn-icon btn-sm hover:text-[rgb(var(--danger))]"
            aria-label={t('common.delete')}
            title={t('common.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {voice.status === 'failed' && (
        <p className="line-clamp-2 rounded-md border border-[rgb(var(--danger))]/20 bg-[rgb(var(--danger))]/8 px-2 py-1.5 text-[11px] text-[rgb(var(--danger))]">
          {voice.error_message || t('fail.unknown')}
        </p>
      )}
      {voice.status === 'training' && (
        <p className="text-[11px] text-[rgb(var(--text-3))]">{t('voices.trainingHint')}</p>
      )}

      <div className="flex items-center justify-between">
        <StatusBadge kind="voice" status={voice.status} />
        <button
          type="button"
          onClick={audition}
          disabled={!complete || loading}
          className="btn btn-secondary btn-sm"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : playing ? (
            <Pause className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          )}
          {playing ? t('voices.auditioning') : t('voices.audition')}
        </button>
      </div>
    </div>
  )
}
