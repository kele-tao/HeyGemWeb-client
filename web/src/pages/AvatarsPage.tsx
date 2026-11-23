import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, UserCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/api'
import { ApiError } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import { useProjectStore } from '@/store/useProjectStore'
import AvatarCard from '@/components/works/AvatarCard'
import AvatarUploadModal from '@/components/modals/AvatarUploadModal'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import EmptyState from '@/components/feedback/EmptyState'
import RenameDialog from '@/components/ui/RenameDialog'
import SearchFilter from '@/components/feedback/SearchFilter'
import { GridSkeleton } from '@/components/feedback/Skeleton'
import type { Avatar } from '@/types'

export default function AvatarsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const avatars = useAppStore((s) => s.avatars)
  const removeAvatar = useAppStore((s) => s.removeAvatar)
  const upsertAvatar = useAppStore((s) => s.upsertAvatar)
  const setProject = useProjectStore((s) => s.setProject)
  const resetProject = useProjectStore((s) => s.resetProject)
  const isDataLoaded = useAppStore((s) => s.isDataLoaded)

  const [showUpload, setShowUpload] = useState(false)
  const [toDelete, setToDelete] = useState<Avatar | null>(null)
  const [toRename, setToRename] = useState<Avatar | null>(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return avatars
    const q = search.trim().toLowerCase()
    return avatars.filter((a) => a.name.toLowerCase().includes(q))
  }, [avatars, search])

  const handleUse = (avatar: Avatar) => {
    resetProject()
    setProject({ id: `proj-${Date.now()}`, avatarId: avatar.id })
    navigate('/editor')
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setBusyId(toDelete.id)
    try {
      await api.avatars.remove(toDelete.id)
      removeAvatar(toDelete.id)
      toast.success(t('avatars.deleteSuccess'))
      setToDelete(null)
    } catch (err) {
      const e = err as ApiError
      toast.error(e.code === 'RESOURCE_IN_USE' ? t('avatars.inUse') : e.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleRename = async (name: string) => {
    if (!toRename) return
    setBusyId(toRename.id)
    try {
      const next = await api.avatars.update(toRename.id, name)
      upsertAvatar(next)
      toast.success(t('avatars.renameSuccess'))
      setToRename(null)
    } catch (err) {
      const e = err as ApiError
      toast.error(e.message || t('notify.networkError'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-5 md:px-5 lg:px-6 lg:py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[rgb(var(--text))]">
            {t('avatars.title')}
          </h1>
          <p className="mt-1 text-[13px] text-[rgb(var(--text-3))]">{t('avatars.subtitle')}</p>
        </div>
        <button type="button" onClick={() => setShowUpload(true)} className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden />
          {t('avatars.upload')}
        </button>
      </div>

      {avatars.length > 0 && (
        <SearchFilter search={search} onSearch={setSearch} status="all" onStatus={() => {}} />
      )}

      {!isDataLoaded ? (
        <GridSkeleton count={4} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<UserCircle2 className="h-6 w-6" />}
            title={avatars.length === 0 ? t('avatars.emptyTitle') : t('filter.noResult')}
            description={avatars.length === 0 ? t('avatars.emptyDesc') : undefined}
            action={
              avatars.length === 0 ? (
                <button type="button" onClick={() => setShowUpload(true)} className="btn-primary">
                  <Plus className="h-4 w-4" aria-hidden />
                  {t('avatars.upload')}
                </button>
              ) : (
                <button type="button" onClick={() => setSearch('')} className="btn-secondary">
                  {t('filter.clearFilter')}
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((a) => (
            <AvatarCard
              key={a.id}
              avatar={a}
              busy={busyId === a.id}
              onDelete={() => setToDelete(a)}
              onRename={() => setToRename(a)}
              onUse={() => handleUse(a)}
            />
          ))}
        </div>
      )}

      <AvatarUploadModal open={showUpload} onClose={() => setShowUpload(false)} />

      <ConfirmDialog
        open={!!toDelete}
        title={t('avatars.deleteTitle')}
        message={t('avatars.deleteMessage')}
        confirmText={t('common.delete')}
        loading={!!toDelete && busyId === toDelete.id}
        onCancel={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
      <RenameDialog
        open={!!toRename}
        title={t('avatars.renameTitle')}
        label={t('avatars.nameLabel')}
        initialValue={toRename?.name ?? ''}
        maxLength={80}
        submitting={!!toRename && busyId === toRename.id}
        onCancel={() => setToRename(null)}
        onSubmit={handleRename}
      />
    </div>
  )
}
