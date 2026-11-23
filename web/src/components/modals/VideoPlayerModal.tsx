import { useTranslation } from 'react-i18next'
import { Download, Film } from 'lucide-react'
import Modal from '@/components/feedback/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatDateTime, formatDuration } from '@/lib/utils'
import type { Video } from '@/types'

interface Props {
  video: Video | null
  onClose: () => void
  onDownload: () => void
}

export default function VideoPlayerModal({ video, onClose, onDownload }: Props) {
  const { t } = useTranslation()
  if (!video) return null

  return (
    <Modal open={!!video} onClose={onClose} size="2xl" hideClose>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px]">
        <div className="flex aspect-video items-center justify-center bg-[rgb(var(--preview))]">
          {video.stream_url ? (
            <video
              src={video.stream_url}
              controls
              autoPlay
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Film className="h-4 w-4" aria-hidden />
              {t('works.noStream')}
            </div>
          )}
        </div>

        <div className="flex flex-col p-5">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge kind="video" status={video.status} />
            </div>
            <h2 className="break-words text-lg font-semibold text-[rgb(var(--text))]">
              {video.title}
            </h2>
            <div className="num mt-2 space-y-1 text-[11px] text-[rgb(var(--text-3))]">
              <div>{formatDateTime(video.created_at)}</div>
              {video.duration_ms != null && <div>{formatDuration(video.duration_ms)}</div>}
            </div>
            {video.error_message && (
              <p className="mt-3 rounded-md border border-[rgb(var(--danger))]/20 bg-[rgb(var(--danger))]/8 p-2 text-[11px] text-[rgb(var(--danger))]">
                {video.error_message}
              </p>
            )}
          </div>

          <div className="mt-5 space-y-2">
            {video.download_url && (
              <button type="button" onClick={onDownload} className="btn-primary w-full">
                <Download className="h-4 w-4" aria-hidden />
                {t('works.download')}
              </button>
            )}
            <button type="button" onClick={onClose} className="btn-secondary w-full">
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
