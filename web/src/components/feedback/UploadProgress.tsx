import { useTranslation } from 'react-i18next'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

export type UploadPhase = 'uploading' | 'processing' | 'ready' | 'failed'

interface Props {
  /** 上传阶段的真实进度 0-100（XHR 提供），无则为 null */
  percent: number | null
  phase: UploadPhase
  /** 服务端处理阶段的提示文案 */
  hint?: string
  /** 失败原因 */
  errorMessage?: string | null
}

/**
 * 上传 / 处理进度：上传阶段用真实 XHR 百分比，处理阶段是服务端无阶段百分比，
 * 因此只用不定式进度条 + 文案提示（不伪造进度）。
 */
export default function UploadProgress({ percent, phase, hint, errorMessage }: Props) {
  const { t } = useTranslation()

  if (phase === 'failed') {
    return (
      <div className="flex items-start gap-2 rounded-md border border-[rgb(var(--danger))]/25 bg-[rgb(var(--danger))]/10 p-3 text-xs text-[rgb(var(--danger))]">
        <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
        <div className="min-w-0">
          <div className="font-medium">{t('uploading.failed')}</div>
          {errorMessage && <div className="mt-0.5 break-words opacity-90">{errorMessage}</div>}
        </div>
      </div>
    )
  }

  if (phase === 'ready') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-[rgb(var(--success))]/25 bg-[rgb(var(--success))]/10 p-3 text-xs text-[rgb(var(--success))]">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-hidden />
        <span className="font-medium">{t('uploading.ready')}</span>
      </div>
    )
  }

  const isUploading = phase === 'uploading'
  const value = percent == null ? null : Math.min(100, Math.max(0, percent))

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-2))]">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[rgb(var(--accent))]" aria-hidden />
        <span className="font-medium">
          {isUploading ? t('uploading.uploading') : t('uploading.processing')}
        </span>
        {isUploading && value != null && <span className="num ml-auto">{Math.round(value)}%</span>}
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[rgb(var(--surface-3))]">
        {isUploading && value != null ? (
          <div
            className="h-full bg-[rgb(var(--accent))] transition-[width] duration-200"
            style={{ width: `${value}%` }}
          />
        ) : (
          <div className="h-full w-1/3 animate-progress bg-[rgb(var(--accent))]" />
        )}
      </div>
      {hint && <p className="text-[11px] text-[rgb(var(--text-3))]">{hint}</p>}
    </div>
  )
}