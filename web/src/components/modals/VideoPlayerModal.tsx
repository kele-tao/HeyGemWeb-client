import { useTranslation } from 'react-i18next'
import { Download, Calendar, Film } from 'lucide-react'
import Modal from '@/components/feedback/Modal'
import { formatDate } from '@/lib/utils'
import type { GeneratedVideo } from '@/types'

interface Props {
  video: GeneratedVideo | null
  onClose: () => void
}

export default function VideoPlayerModal({ video, onClose }: Props) {
  const { t } = useTranslation()
  if (!video) return null

  return (
    <Modal
      open={!!video}
      onClose={onClose}
      size="2xl"
      hideClose
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px]">
        <div className="bg-black aspect-video flex items-center justify-center">
          {video.videoUrl ? (
            <video
              src={video.videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-white/60 flex items-center gap-2">
              <Film className="w-5 h-5" />
              {t('works.status.processing')}
            </div>
          )}
        </div>

        <div className="p-6 flex flex-col">
          <div className="flex-1">
            <h2 className="text-lg font-semibold break-words mb-3">
              {video.title}
            </h2>
            <div className="text-xs text-[rgb(var(--text-muted))] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {t('editor.title').includes('Title') ? 'Date' : '创建日期'}: {formatDate(video.date)}
            </div>
          </div>

          <div className="space-y-2 mt-6">
            {video.videoUrl && (
              <a
                href={video.videoUrl}
                download={`${video.title || 'video'}.mp4`}
                className="btn-primary w-full"
              >
                <Download className="w-4 h-4" />
                {t('common.download')}
              </a>
            )}
            <button onClick={onClose} className="btn-secondary w-full">
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
