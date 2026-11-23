import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mic, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/api'
import { ApiError } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import VoiceCard from '@/components/works/VoiceCard'
import VoiceUploadModal from '@/components/modals/VoiceUploadModal'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import EmptyState from '@/components/feedback/EmptyState'
import RenameDialog from '@/components/ui/RenameDialog'
import SearchFilter from '@/components/feedback/SearchFilter'
import { GridSkeleton } from '@/components/feedback/Skeleton'
import type { Voice } from '@/types'

export default function VoicesPage() {
  const { t } = useTranslation()
  const voices = useAppStore((s) => s.voices)
  const removeVoice = useAppStore((s) => s.removeVoice)
  const upsertVoice = useAppStore((s) => s.upsertVoice)
  const isDataLoaded = useAppStore((s) => s.isDataLoaded)

  const [showUpload, setShowUpload] = useState(false)
  const [toDelete, setToDelete] = useState<Voice | null>(null)
  const [toRename, setToRename] = useState<Voice | null>(null)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return voices
    const q = search.trim().toLowerCase()
    return voices.filter((v) => v.name.toLowerCase().includes(q))
  }, [voices, search])

  const handleDelete = async () => {
    if (!toDelete) return
    setBusyId(toDelete.id)
    try {
      await api.voices.remove(toDelete.id)
      removeVoice(toDelete.id)
      toast.success(t('voices.deleteSuccess'))
      setToDelete(null)
    } catch (err) {
      const e = err as ApiError
      toast.error(e.code === 'RESOURCE_IN_USE' ? t('voices.inUse') : e.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleRename = async (name: string) => {
    if (!toRename) return
    setBusyId(toRename.id)
    try {
      const next = await api.voices.update(toRename.id, name)
      upsertVoice(next)
      toast.success(t('voices.renameSuccess'))
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
            {t('voices.title')}
          </h1>
          <p className="mt-1 text-[13px] text-[rgb(var(--text-3))]">{t('voices.subtitle')}</p>
        </div>
        <button type="button" onClick={() => setShowUpload(true)} className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden />
          {t('voices.upload')}
        </button>
      </div>

      {voices.length > 0 && (
        <SearchFilter search={search} onSearch={setSearch} status="all" onStatus={() => {}} />
      )}

      {!isDataLoaded ? (
        <GridSkeleton count={4} />
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Mic className="h-6 w-6" />}
            title={voices.length === 0 ? t('voices.emptyTitle') : t('filter.noResult')}
            description={voices.length === 0 ? t('voices.emptyDesc') : undefined}
            action={
              voices.length === 0 ? (
                <button type="button" onClick={() => setShowUpload(true)} className="btn-primary">
                  <Plus className="h-4 w-4" aria-hidden />
                  {t('voices.upload')}
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
          {filtered.map((v) => (
            <VoiceCard
              key={v.id}
              voice={v}
              busy={busyId === v.id}
              onDelete={() => setToDelete(v)}
              onRename={() => setToRename(v)}
            />
          ))}
        </div>
      )}

      <VoiceUploadModal open={showUpload} onClose={() => setShowUpload(false)} />

      <ConfirmDialog
        open={!!toDelete}
        title={t('voices.deleteTitle')}
        message={t('voices.deleteMessage')}
        confirmText={t('common.delete')}
        loading={!!toDelete && busyId === toDelete.id}
        onCancel={() => setToDelete(null)}
        onConfirm={handleDelete}
      />
      <RenameDialog
        open={!!toRename}
        title={t('voices.renameTitle')}
        label={t('voices.nameLabel')}
        initialValue={toRename?.name ?? ''}
        maxLength={80}
        submitting={!!toRename && busyId === toRename.id}
        onCancel={() => setToRename(null)}
        onSubmit={handleRename}
      />
    </div>
  )
}
