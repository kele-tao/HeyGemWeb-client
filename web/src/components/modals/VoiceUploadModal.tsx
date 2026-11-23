import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, FileAudio, Mic, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/feedback/Modal'
import UploadProgress, { type UploadPhase } from '@/components/feedback/UploadProgress'
import { useMediaMeta } from '@/hooks/useMediaMeta'
import { usePollResource } from '@/hooks/useVideoProgress'
import { api } from '@/api'
import { ApiError } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import { cn, formatBytes } from '@/lib/utils'
import type { Voice } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

const MAX_SIZE = 200 * 1024 * 1024
const MIN_DURATION = 30
const MAX_DURATION = 600
const AUDIO_EXT = /\.(wav|mp3|m4a|flac)$/i

/**
 * 上传声音：POST /api/voices（name + audio_file）→ 返回 training 记录
 * → 轮询 GET /api/voices/{id} 直到 complete / failed（2s 起，退避到 10s）。
 */
export default function VoiceUploadModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const upsertVoice = useAppStore((s) => s.upsertVoice)
  const uid = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [phase, setPhase] = useState<UploadPhase>('uploading')
  const [percent, setPercent] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [created, setCreated] = useState<Voice | null>(null)
  const [busy, setBusy] = useState(false)

  const meta = useMediaMeta(file)

  usePollResource(
    !!created && created.status === 'training',
    () => api.voices.get(created!.id),
    (value) => {
      const next = { ...created!, ...(value as Voice) }
      setCreated(next)
      upsertVoice(next)
      if (next.status === 'complete') {
        toast.success(t('voices.done'))
        finish()
      }
      if (next.status === 'failed') {
        setPhase('failed')
        setErrorMessage(next.error_message || t('fail.unknown'))
        setBusy(false)
      }
    },
  )

  const reset = () => {
    setName('')
    setFile(null)
    setDragOver(false)
    setPhase('uploading')
    setPercent(null)
    setErrorMessage(null)
    setCreated(null)
    setBusy(false)
  }

  // 成功/失败后无条件收起（不受 busy 守卫影响）
  const finish = () => {
    setBusy(false)
    reset()
    onClose()
  }

  const handleClose = () => {
    if (busy) return
    reset()
    onClose()
  }

  // 客户端只预检"能读到时长"的明确违规；读不到时交给服务端校验（MEDIA_PROBE_FAILED）
  const probeFailed = !meta.loading && !!meta.error
  const validationError = (() => {
    if (!file) return null
    if (meta.loading || meta.error) return null
    if (meta.duration != null && meta.duration < MIN_DURATION) {
      return `音频时长不足，需 ≥ ${MIN_DURATION} 秒（当前 ${Math.round(meta.duration)} 秒）`
    }
    if (meta.duration != null && meta.duration > MAX_DURATION) {
      return `音频时长超出上限，需 ≤ ${MAX_DURATION / 60} 分钟`
    }
    return null
  })()

  const acceptFile = (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith('audio/') && !AUDIO_EXT.test(f.name)) {
      toast.error(t('notify.fileTypeError'))
      return
    }
    if (f.size > MAX_SIZE) {
      toast.error(t('notify.fileTooBig'))
      return
    }
    setFile(f)
    setErrorMessage(null)
    if (!name) setName(f.name.replace(/\.[^/.]+$/, '').slice(0, 80))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    const trimmed = name.trim()
    if (!trimmed || !file) {
      toast.error(t('voices.nameLabel'))
      return
    }
    if (validationError) {
      toast.error(validationError)
      return
    }
    setBusy(true)
    setPercent(0)
    setPhase('uploading')
    setErrorMessage(null)
    try {
      const voice = await api.voices.create(trimmed, file, (p) => setPercent(p))
      upsertVoice(voice)
      setCreated(voice)
      setPhase(voice.status === 'training' ? 'processing' : 'ready')
      if (voice.status === 'failed') {
        setPhase('failed')
        setErrorMessage(voice.error_message)
        setBusy(false)
      } else if (voice.status === 'complete') {
        toast.success(t('voices.done'))
        finish()
      }
    } catch (err) {
      const e2 = err as ApiError
      setPhase('failed')
      setErrorMessage(e2.message || t('fail.unknown'))
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('voices.upload')} dismissible={!busy}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          <div>
            <label htmlFor={`${uid}-name`} className="form-label">
              {t('voices.nameLabel')}
            </label>
            <input
              id={`${uid}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('voices.namePlaceholder')}
              className="input"
              maxLength={80}
              disabled={busy}
            />
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              acceptFile(e.dataTransfer.files[0])
            }}
            className={cn(
              'rounded-lg border border-dashed p-5 text-center transition-colors',
              dragOver
                ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/5'
                : 'border-[rgb(var(--hairline-strong))]',
              busy && 'pointer-events-none opacity-60',
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="audio/*,.wav,.mp3,.m4a,.flac"
              className="sr-only"
              onChange={(e) => acceptFile(e.target.files?.[0])}
              aria-label={t('voices.selectAudio')}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-md border',
                    validationError
                      ? 'border-[rgb(var(--danger))]/30 bg-[rgb(var(--danger))]/10 text-[rgb(var(--danger))]'
                      : 'border-[rgb(var(--success))]/30 bg-[rgb(var(--success))]/10 text-[rgb(var(--success))]',
                  )}
                >
                  {validationError ? (
                    <AlertCircle className="h-5 w-5" aria-hidden />
                  ) : (
                    <FileAudio className="h-5 w-5" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <div className="max-w-[220px] truncate text-sm font-medium">{file.name}</div>
                  <div className="num text-[11px] text-[rgb(var(--text-3))]">
                    {formatBytes(file.size)}
                    {meta.duration != null && ` · ${Math.round(meta.duration)} 秒`}
                    {!meta.loading && meta.duration == null && !meta.error && ' · 时长待服务端解析'}
                    {meta.loading && ' · 读取中…'}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md border border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text-2))]">
                  <Upload className="h-4 w-4" aria-hidden />
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-sm font-medium hover:text-[rgb(var(--accent))]"
                >
                  {t('voices.selectAudio')}
                </button>
              </>
            )}
          </div>
          {validationError && <p className="text-[11px] text-[rgb(var(--danger))]">{validationError}</p>}
          {probeFailed && (
            <p className="text-[11px] text-[rgb(var(--warning))]">
              {t('notify.mediaProbeFailed')}（仍可提交，由服务端校验）
            </p>
          )}
          <p className="text-[11px] text-[rgb(var(--text-3))]">{t('voices.audioHint')}</p>

          {(busy || (phase === 'failed' && errorMessage)) && (
            <UploadProgress
              percent={percent}
              phase={phase}
              hint={phase === 'processing' ? t('voices.trainingHint') : undefined}
              errorMessage={errorMessage}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[rgb(var(--hairline))] px-5 py-4">
          <button type="button" onClick={handleClose} className="btn-secondary" disabled={busy}>
            {busy ? t('common.close') : t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={busy || !file || !!validationError}>
            <Mic className="h-4 w-4" aria-hidden />
            {busy ? t('uploading.processing') : t('common.submit')}
          </button>
        </div>
      </form>
    </Modal>
  )
}