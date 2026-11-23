import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, Mic, Play, Plus, Upload as UploadIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, formatBytes } from '@/lib/utils'
import { api } from '@/api'
import { ApiError } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'

export type AudioSource =
  | { kind: 'upload'; file: File; url: string }
  | { kind: 'tts'; blob: Blob; url: string }

interface Props {
  voiceId: string
  onVoiceChange: (id: string) => void
  audio: AudioSource | null
  onAudioChange: (audio: AudioSource | null) => void
}

/** 第二步：选择声音（试听）+ 上传本机配音 */
export default function StepVoice({ voiceId, onVoiceChange, audio, onAudioChange }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const voices = useAppStore((s) => s.voices)
  const complete = voices.filter((v) => v.status === 'complete')
  const [auditioning, setAuditioning] = useState(false)

  const handleAudition = async (id: string) => {
    setAuditioning(true)
    try {
      const result = await api.voices.audition(id, t('voices.auditionText'))
      const el = new Audio(result.url)
      el.onended = () => setAuditioning(false)
      el.onerror = () => setAuditioning(false)
      await el.play()
    } catch (err) {
      const e = err as ApiError
      toast.error(e.message || t('notify.networkError'))
      setAuditioning(false)
    }
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > 200 * 1024 * 1024) {
      toast.error(t('notify.fileTooBig'))
      return
    }
    if (audio) URL.revokeObjectURL(audio.url)
    onAudioChange({ kind: 'upload', file, url: URL.createObjectURL(file) })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-3 text-base font-semibold text-[rgb(var(--text))]">
          {t('editor.steps.voice')}
        </h2>
        {complete.length === 0 ? (
          <div className="card p-5 text-center">
            <p className="text-sm text-[rgb(var(--text-3))]">{t('editor.noVoice')}</p>
            <p className="mt-1 text-[11px] text-[rgb(var(--text-3))]">{t('editor.noVoiceDesc')}</p>
            <button
              type="button"
              onClick={() => navigate('/voices')}
              className="btn-primary mx-auto mt-3"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t('voices.upload')}
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {complete.map((voice) => {
              const active = voice.id === voiceId
              return (
                <div
                  key={voice.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                    active
                      ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/6'
                      : 'border-[rgb(var(--hairline))] hover:border-[rgb(var(--hairline-strong))]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onVoiceChange(voice.id)}
                    aria-pressed={active}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border',
                        active
                          ? 'border-[rgb(var(--accent))]/40 bg-[rgb(var(--accent))]/12 text-[rgb(var(--accent))]'
                          : 'border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text-3))]',
                      )}
                    >
                      {active ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                      ) : (
                        <Mic className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{voice.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAudition(voice.id)}
                    disabled={auditioning}
                    className="btn btn-ghost btn-icon btn-sm"
                    aria-label={t('voices.audition')}
                    title={t('voices.audition')}
                  >
                    {auditioning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-[rgb(var(--text))]">{t('editor.uploadTab')}</h3>
        {audio?.kind === 'upload' ? (
          <div className="flex items-center gap-3 rounded-lg border border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] p-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[rgb(var(--success))]/12 text-[rgb(var(--success))]">
              <Check className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{audio.file.name}</div>
              <div className="num text-[11px] text-[rgb(var(--text-3))]">
                {formatBytes(audio.file.size)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(audio.url)
                onAudioChange(null)
              }}
              className="btn btn-ghost btn-sm"
            >
              {t('common.delete')}
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[rgb(var(--hairline-strong))] p-5 text-center transition-colors hover:border-[rgb(var(--accent))]">
            <UploadIcon className="h-5 w-5 text-[rgb(var(--text-3))]" aria-hidden />
            <span className="text-sm font-medium">{t('editor.selectFile')}</span>
            <span className="text-[11px] text-[rgb(var(--text-3))]">{t('editor.selectFileHint')}</span>
            <input
              type="file"
              accept="audio/*,.wav,.mp3,.m4a"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        )}
      </div>
    </div>
  )
}
