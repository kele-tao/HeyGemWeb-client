import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type VideoStatusFilter = 'all' | 'queued' | 'processing' | 'success' | 'failed'

interface Props {
  search: string
  onSearch: (s: string) => void
  status: VideoStatusFilter
  onStatus: (s: VideoStatusFilter) => void
  /** 显示状态筛选(只对作品页) */
  showStatus?: boolean
}

const STATUS_OPTIONS: { key: VideoStatusFilter; icon: string }[] = [
  { key: 'all', icon: '📋' },
  { key: 'success', icon: '✅' },
  { key: 'processing', icon: '⏳' },
  { key: 'queued', icon: '🕒' },
  { key: 'failed', icon: '❌' },
]

export default function SearchFilter({
  search,
  onSearch,
  status,
  onStatus,
  showStatus,
}: Props) {
  const { t } = useTranslation()
  const hasFilter = !!search || status !== 'all'

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--text-muted))]" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('filter.searchPlaceholder')}
          className="input pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => onSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showStatus && (
        <div className="flex gap-1 p-1 bg-[rgb(var(--surface-2))] rounded-lg overflow-x-auto scrollbar-thin">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onStatus(opt.key)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 whitespace-nowrap',
                status === opt.key
                  ? 'bg-[rgb(var(--surface))] shadow-sm text-brand-600 dark:text-brand-400'
                  : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]',
              )}
            >
              <span>{opt.icon}</span>
              <span>
                {opt.key === 'all'
                  ? t('filter.statusAll')
                  : t(`filter.status${opt.key[0].toUpperCase()}${opt.key.slice(1)}`)}
              </span>
            </button>
          ))}
        </div>
      )}

      {hasFilter && (
        <button
          onClick={() => {
            onSearch('')
            onStatus('all')
          }}
          className="btn-ghost text-xs"
        >
          <X className="w-3 h-3" />
          {t('filter.clearFilter')}
        </button>
      )}
    </div>
  )
}
