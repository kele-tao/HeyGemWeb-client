import { Film, Mic, Trophy, UserCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import CountUp from '@/components/feedback/CountUp'
import type { Stats } from '@/types'

interface Props {
  stats: Stats
}

/** 数据概览：4 个等宽贴片（Label → 数值 → 备注），无彩色渐变图标块 */
export default function StatsRow({ stats }: Props) {
  const { t } = useTranslation()

  const items = [
    {
      key: 'works',
      label: t('home.statWorks'),
      value: stats.videos,
      note: stats.active_tasks > 0 ? t('home.tasksBadge', { count: stats.active_tasks }) : ' ',
      icon: Film,
    },
    {
      key: 'avatars',
      label: t('home.statAvatars'),
      value: stats.avatars,
      note: ' ',
      icon: UserCircle2,
    },
    {
      key: 'voices',
      label: t('home.statVoices'),
      value: stats.voices,
      note: ' ',
      icon: Mic,
    },
    {
      key: 'success',
      label: t('home.statSuccess'),
      value: stats.success_rate,
      note: stats.success_rate == null ? t('home.statSuccessNone') : t('home.statSuccessHint'),
      icon: Trophy,
    },
  ] as const

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.key} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="text-xs text-[rgb(var(--text-3))]">{item.label}</div>
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[rgb(var(--surface-2))] text-[rgb(var(--text-2))]">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            </div>
            <div className="num mt-1 text-2xl font-semibold tracking-[-0.02em] text-[rgb(var(--text))] lg:text-3xl">
              {item.key === 'success' ? (
                item.value == null ? (
                  '—'
                ) : (
                  <CountUp value={item.value * 100} format={(n) => `${Math.round(n)}`} suffix="%" />
                )
              ) : (
                <CountUp value={item.value as number} />
              )}
            </div>
            <div className="mt-1 truncate text-[11px] text-[rgb(var(--text-3))]">{item.note}</div>
          </div>
        )
      })}
    </div>
  )
}
