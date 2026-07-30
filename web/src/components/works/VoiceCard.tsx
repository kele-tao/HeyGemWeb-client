import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Play,
  Pause,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  Mic,
  Calendar,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { api } from '@/api'
import { useAppStore } from '@/store/useAppStore'
import type { Voice } from '@/types'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface Props {
  voice: Voice
  onDelete: () => void
}

export default function VoiceCard({ voice, onDelete }: Props) {
  const { t } = useTranslation()
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)
  const getVoiceById = useAppStore((s) => s.getVoiceById)

  const stop = () => {
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    setPlaying(false)
  }

  const audition = async () => {
    if (playing) {
      stop()
      return
    }
    const current = getVoiceById(voice.id)
    if (!current?.asr_format_audio_url || !current?.reference_audio_text) {
      toast.error(t('notify.voiceIncomplete'))
      return
    }
    setLoading(true)
    try {
      const data = await api.auditionVoice(
        voice.id,
        t('editor.auditionText'),
        current,
      )
      const a = new Audio(data.url)
      a.onended = () => setPlaying(false)
      a.onerror = () => {
        setPlaying(false)
        toast.error(t('notify.audioFail'))
      }
      a.play()
      setAudio(a)
      setPlaying(true)
    } catch (e: any) {
      toast.error(e.message || t('notify.audioFail'))
    } finally {
      setLoading(false)
    }
  }

  const complete = voice.status === 'complete'

  return (
    <div
      className={cn(
        'card p-4 flex flex-col gap-3 relative overflow-hidden group',
        'transition-all duration-300 ease-out-expo',
        'hover:-translate-y-0.5 hover:shadow-md hover:border-[rgb(var(--border-2))]',
      )}
    >
      {/* 装饰背景 */}
      <div
        className={cn(
          'absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-20',
          complete
            ? 'bg-gradient-to-br from-success-500 to-emerald-500'
            : 'bg-gradient-to-br from-warning-500 to-orange-500',
        )}
        aria-hidden
      />

      <div className="relative flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
              complete
                ? 'bg-gradient-to-br from-success-500 to-emerald-500 text-white'
                : 'bg-gradient-to-br from-warning-500 to-orange-500 text-white',
            )}
          >
            <Mic className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate" title={voice.name}>
              {voice.name}
            </div>
            <div className="text-xs text-[rgb(var(--text-muted))] mt-0.5 flex items-center gap-1 num">
              <Calendar className="w-3 h-3" />
              {formatDate(voice.date)}
            </div>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-[rgb(var(--text-muted))] hover:bg-danger-50 hover:text-danger-500 dark:hover:bg-danger-500/10 transition flex-shrink-0 opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* 波形占位 */}
      {playing && (
        <div className="relative flex items-end gap-0.5 h-7 px-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-brand-500 to-info-500 rounded-full animate-pulse"
              style={{
                height: `${20 + Math.sin(i * 0.5 + Date.now() / 200) * 8}px`,
                animationDelay: `${i * 0.05}s`,
                animationDuration: `${0.6 + (i % 3) * 0.2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative flex items-center justify-between">
        <span
          className={
            complete
              ? 'badge-success'
              : 'badge-warning'
          }
        >
          {complete ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <Clock className="w-3 h-3" />
          )}
          {complete ? t('works.status.complete') : t('works.status.training')}
        </span>

        <button
          onClick={audition}
          disabled={!complete || loading}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            playing
              ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
              : 'text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10',
          )}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : playing ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
          <span className="text-xs font-medium">
            {playing ? t('editor.auditioning') : t('editor.audition')}
          </span>
        </button>
      </div>
    </div>
  )
}
