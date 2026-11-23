import { useTranslation } from 'react-i18next'
import { MonitorPlay, Plus } from 'lucide-react'

interface Props {
  email?: string | null
  onCreate: () => void
  onCreateAvatar: () => void
  hasAvatar: boolean
}

const dateFmt = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
  weekday: 'long',
})

/** 工作台页头：眉标（日期）+ H1 问候 + 副标题 + 右侧主操作 */
export default function PageHeader({ email, onCreate, onCreateAvatar, hasAvatar }: Props) {
  const { t, i18n } = useTranslation()
  const name = (email ?? '').split('@')[0] || t('home.greetingAnon')
  const today =
    i18n.language.startsWith('zh')
      ? dateFmt.format(new Date())
      : new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        })

  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-3))]">
          {today}
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.02em] text-[rgb(var(--text))]">
          {t('home.greeting', { name })}
        </h1>
        <p className="mt-1 text-[13px] text-[rgb(var(--text-3))]">{t('home.subtitle')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onCreateAvatar} className="btn-secondary">
          <Plus className="h-4 w-4" aria-hidden />
          {t('home.createAvatar')}
        </button>
        <button type="button" onClick={onCreate} className="btn-primary" disabled={!hasAvatar}>
          <MonitorPlay className="h-4 w-4" aria-hidden />
          {t('nav.createVideo')}
        </button>
      </div>
    </div>
  )
}
