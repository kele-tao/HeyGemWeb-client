import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Film, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/api'
import { ApiError } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import { useProjectStore } from '@/store/useProjectStore'
import VideoCard from '@/components/works/VideoCard'
import VideoPlayerModal from '@/components/modals/VideoPlayerModal'
import FailDiagnoseModal from '@/components/modals/FailDiagnoseModal'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import EmptyState from '@/components/feedback/EmptyState'
import RenameDialog from '@/components/ui/RenameDialog'
import SearchFilter, { type StatusFilter } from '@/components/feedback/SearchFilter'
import { GridSkeleton } from '@/components/feedback/Skeleton'
import { downloadVideo, shareVideo } from '@/lib/videoActions'
import type { Video } from '@/types'

export default function WorksPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const videos = useAppStore((s) => s.videos)
  const isDataLoaded = useAppStore((s) => s.isDataLoaded)
  const avatars = useAppStore((s) => s.avatars)
  const removeVideo = useAppStore((s) => s.removeVideo)
  const upsertVideo = useAppStore((s) => s.upsertVideo)
  const setProject = useProjectStore((s) => s.setProject)
  const resetProject = useProjectStore((s) => s.resetProject)

  const [playing, setPlaying] = useState<Video | null>(null)
  const [failTarget, setFailTarget] = useState<Video | null>(null)
  const [toDelete, setToDelete] = useState<Video | null>(null)
  const [toRename, setToRename] = useState<Video | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = videos
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((v) => v.title.toLowerCase().includes(q))
    }
    if (status !== 'all') list = list.filter((v) => v.status === status)
    return list
  }, [videos, search, status])

  const startNew = () => {
    if (avatars.length === 0) {
      toast.error(t('notify.avatarFirst'))
      navigate('/avatars')
      return
    }
    resetProject()
    setProject({ id: `proj-${Date.now()}`, avatarId: avatars[0].id })
    navigate('/editor')
  }

  const handleOpen = (video: Video) => {
    if (video.status === 'success') {
      if (video.stream_url) setPlaying(video)
      else toast.error(t('works.noStream'))
      return
    }
    if (video.status === 'failed') {
      setFailTarget(video)
      return
    }
    navigate('/works')
    toast(t('works.statusProcessing'), { icon: '⏳' })
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setBusyId(toDelete.id)
    try {
      await api.videos.remove(toDelete.id)
      removeVideo(toDelete.id)
      toast.success(t('works.deleteSuccess'))
      setToDelete(null)
    } catch (err) {
      const e = err as ApiError
      toast.error(e.message || t('notify.networkError'))
    } finally {
      setBusyId(null)
    }
  }

  const handleRename = async (title: string) => {
    if (!toRename) return
    setBusyId(toRename.id)
    try {
      const next = await api.videos.update(toRename.id, title)
      upsertVideo(next)
      toast.success(t('works.renameSuccess'))
      setToRename(null)
    } catch (err) {
      const e = err as ApiError
      toast.error(e.message || t('notify.networkError'))
    } finally {
      setBusyId(null)
    }
  }

  const handleRetry = async (video: Video) => {
    setBusyId(video.id)
    try {
      const next = await api.videos.retry(video.id)
      upsertVideo(next)
      toast.success(t('works.retrySuccess'))
      setFailTarget(null)
    } catch (err) {
      const e = err as ApiError
      toast.error(e.message || t('notify.networkError'))
    } finally {
      setBusyId(null)
    }
  }

  const handleShare = async (video: Video) => {
    try {
      const result = await shareVideo(video.id)
      upsertVideo({ ...video, share_url: result.share_url })
      toast.success(t('works.shareSuccess'))
    } catch (err) {
      const e = err as ApiError
      toast.error(e.message || t('notify.networkError'))
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-5 md:px-5 lg:px-6 lg:py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[rgb(var(--text))]">
            {t('works.title')}
          </h1>
          <p className="num mt-1 text-[13px] text-[rgb(var(--text-3))]">
            {t('works.subtitle', { total: videos.length })}
          </p>
        </div>
        <button type="button" onClick={startNew} className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden />
          {t('nav.createVideo')}
        </button>
      </div>

      {videos.length > 0 && (
        <SearchFilter
          search={search}
          onSearch={setSearch}
          status={status}
          onStatus={setStatus}
          showStatus
        />
      )}

      {!isDataLoaded ? (
        <GridSkeleton count={8} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Film className="h-6 w-6" />}
            title={videos.length === 0 ? t('works.emptyTitle') : t('works.emptyFiltered')}
            description={videos.length === 0 ? t('works.emptyDesc') : t('works.emptyFilteredDesc')}
            action={
              videos.length === 0 ? (
                <button type="button" onClick={startNew} className="btn-primary">
                  <Plus className="h-4 w-4" aria-hidden />
                  {t('nav.createVideo')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setStatus('all')
                  }}
                  className="btn-secondary"
                >
                  {t('works.clearFilter')}
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              busy={busyId === v.id}
              onOpen={() => handleOpen(v)}
              onDelete={() => setToDelete(v)}
              onRename={() => setToRename(v)}
              onRetry={() => handleRetry(v)}
              onShare={() => handleShare(v)}
              onDownload={() => downloadVideo(v)}
            />
          ))}
        </div>
      )}

      <VideoPlayerModal
        video={playing}
        onClose={() => setPlaying(null)}
        onDownload={() => playing && downloadVideo(playing)}
      />
      <FailDiagnoseModal
        video={failTarget}
        busy={!!failTarget && busyId === failTarget.id}
        onClose={() => setFailTarget(null)}
        onRetry={() => failTarget && handleRetry(failTarget)}
      />
      <ConfirmDialog
        open={!!toDelete}
        title={t('works.deleteTitle')}
        message={t('works.deleteMessage')}
        confirmText={t('common.delete')}
        loading={!!toDelete && busyId === toDelete.id}
        onCancel={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
      <RenameDialog
        open={!!toRename}
        title={t('works.renameTitle')}
        label={t('works.renameLabel')}
        initialValue={toRename?.title ?? ''}
        submitting={!!toRename && busyId === toRename.id}
        onCancel={() => setToRename(null)}
        onSubmit={handleRename}
      />
    </div>
  )
}