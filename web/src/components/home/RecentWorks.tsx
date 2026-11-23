import { useTranslation } from 'react-i18next'
import { ChevronRight, Film } from 'lucide-react'
import VideoCard from '@/components/works/VideoCard'
import type { Video } from '@/types'

interface Props {
  videos: Video[]
  onOpenWorks: () => void
  onOpenVideo: (video: Video) => void
}

/** 最近作品：最多 4 条（2×2 预览卡），标题行含「全部作品」入口 */
export default function RecentWorks({ videos, onOpenWorks, onOpenVideo }: Props) {
  const { t } = useTranslation()
  const recent = videos.slice(0, 4)

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--text))]">
          <Film className="h-4 w-4 text-[rgb(var(--text-3))]" aria-hidden />
          {t('home.recentWorks')}
        </span>
        {videos.length > 0 && (
          <button
            type="button"
            onClick={onOpenWorks}
            className="flex items-center gap-0.5 text-xs font-medium text-[rgb(var(--text-2))] hover:text-[rgb(var(--accent))]"
          >
            {t('common.viewAll')}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>

      {recent.length === 0 ? (
        <p className="py-10 text-center text-xs text-[rgb(var(--text-3))]">{t('home.noWorks')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recent.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onOpen={() => onOpenVideo(video)}
              onDelete={onOpenWorks}
              onRename={onOpenWorks}
              onRetry={onOpenWorks}
              onShare={onOpenWorks}
              onDownload={onOpenWorks}
            />
          ))}
        </div>
      )}
    </div>
  )
}
