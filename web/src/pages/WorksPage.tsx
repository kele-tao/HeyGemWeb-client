import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Film } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { useProjectStore } from '@/store/useProjectStore'
import VideoCard from '@/components/works/VideoCard'
import VideoPlayerModal from '@/components/modals/VideoPlayerModal'
import FailDiagnoseModal from '@/components/modals/FailDiagnoseModal'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import EmptyState from '@/components/feedback/EmptyState'
import SearchFilter, { type VideoStatusFilter } from '@/components/feedback/SearchFilter'
import type { GeneratedVideo } from '@/types'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  { key: '', label: '全部', emoji: '📋' },
  { key: 'product', label: '产品', emoji: '🆕' },
  { key: 'marketing', label: '营销', emoji: '🔥' },
  { key: 'course', label: '教程', emoji: '📚' },
  { key: 'knowledge', label: '科普', emoji: '🧠' },
  { key: 'festival', label: '节日', emoji: '🎊' },
  { key: 'story', label: '故事', emoji: '⭐' },
  { key: 'other', label: '其他', emoji: '📦' },
]

export default function WorksPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const videos = useAppStore((s) => s.videos)
  const avatars = useAppStore((s) => s.avatars)
  const removeVideo = useAppStore((s) => s.removeVideo)
  const setProject = useProjectStore((s) => s.setProject)
  const resetProject = useProjectStore((s) => s.resetProject)
  const getAvatarById = useAppStore((s) => s.getAvatarById)

  const [playing, setPlaying] = useState<GeneratedVideo | null>(null)
  const [toDelete, setToDelete] = useState<string | null>(null)
  const [failTarget, setFailTarget] = useState<GeneratedVideo | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VideoStatusFilter>('all')
  const [category, setCategory] = useState('')

  const filtered = useMemo(() => {
    let list = videos
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((v) => v.title.toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') {
      list = list.filter((v) => v.status === statusFilter)
    }
    if (category) {
      list = list.filter((v) => (v.category || 'other') === category)
    }
    return list
  }, [videos, search, statusFilter, category])

  const startNew = () => {
    if (avatars.length === 0) {
      toast.error(t('notify.avatarFirst'))
      navigate('/avatars')
      return
    }
    resetProject()
    setProject({
      id: `proj-${Date.now()}`,
      title: i18n.language.startsWith('zh')
        ? `我的数字人视频 ${new Date().toLocaleDateString()}`
        : `My Video ${new Date().toLocaleDateString()}`,
      avatarId: avatars[0].id,
      script: i18n.language.startsWith('zh')
        ? '你好,欢迎使用 HeyGem 数字人创作平台。'
        : 'Hello, welcome to HeyGem.',
    })
    navigate('/editor')
  }

  const handleRetry = (v: GeneratedVideo) => {
    const avatar = getAvatarById(v.avatarId)
    if (!avatar) {
      toast.error(t('notify.avatarFirst'))
      return
    }
    resetProject()
    setProject({
      id: `proj-${Date.now()}`,
      title: v.title,
      avatarId: v.avatarId,
      script: '',
    })
    navigate('/editor')
    toast(t('common.retry'), { icon: '🔄' })
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {t('works.myWorks')}
          </h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-1.5 num">
            {i18n.language.startsWith('zh')
              ? `共 ${videos.length} 个作品,${filtered.length} 个匹配`
              : `${videos.length} total, ${filtered.length} shown`}
          </p>
        </div>
        <button onClick={startNew} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('home.createVideo')}
        </button>
      </div>

      {videos.length > 0 && (
        <>
          <SearchFilter
            search={search}
            onSearch={setSearch}
            status={statusFilter}
            onStatus={setStatusFilter}
            showStatus
          />
          {/* 分类筛选条 */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-none -mx-1 px-1">
            {CATEGORIES.map((c) => {
              const active = category === c.key
              return (
                <button
                  key={c.key || 'all'}
                  onClick={() => setCategory(c.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5',
                    active
                      ? 'bg-aurora-1 text-white shadow-glow'
                      : 'bg-[rgb(var(--surface-2))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--border))]',
                  )}
                >
                  <span>{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {filtered.length === 0 ? (
        videos.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Film className="w-9 h-9" />}
              title={t('works.noWorks')}
              description={t('home.welcomeDesc')}
              action={
                <button onClick={startNew} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  {t('home.createVideo')}
                </button>
              }
            />
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={<Film className="w-9 h-9" />}
              title={t('filter.noResult')}
              description={
                i18n.language.startsWith('zh')
                  ? '试试调整搜索关键词或筛选条件'
                  : 'Try adjusting your search or filters'
              }
              action={
                <button
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('all')
                  }}
                  className="btn-secondary"
                >
                  {t('filter.clearFilter')}
                </button>
              }
            />
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              onOpen={() => {
                if (v.status === 'success' && v.videoUrl) setPlaying(v)
                else if (v.status === 'failed') setFailTarget(v)
                else
                  toast(
                    i18n.language.startsWith('zh')
                      ? '视频仍在处理中'
                      : 'Still processing',
                    { icon: '⏳' },
                  )
              }}
              onDelete={() => setToDelete(v.id)}
              onFailClick={() => setFailTarget(v)}
            />
          ))}
        </div>
      )}

      <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />
      <FailDiagnoseModal
        video={failTarget}
        onClose={() => setFailTarget(null)}
        onRetry={() => failTarget && handleRetry(failTarget)}
      />

      <ConfirmDialog
        open={!!toDelete}
        title={t('modal.confirmDelete')}
        message={t('modal.deleteVideoMsg')}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) removeVideo(toDelete)
          setToDelete(null)
          toast.success(t('modal.deleteSuccess'))
        }}
      />
    </div>
  )
}
