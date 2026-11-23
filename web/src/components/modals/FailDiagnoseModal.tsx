import { useTranslation } from 'react-i18next'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import Modal from '@/components/feedback/Modal'
import type { Video } from '@/types'

interface Props {
  video: Video | null
  onClose: () => void
  onRetry: () => void
  busy?: boolean
}

/** 失败诊断：直接展示服务端下发的 error_code / error_message，并提供一键重试 */
export default function FailDiagnoseModal({ video, onClose, onRetry, busy }: Props) {
  const { t } = useTranslation()
  if (!video) return null

  return (
    <Modal open={!!video} onClose={onClose} title={t('fail.title')} size="md">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-[rgb(var(--danger))]/25 bg-[rgb(var(--danger))]/10 text-[rgb(var(--danger))]">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{video.title}</div>
            <div className="mt-0.5 text-[11px] text-[rgb(var(--text-3))]">
              {video.error_code ?? t('fail.unknown')}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 text-xs font-medium text-[rgb(var(--text-2))]">
            {t('fail.reason')}
          </div>
          <div className="rounded-md border border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] p-3 text-sm leading-relaxed text-[rgb(var(--text-2))]">
            {video.error_message || t('fail.unknown')}
          </div>
          <p className="mt-2 text-[11px] text-[rgb(var(--text-3))]">{t('fail.hint')}</p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            {t('common.close')}
          </button>
          <button type="button" onClick={onRetry} disabled={busy} className="btn-primary">
            <RefreshCw className="h-4 w-4" aria-hidden />
            {t('fail.retry')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
