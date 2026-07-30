import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Play, Pause, Plus, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Avatar } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  avatar: Avatar
  onDelete: () => void
  onClick?: () => void
}

export default function AvatarCard({ avatar, onDelete, onClick }: Props) {
  const { t, i18n } = useTranslation()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!avatar.videoUrl || !videoRef.current) return
    if (playing) {
      videoRef.current.pause()
      setPlaying(false)
    } else {
      videoRef.current.currentTime = 0
      videoRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => {})
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'group card overflow-hidden cursor-pointer card-shine',
        'transition-all duration-300 ease-out-expo',
        'hover:-translate-y-1 hover:shadow-lg hover:border-[rgb(var(--border-2))]',
      )}
    >
      <div className="relative aspect-video bg-ink-950 overflow-hidden">
        {avatar.videoUrl ? (
          <video
            ref={videoRef}
            src={avatar.videoUrl}
            muted
            playsInline
            preload="metadata"
            loop
            className={cn(
              'w-full h-full object-cover transition-transform duration-700',
              'group-hover:scale-110',
            )}
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <img
            src={avatar.thumbUrl}
            alt={avatar.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        )}

        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />

        {/* Hover 时显示播放/使用按钮 */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-all duration-300',
            playing
              ? 'opacity-100 bg-black/20 backdrop-blur-[2px]'
              : 'opacity-0 group-hover:opacity-100',
          )}
        >
          {avatar.videoUrl && (
            <button
              onClick={togglePlay}
              className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
            >
              {playing ? (
                <Pause className="w-4 h-4 text-brand-600" />
              ) : (
                <Play className="w-4 h-4 text-brand-600 fill-current ml-0.5" />
              )}
            </button>
          )}
        </div>

        {/* 标签 */}
        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <span className="px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-md text-white text-2xs font-medium ring-1 ring-white/20">
            {i18n.language.startsWith('zh') ? '数字人' : 'Avatar'}
          </span>
        </div>
      </div>

      <div className="px-3.5 py-2.5">
        <div className="font-medium text-sm truncate" title={avatar.title}>
          {avatar.title}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <div className="text-xs text-[rgb(var(--text-muted))] flex items-center gap-1 num">
            <Calendar className="w-3 h-3" />
            {formatDate(avatar.date)}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClick?.()
              }}
              className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-2xs px-1.5 py-0.5 rounded-md text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 flex items-center gap-0.5"
              title={t('quick.useAsTemplate')}
            >
              <Plus className="w-3 h-3" />
              {i18n.language.startsWith('zh') ? '使用' : 'Use'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-1 rounded-md text-[rgb(var(--text-muted))] hover:bg-danger-50 hover:text-danger-500 dark:hover:bg-danger-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
