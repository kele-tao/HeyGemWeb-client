import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Mic } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import VoiceCard from '@/components/works/VoiceCard'
import VoiceUploadModal from '@/components/modals/VoiceUploadModal'
import ConfirmDialog from '@/components/feedback/ConfirmDialog'
import EmptyState from '@/components/feedback/EmptyState'
import SearchFilter from '@/components/feedback/SearchFilter'
import toast from 'react-hot-toast'

export default function VoicesPage() {
  const { t } = useTranslation()
  const voices = useAppStore((s) => s.voices)
  const removeVoice = useAppStore((s) => s.removeVoice)
  const [showUpload, setShowUpload] = useState(false)
  const [toDelete, setToDelete] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return voices
    const q = search.toLowerCase()
    return voices.filter((v) => v.name.toLowerCase().includes(q))
  }, [voices, search])

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            {t('works.myVoices')}
          </h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-1.5">
            {t('works.noVoicesDesc')}
          </p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('home.cloneVoice')}
        </button>
      </div>

      {voices.length > 0 && (
        <SearchFilter
          search={search}
          onSearch={setSearch}
          status="all"
          onStatus={() => {}}
        />
      )}

      {filtered.length === 0 ? (
        voices.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={<Mic className="w-9 h-9" />}
              title={t('works.noVoices')}
              description={t('works.noVoicesDesc')}
              action={
                <button onClick={() => setShowUpload(true)} className="btn-primary">
                  <Plus className="w-4 h-4" />
                  {t('home.cloneVoice')}
                </button>
              }
            />
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={<Mic className="w-9 h-9" />}
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
          {filtered.map((v) => (
            <VoiceCard
              key={v.id}
              voice={v}
              onDelete={() => setToDelete(v.id)}
            />
          ))}
        </div>
      )}

      <VoiceUploadModal open={showUpload} onClose={() => setShowUpload(false)} />

      <ConfirmDialog
        open={!!toDelete}
        title={t('modal.confirmDelete')}
        message={t('modal.deleteVoiceMsg')}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) removeVoice(toDelete)
          setToDelete(null)
          toast.success(t('modal.deleteSuccess'))
        }}
      />
    </div>
  )
}
