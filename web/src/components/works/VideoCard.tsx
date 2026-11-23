import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  Clock,
  Download,
  Loader2,
  Pencil,
  Play,
  RefreshCw,
  Share2,
  Trash2,
} from 'lucide-react'
import { cn, formatDateTime, formatDuration } from '@/lib/utils'
import type { Video } from '@/types'
import StatusBadge from '@/components/ui/StatusBadge'

interface Props {
  video: Video
  onOpen: () => void
  onDelete: () => void
  onRename: () => void
  onRetry: () => void
  onShare: () => void
  onDownload: () => void
  busy?: boolean
}

/** 作品卡：16:9 预览 + 状态徽标 + hover 操作条（设计体系 §1.6 预览框） */
export default function VideoCard({
  video,
  onOpen,
  onDelete,
  onRename,
  onRetry,
  onShare,
  onDownload,
  busy,
}: Props) {
  const { t } = useTranslation()
  const [broken, setBroken] = useState(false)
  const ready = video.status === 'success'
  const active = video.status === 'queued' || video.status === 'processing'
  const cover = video.thumb_url
  const playable = ready && !!(video.stream_url || video.download_url)

  return (
    <div className="card group overflow-hidden transition-colors hover:border-[rgb(var(--hairline-strong))]">
      <div className="preview-frame aspect-video rounded-none">
        {playable && !broken ? (
          <video
            src={video.stream_url ?? undefined}
            poster={cover ?? undefined}
            muted
            playsInline
            preload="metadata"
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
          />
        ) : cover && !broken ? (
          <img
            src={cover}
            alt=""
            onError={() => setBroken(true)}
            className={cn('h-full w-full object-cover', active && 'opacity-70')}
          />
        ) : (
          <div className="stage-light flex h-full w-full items-center justify-center text-white/25">
            <Play className="h-8 w-8" aria-hidden />
          </div>
        )}

        {/* 顶部渐变遮罩，仅用于状态徽标可读性 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/55 to-transparent" />

        <div className="absolute left-2 top-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge kind="video" status={video.status} />
          {video.status === 'queued' && video.queue_position != null && (
            <span className="badge-neutral bg-black/55 text-white/80">
              <Clock className="h-3 w-3" aria-hidden />
              {t('works.queuePosition', { n: video.queue_position })}
            </span>
          )}
        </div>

        {/* 失败原因（就近展示） */}
        {video.status === 'failed' && (
          <div className="absolute inset-x-0 bottom-0 p-2.5 preview-scrim">
            <p className="line-clamp-2 text-[11px] leading-snug text-white/85">
              {video.error_message || t('fail.unknown')}
            </p>
          </div>
        )}

        {/* 处理中进度 */}
        {active && (
          <div className="absolute inset-x-0 bottom-0 p-2.5 preview-scrim">
            <div className="mb-1 flex items-center justify-between text-[11px] text-white/80">
              <span className="flex items-center gap-1">
                {video.status === 'queued' ? (
                  <Clock className="h-3 w-3" aria-hidden />
                ) : (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                )}
                {t(`works.status${video.status.charAt(0).toUpperCase()}${video.status.slice(1)}`)}
              </span>
              {video.status === 'processing' && (
                <span className="num">{t('works.progress', { n: Math.round(video.progress) })}</span>
              )}
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/20">
              {video.status === 'processing' ? (
                <div
                  className="h-full bg-white/85 transition-[width] duration-500"
                  style={{ width: `${Math.min(100, Math.max(2, video.progress))}%` }}
                />
              ) : (
                <div className="h-full w-1/3 animate-progress bg-white/70" />
              )}
            </div>
          </div>
        )}

        {/* 播放按钮 */}
        {playable && video.status === 'success' && (
          <button
            type="button"
            onClick={onOpen}
            className="absolute inset-0 flex items-center justify-center focus-visible:outline-none"
            aria-label={`${t('works.play')} ${video.title}`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/92 text-[rgb(20_20_19)] transition-transform group-hover:scale-105">
              <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden />
            </span>
          </button>
        )}

        {/* 失败卡整体可点重试入口 */}
        {video.status === 'failed' && (
          <button
            type="button"
            onClick={onRetry}
            disabled={busy}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={t('fail.retry')}
          >
            <RefreshCw className="h-5 w-5" aria-hidden />
            <span className="text-xs font-medium">{t('fail.retry')}</span>
          </button>
        )}

        {/* hover 操作条 */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 p-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="pointer-events-auto flex items-center gap-1 rounded-md bg-black/55 p-1">
            {ready && (
              <>
                <button
                  type="button"
                  onClick={onDownload}
                  disabled={!video.download_url}
                  className="rounded p-1.5 text-white/80 hover:bg-white/15 hover:text-white disabled:opacity-40"
                  aria-label={t('works.download')}
                  title={t('works.download')}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onShare}
                  className="rounded p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
                  aria-label={t('common.share')}
                  title={t('common.share')}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {video.status === 'failed' && (
              <button
                type="button"
                onClick={onRetry}
                disabled={busy}
                className="rounded p-1.5 text-white/80 hover:bg-white/15 hover:text-white disabled:opacity-40"
                aria-label={t('fail.retry')}
                title={t('fail.retry')}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onRename}
              className="rounded p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
              aria-label={t('works.rename')}
              title={t('works.rename')}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded p-1.5 text-white/80 hover:bg-white/15 hover:text-[rgb(var(--danger))]"
              aria-label={t('common.delete')}
              title={t('common.delete')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpen}
            className="block w-full truncate text-left text-sm font-medium text-[rgb(var(--text))] hover:text-[rgb(var(--accent))]"
            title={video.title}
          >
            {video.title}
          </button>
          <div className="num mt-0.5 flex items-center gap-2 text-[11px] text-[rgb(var(--text-3))]">
            <span>{formatDateTime(video.created_at)}</span>
            {video.duration_ms != null && <span>· {formatDuration(video.duration_ms)}</span>}
          </div>
        </div>
        {video.status === 'failed' && (
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[rgb(var(--danger))]" aria-hidden />
        )}
      </div>
    </div>
  )
}
