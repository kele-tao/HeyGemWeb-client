import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Check, FileVideo, Lightbulb, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/feedback/Modal'
import UploadProgress, { type UploadPhase } from '@/components/feedback/UploadProgress'
import { useMediaMeta } from '@/hooks/useMediaMeta'
import { usePollResource } from '@/hooks/useVideoProgress'
import { api } from '@/api'
import { ApiError } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import { cn, formatBytes } from '@/lib/utils'
import type { Avatar } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

const MAX_SIZE = 500 * 1024 * 1024
const MIN_DURATION = 30
const MAX_DURATION = 600
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

/**
 * 上传数字人：POST /api/avatars（name + video_file）→ 返回 processing 记录
 * → 轮询 GET /api/avatars/{id} 直到 ready / failed（2s 起，退避到 10s）。
 */
export default function AvatarUploadModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const upsertAvatar = useAppStore((s) => s.upsertAvatar)
  const uid = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [phase, setPhase] = useState<UploadPhase>('uploading')
  const [percent, setPercent] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [created, setCreated] = useState<Avatar | null>(null)
  const [busy, setBusy] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const meta = useMediaMeta(file)

  // 轮询创建后的处理状态
  usePollResource(
    !!created && created.status === 'processing',
    () => api.avatars.get(created!.id),
    (value) => {
      const next = { ...created!, ...(value as Avatar) }
      setCreated(next)
      upsertAvatar(next)
      if (next.status === 'ready') {
        toast.success(t('avatars.done'))
        finish()
      }
      if (next.status === 'failed') {
        setPhase('failed')
        setErrorMessage(next.error_message || t('avatars.failedHint'))
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
    setNameError(null)
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
      return `视频时长不足，需 ≥ ${MIN_DURATION} 秒（当前 ${Math.round(meta.duration)} 秒）`
    }
    if (meta.duration != null && meta.duration > MAX_DURATION) {
      return `视频时长超出上限，需 ≤ ${MAX_DURATION / 60} 分钟（当前 ${Math.round(meta.duration / 60)} 分钟）`
    }
    return null
  })()

  const acceptFile = (f: File | undefined) => {
    if (!f) return
    if (!VIDEO_TYPES.includes(f.type) && !/.(mp4|mov|webm)$/i.test(f.name)) {
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
    if (!trimmed) {
      setNameError(t('avatars.nameLabel'))
      return
    }
    if (!file) {
      toast.error(t('avatars.selectVideo'))
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
      const avatar = await api.avatars.create(trimmed, file, (p) => setPercent(p))
      upsertAvatar(avatar)
      setCreated(avatar)
      setPhase(avatar.status === 'processing' ? 'processing' : 'ready')
      if (avatar.status === 'failed') {
        setPhase('failed')
        setErrorMessage(avatar.error_message)
        setBusy(false)
      } else if (avatar.status === 'ready') {
        toast.success(t('avatars.done'))
        finish()
      }
    } catch (err) {
      const e2 = err as ApiError
      setPhase('failed')
      setErrorMessage(e2.message || t('avatars.failedHint'))
      setBusy(false)
    }
  }

  const reqs = ['reqDuration', 'reqSingle', 'reqFace', 'reqLight', 'reqStable'] as const

  return (
    <Modal open={open} onClose={handleClose} title={t('avatars.upload')} size="2xl" dismissible={!busy}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor={`${uid}-name`} className="form-label">
                {t('avatars.nameLabel')}
              </label>
              <input
                id={`${uid}-name`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameError(null)
                }}
                placeholder={t('avatars.namePlaceholder')}
                className={cn('input', nameError && 'input-error')}
                maxLength={80}
                disabled={busy}
                aria-invalid={!!nameError}
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
                'flex min-h-[200px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center transition-colors',
                dragOver
                  ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/5'
                  : 'border-[rgb(var(--hairline-strong))]',
                busy && 'pointer-events-none opacity-60',
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="sr-only"
                onChange={(e) => acceptFile(e.target.files?.[0])}
                aria-label={t('avatars.selectVideo')}
              />
              {file ? (
                <>
                  <div
                    className={cn(
                      'mb-2.5 flex h-11 w-11 items-center justify-center rounded-md border',
                      validationError
                        ? 'border-[rgb(var(--danger))]/30 bg-[rgb(var(--danger))]/10 text-[rgb(var(--danger))]'
                        : 'border-[rgb(var(--success))]/30 bg-[rgb(var(--success))]/10 text-[rgb(var(--success))]',
                    )}
                  >
                    {validationError ? (
                      <AlertCircle className="h-5 w-5" aria-hidden />
                    ) : (
                      <FileVideo className="h-5 w-5" aria-hidden />
                    )}
                  </div>
                  <div className="max-w-full truncate text-sm font-medium">{file.name}</div>
                  <div className="num mt-1 text-[11px] text-[rgb(var(--text-3))]">
                    {formatBytes(file.size)}
                    {meta.duration != null && ` · ${Math.round(meta.duration)} 秒`}
                    {!meta.loading && meta.duration == null && !meta.error && ' · 时长待服务端解析'}
                    {meta.width != null && meta.height != null && ` · ${meta.width}×${meta.height}`}
                    {meta.loading && ' · 读取中…'}
                  </div>
                  {validationError && (
                    <p className="mt-1.5 text-[11px] text-[rgb(var(--danger))]">{validationError}</p>
                  )}
                  {probeFailed && (
                    <p className="mt-1.5 text-[11px] text-[rgb(var(--warning))]">
                      {t('notify.mediaProbeFailed')}（仍可提交，由服务端校验）
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="btn btn-ghost btn-sm mt-2"
                    disabled={busy}
                  >
                    {t('common.edit')}
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-md border border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text-2))]">
                    <Upload className="h-5 w-5" aria-hidden />
                  </div>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="text-sm font-medium text-[rgb(var(--text))] hover:text-[rgb(var(--accent))]"
                  >
                    {t('avatars.selectVideo')}
                  </button>
                  <p className="mt-1 text-[11px] text-[rgb(var(--text-3))]">{t('avatars.videoHint')}</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--text))]">
              <Lightbulb className="h-4 w-4 text-[rgb(var(--warning))]" aria-hidden />
              {t('avatars.requirements')}
            </div>
            <ul className="space-y-2">
              {reqs.map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm text-[rgb(var(--text-2))]">
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[rgb(var(--success))]" aria-hidden />
                  <span>{t(`avatars.${key}`)}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-md border border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] p-3 text-[11px] leading-relaxed text-[rgb(var(--text-3))]">
              {t('avatars.subtitle')}
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-[rgb(var(--hairline))] px-5 py-4">
          {busy && (
            <UploadProgress
              percent={percent}
              phase={phase}
              hint={phase === 'processing' ? t('avatars.processingHint') : undefined}
              errorMessage={errorMessage}
            />
          )}
          {!busy && phase === 'failed' && errorMessage && (
            <UploadProgress percent={null} phase="failed" errorMessage={errorMessage} />
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleClose} className="btn-secondary" disabled={busy}>
              {busy ? t('common.close') : t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={busy || !file || !!validationError}
            >
              <Upload className="h-4 w-4" aria-hidden />
              {busy ? t('uploading.processing') : t('common.submit')}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}