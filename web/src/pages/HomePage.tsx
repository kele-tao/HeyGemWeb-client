import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2, Plus } from 'lucide-react'
import { useAppStore, bootstrapData } from '@/store/useAppStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useProjectStore } from '@/store/useProjectStore'
import PageHeader from '@/components/home/PageHeader'
import StatsRow from '@/components/home/StatsRow'
import QuickEntries from '@/components/home/QuickEntries'
import WeeklyPace from '@/components/home/WeeklyPace'
import RecentWorks from '@/components/home/RecentWorks'
import FirstRunEmpty from '@/components/home/FirstRunEmpty'
import VideoPlayerModal from '@/components/modals/VideoPlayerModal'
import { StatsSkeleton } from '@/components/feedback/Skeleton'
import { downloadVideo } from '@/lib/videoActions'
import type { Video } from '@/types'

/**
 * 工作台首页（设计体系 §五）：
 * PageHeader + StatsRow + MainGrid（最近作品 2 列 / 快捷入口 + 近 7 天）+ 首屏空状态。
 * 统计口径优先用 bootstrap.stats。
 */
export default function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const stats = useAppStore((s) => s.stats)
  const videos = useAppStore((s) => s.videos)
  const avatars = useAppStore((s) => s.avatars)
  const voices = useAppStore((s) => s.voices)
  const isLoading = useAppStore((s) => s.isLoading)
  const loadError = useAppStore((s) => s.loadError)
  const resetProject = useProjectStore((s) => s.resetProject)
  const setProject = useProjectStore((s) => s.setProject)
  const [playing, setPlaying] = useState<Video | null>(null)

  const firstRun = useMemo(
    () => avatars.length === 0 && voices.length === 0 && videos.length === 0,
    [avatars.length, voices.length, videos.length],
  )

  const startNew = () => {
    if (avatars.length === 0) {
      navigate('/avatars')
      return
    }
    resetProject()
    setProject({ id: `proj-${Date.now()}`, avatarId: avatars[0].id })
    navigate('/editor')
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-5 lg:px-6">
        <div className="card mx-auto max-w-lg p-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-[rgb(var(--danger))]/25 bg-[rgb(var(--danger))]/10 text-[rgb(var(--danger))]">
            <AlertCircle className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold">{t('home.loadFailTitle')}</h2>
          <p className="mt-1.5 text-sm text-[rgb(var(--text-3))]">{t('home.loadFailDesc')}</p>
          <p className="mt-2 break-words text-[11px] text-[rgb(var(--text-3))]">{loadError}</p>
          <button
            type="button"
            onClick={() => void bootstrapData()}
            className="btn-primary mx-auto mt-4"
          >
            <Loader2 className={`h-4 w-4 ${isLoading ? 'animate-spin' : 'hidden'}`} aria-hidden />
            {t('home.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-5 md:px-5 lg:px-6 lg:py-6">
      <PageHeader
        email={user?.email}
        hasAvatar={avatars.length > 0}
        onCreate={startNew}
        onCreateAvatar={() => navigate('/avatars')}
      />

      {firstRun ? (
        <FirstRunEmpty
          onCreateAvatar={() => navigate('/avatars')}
          onViewWorks={() => navigate('/works')}
        />
      ) : (
        <>
          {isLoading ? <StatsSkeleton /> : <StatsRow stats={stats} />}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RecentWorks
                videos={videos}
                onOpenWorks={() => navigate('/works')}
                onOpenVideo={(video) => {
                  if (video.status === 'success') setPlaying(video)
                  else navigate('/works')
                }}
              />
            </div>
            <div className="space-y-4">
              <QuickEntries />
              <WeeklyPace videos={videos} />
            </div>
          </div>

          {videos.length === 0 && (
            <div className="mt-4">
              <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[rgb(var(--text))]">
                    {t('home.noWorks')}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[rgb(var(--text-3))]">
                    {t('home.noWorksDesc')}
                  </div>
                </div>
                <button type="button" onClick={startNew} className="btn-primary">
                  <Plus className="h-4 w-4" aria-hidden />
                  {t('nav.createVideo')}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <VideoPlayerModal
        video={playing}
        onClose={() => setPlaying(null)}
        onDownload={() => playing && downloadVideo(playing)}
      />
    </div>
  )
}
