import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, UserCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { useProjectStore } from '@/store/useProjectStore'
import AvatarCard from '@/components/works/AvatarCard'
import AvatarUploadModal from '@/components/modals/AvatarUploadModal'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import EmptyState from '@/components/feedback/EmptyState'
import SearchFilter from '@/components/feedback/SearchFilter'
import toast from 'react-hot-toast'

export default function AvatarsPage() {
  const { t, i18n } = useTranslation()
  const avatars = useAppStore((s) => s.avatars)
  const removeAvatar = useAppStore((s) => s.removeAvatar)
  const setProject = useProjectStore((s) => s.setProject)
  const resetProject = useProjectStore((s) => s.resetProject)
  const navigate = useNavigate()
  const [showUpload, setShowUpload] = useState(false)
  const [toDelete, setToDelete] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return avatars
    const q = search.toLowerCase()
    return avatars.filter((a) => a.title.toLowerCase().includes(q))
  }, [avatars, search])

  const handleUse = (avatarId: string) => {
    resetProject()
    setProject({
      id: `proj-${Date.now()}`,
      title: i18n.language.startsWith('zh')
        ? `我的数字人视频 ${new Date().toLocaleDateString()}`
        : `My Video ${new Date().toLocaleDateString()}`,
      avatarId,
      script: '',
    })
    navigate('/editor')
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {t('works.myAvatars')}
          </h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-1.5">
            {t('works.noAvatarsDesc')}
          </p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('home.customizeAvatar')}
        </button>
      </div>

      {avatars.length > 0 && (
        <SearchFilter
          search={search}
          onSearch={setSearch}
          status="all"
          onStatus={() => {}}
        />
      )}

      {filtered.length === 0 ? (
        avatars.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<UserCircle2 className="w-9 h-9" />}
              title={t('works.noAvatars')}
              description={t('works.noAvatarsDesc')}
              action={
                <button onClick={() => setShowUpload(true)} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  {t('home.customizeAvatar')}
                </button>
              }
            />
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={<UserCircle2 className="w-9 h-9" />}
              title={t('filter.noResult')}
              action={
                <button onClick={() => setSearch('')} className="btn-secondary">
                  {t('filter.clearFilter')}
                </button>
              }
            />
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <AvatarCard
              key={a.id}
              avatar={a}
              onDelete={() => setToDelete(a.id)}
              onClick={() => handleUse(a.id)}
            />
          ))}
        </div>
      )}

      <AvatarUploadModal open={showUpload} onClose={() => setShowUpload(false)} />

      <ConfirmDialog
        open={!!toDelete}
        title={t('modal.confirmDelete')}
        message={t('modal.deleteAvatarMsg')}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) removeAvatar(toDelete)
          setToDelete(null)
          toast.success(t('modal.deleteSuccess'))
        }}
      />
    </div>
  )
}
