import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  Pause,
  Trash2,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Plus,
  Download,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { useProjectStore } from '@/store/useProjectStore'
import type { GeneratedVideo } from '@/types'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Props {
  video: GeneratedVideo
  onOpen: () => void
  onDelete: () => void
  onFailClick?: () => void
}

export default function VideoCard({ video, onOpen, onDelete, onFailClick }: Props) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const setProject = useProjectStore((s) => s.setProject)
  const resetProject = useProjectStore((s) => s.resetProject)
  const getAvatarById = useAppStore((s) => s.getAvatarById)
  const avatar = getAvatarById(video.avatarId)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [hovering, setHovering] = useState(false)
  const [previewing, setPreviewing] = useState(false)

  const isReady = video.status === 'success' && video.videoUrl

  const statusInfo: Record<
    GeneratedVideo['status'],
    { label: string; icon: React.ReactNode; className: string }
  > = {
    queued: {
      label: t('works.status.queued'),
      icon: <Clock className="w-3 h-3" />,
      className: 'badge-info',
    },
    processing: {
      label: t('works.status.processing'),
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      className: 'badge-warning',
    },
    success: {
      label: t('works.status.success'),
      icon: <CheckCircle2 className="w-3 h-3" />,
      className: 'badge-success',
    },
    failed: {
      label: t('works.status.failed'),
      icon: <AlertCircle className="w-3 h-3" />,
      className: 'badge-danger',
    },
  }

  const info = statusInfo[video.status]
  const previewSrc = isReady ? video.videoUrl! : avatar?.videoUrl

  const onMouseEnter = () => {
    setHovering(true)
    if (previewSrc && videoRef.current) {
      videoRef.current.currentTime = 0
      const playPromise = videoRef.current.play()
      if (playPromise) {
        playPromise
          .then(() => setPreviewing(true))
          .catch(() => setPreviewing(false))
      }
    }
  }
  const onMouseLeave = () => {
    setHovering(false)
    setPreviewing(false)
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }
  const onVideoError = () => {
    setPreviewing(false)
  }

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!video.videoUrl) return
    const url = window.location.origin + video.videoUrl
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success(t('notify.linkCopied')))
      .catch(() => {})
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!video.videoUrl) return
    const a = document.createElement('a')
    // 文件名格式: HeyGem_标题_任务号_日期.mp4
    const safeTitle = (video.title || 'video')
      .replace(/[\\/:*?"<>|]/g, '_')
      .slice(0, 30)
    const date = video.date || new Date().toISOString().slice(0, 10)
    const code = (video.task_code || '').slice(0, 8)
    a.download = `HeyGem_${safeTitle}_${code}_${date}.mp4`
    a.href = video.videoUrl
    a.click()
  }

  const handleReCreate = (e: React.MouseEvent) => {
    e.stopPropagation()
    resetProject()
    setProject({
      id: `proj-${Date.now()}`,
      title: video.title,
      avatarId: video.avatarId,
      script: '',
      audioUrl: null,
      videoUrl: null,
    })
    navigate('/editor')
  }

  return (
    <div
      className={cn(
        'group card overflow-hidden cursor-pointer card-shine',
        'transition-all duration-300 ease-out-expo',
        'hover:-translate-y-1 hover:shadow-lg hover:border-[rgb(var(--border-2))]',
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onOpen}
    >
      <div className="relative aspect-video bg-ink-950 overflow-hidden">
        {previewSrc ? (
          <video
            ref={videoRef}
            src={previewSrc}
            muted
            playsInline
            preload="metadata"
            onError={onVideoError}
            className={cn(
              'w-full h-full object-cover transition-all duration-700',
              isReady && hovering ? 'scale-110' : 'scale-100',
              isReady ? '' : 'opacity-80',
            )}
          />
        ) : video.thumbUrl ? (
          <img
            src={video.thumbUrl}
            alt={video.title}
            className="w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-ink-800 to-ink-900" />
        )}

        {/* 顶部光晕渐变(深色视频上更清晰) */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

        {/* 状态徽标左上 */}
        <div className="absolute top-2.5 left-2.5">
          <span className={cn(info.className, 'backdrop-blur-md')}>
            {info.icon}
            {info.label}
          </span>
        </div>

        {/* 完成态播放按钮(默认显示) */}
        {isReady && !hovering && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/30 via-transparent to-transparent">
            <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Play className="w-5 h-5 text-brand-600 fill-current ml-0.5" />
            </div>
          </div>
        )}

        {/* Hover 时的暂停/播放指示 */}
        {isReady && hovering && !previewing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
            <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-xl">
              <Pause className="w-5 h-5 text-brand-600" />
            </div>
          </div>
        )}

        {/* 失败状态(整卡可点诊断) */}
        {video.status === 'failed' && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onFailClick?.()
            }}
            className="absolute inset-0 bg-gradient-to-br from-danger-500/40 to-danger-900/60 hover:from-danger-500/60 hover:to-danger-900/80 transition-all flex flex-col items-center justify-center text-white p-4"
          >
            <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center mb-2 ring-2 ring-white/30">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold mb-1">{t('fail.title')}</div>
            <div className="text-xs text-white/80 underline">
              {t('fail.retry')} →
            </div>
          </button>
        )}

        {/* 处理中状态条 */}
        {(video.status === 'queued' || video.status === 'processing') && (
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3 pointer-events-none">
            <div className="text-white flex items-center gap-1.5 w-full">
              {info.icon}
              <span className="text-xs font-medium">{info.label}</span>
              {video.status === 'processing' && (
                <div className="ml-auto w-20 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-white/60 to-white animate-progress" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 固定可见的下载按钮(完成时) */}
        {isReady && (
          <button
            onClick={handleDownload}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg bg-black/50 backdrop-blur-md text-white hover:bg-brand-500 transition flex items-center justify-center shadow-md"
            title={t('common.download')}
            aria-label={t('common.download')}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Hover 才显示的次要操作(分享/重做) */}
        {isReady && (
          <div className="absolute top-2.5 right-12 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <button
              onClick={handleCopyLink}
              className="w-8 h-8 rounded-lg bg-black/50 backdrop-blur-md text-white hover:bg-info-500 transition flex items-center justify-center"
              title={t('notify.linkCopied')}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Hover 时底部操作条 */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 flex items-center justify-between p-2.5 pointer-events-none',
            'bg-gradient-to-t from-black/80 to-transparent',
            'transition-all duration-300',
            hovering ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
          )}
        >
          <div className="flex gap-1.5 pointer-events-auto">
            {isReady ? (
              <>
                <button
                  onClick={handleReCreate}
                  className="px-2.5 py-1 rounded-md bg-white text-brand-700 text-xs font-semibold hover:bg-brand-50 transition flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {i18n.language.startsWith('zh') ? '再做' : 'New'}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-md text-white text-xs font-medium hover:bg-white/25 transition"
                >
                  {t('common.download')}
                </button>
              </>
            ) : null}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="w-7 h-7 rounded-md bg-white/15 backdrop-blur-md text-white hover:bg-danger-500 transition flex items-center justify-center pointer-events-auto"
            aria-label={t('common.delete')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3.5 py-2.5 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate" title={video.title}>
            {video.title}
          </div>
          <div className="text-xs text-[rgb(var(--text-muted))] mt-0.5 num">
            {formatDate(video.date)}
          </div>
        </div>
      </div>
    </div>
  )
}
