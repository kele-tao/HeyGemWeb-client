import { ChevronRight, Mic, MonitorPlay, UserCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

/** 快捷入口：3 条纵向条目（表面 + 发丝边，hover 升阶，无整块强调色填充） */
export default function QuickEntries() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const entries = [
    {
      key: 'create',
      to: '/editor',
      icon: MonitorPlay,
      title: t('nav.createVideo'),
      desc: t('home.quickCreateDesc'),
    },
    {
      key: 'avatar',
      to: '/avatars',
      icon: UserCircle2,
      title: t('home.statAvatars'),
      desc: t('home.quickAvatarDesc'),
    },
    {
      key: 'voice',
      to: '/voices',
      icon: Mic,
      title: t('home.statVoices'),
      desc: t('home.quickVoiceDesc'),
    },
  ]

  return (
    <div className="card p-2">
      <div className="px-2 py-2 text-sm font-semibold text-[rgb(var(--text))]">
        {t('home.quickEntries')}
      </div>
      <ul className="divide-y divide-[rgb(var(--hairline))]">
        {entries.map((entry) => {
          const Icon = entry.icon
          return (
            <li key={entry.key}>
              <button
                type="button"
                onClick={() => navigate(entry.to)}
                className="group flex w-full items-center gap-3 px-2 py-2.5 text-left transition-colors hover:bg-[rgb(var(--surface-2))]"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text-2))]">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[rgb(var(--text))]">
                    {entry.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[rgb(var(--text-3))]">
                    {entry.desc}
                  </span>
                </span>
                <ChevronRight
                  className="h-4 w-4 flex-shrink-0 text-[rgb(var(--text-3))] transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
