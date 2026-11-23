import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Check, ImageOff, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface Props {
  avatarId: string | null
  onSelect: (id: string) => void
}

export default function StepAvatar({ avatarId, onSelect }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const avatars = useAppStore((s) => s.avatars)
  const ready = avatars.filter((a) => a.status === 'ready')

  if (ready.length === 0) {
    return (
      <div className="card p-6 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text-3))]">
          <ImageOff className="h-5 w-5" aria-hidden />
        </div>
        <h3 className="text-base font-semibold">{t('editor.noAvatar')}</h3>
        <p className="mt-1 text-sm text-[rgb(var(--text-3))]">{t('editor.noAvatarDesc')}</p>
        <button
          type="button"
          onClick={() => navigate('/avatars')}
          className="btn-primary mx-auto mt-4"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t('home.createAvatar')}
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-3 text-base font-semibold text-[rgb(var(--text))]">
        {t('editor.steps.avatar')}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ready.map((avatar) => {
          const active = avatar.id === avatarId
          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => onSelect(avatar.id)}
              aria-pressed={active}
              className={cn(
                'group overflow-hidden rounded-lg border text-left transition-colors',
                active
                  ? 'border-[rgb(var(--accent))] ring-1 ring-[rgb(var(--accent))]/40'
                  : 'border-[rgb(var(--hairline))] hover:border-[rgb(var(--hairline-strong))]',
              )}
            >
              <div className="preview-frame aspect-video rounded-none">
                {avatar.thumb_url ? (
                  <img src={avatar.thumb_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/25">
                    <ImageOff className="h-5 w-5" aria-hidden />
                  </div>
                )}
                {active && (
                  <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[rgb(var(--accent))] text-[rgb(var(--accent-contrast))]">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                )}
              </div>
              <div className="truncate px-2 py-1.5 text-xs font-medium">{avatar.name}</div>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => navigate('/avatars')}
        className="btn-secondary btn-sm mt-3"
      >
        <Loader2 className="hidden h-3.5 w-3.5" aria-hidden />
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {t('avatars.upload')}
      </button>
    </div>
  )
}
