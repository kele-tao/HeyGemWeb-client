import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import type { Video } from '@/types'

interface Props {
  videos: Video[]
}

/** 近 7 天节奏：单色柱状（强调色仅用于当天），无渐变 */
export default function WeeklyPace({ videos }: Props) {
  const { t } = useTranslation()

  const trend = useMemo(() => {
    const days: Array<{ key: string; label: string; count: number }> = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const count = videos.filter((v) => v.created_at.slice(0, 10) === key).length
      days.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}`, count })
    }
    return days
  }, [videos])

  const max = Math.max(...trend.map((d) => d.count), 1)
  const total = trend.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-[rgb(var(--text))]">{t('home.weeklyPace')}</span>
        <span className="num text-[11px] text-[rgb(var(--text-3))]">{total}</span>
      </div>
      {total === 0 ? (
        <p className="py-4 text-center text-[11px] text-[rgb(var(--text-3))]">
          {t('home.weeklyPaceEmpty')}
        </p>
      ) : (
        <div className="flex h-20 items-end gap-1.5" role="img" aria-label={t('home.weeklyPace')}>
          {trend.map((d, i) => {
            const height = d.count > 0 ? Math.max(8, (d.count / max) * 100) : 2
            const today = i === trend.length - 1
            return (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={
                      today
                        ? 'w-full rounded-sm bg-[rgb(var(--accent))]'
                        : 'w-full rounded-sm bg-[rgb(var(--surface-3))]'
                    }
                    style={{ height: `${height}%` }}
                    title={`${d.key}: ${d.count}`}
                  />
                </div>
                <span className="num text-[10px] text-[rgb(var(--text-3))]">{d.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
