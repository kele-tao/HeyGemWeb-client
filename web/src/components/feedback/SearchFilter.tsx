import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VideoStatus } from '@/types'

export type StatusFilter = 'all' | VideoStatus

interface Props {
  search: string
  onSearch: (s: string) => void
  status: StatusFilter
  onStatus: (s: StatusFilter) => void
  showStatus?: boolean
  placeholder?: string
}

const STATUS_KEYS: StatusFilter[] = ['all', 'queued', 'processing', 'success', 'failed']

const STATUS_LABEL_KEY: Record<StatusFilter, string> = {
  all: 'filter.statusAll',
  queued: 'filter.statusQueued',
  processing: 'filter.statusProcessing',
  success: 'filter.statusSuccess',
  failed: 'filter.statusFailed',
}

export default function SearchFilter({
  search,
  onSearch,
  status,
  onStatus,
  showStatus,
  placeholder,
}: Props) {
  const { t } = useTranslation()
  const hasFilter = !!search || status !== 'all'

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--text-3))]"
          aria-hidden
        />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder ?? t('filter.searchPlaceholder')}
          className="input pl-9 pr-9"
          aria-label={t('filter.searchPlaceholder')}
          type="search"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-[rgb(var(--text-3))] hover:text-[rgb(var(--text))]"
            aria-label={t('filter.clearFilter')}
            title={t('filter.clearFilter')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showStatus && (
        <div
          className="flex gap-1 overflow-x-auto rounded-md bg-[rgb(var(--surface-2))] p-1 scrollbar-none"
          role="group"
          aria-label="状态筛选"
        >
          {STATUS_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onStatus(key)}
              aria-pressed={status === key}
              className={cn(
                'whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium transition-colors',
                status === key
                  ? 'bg-[rgb(var(--surface))] text-[rgb(var(--text))] shadow-panel'
                  : 'text-[rgb(var(--text-3))] hover:text-[rgb(var(--text))]',
              )}
            >
              {t(STATUS_LABEL_KEY[key])}
            </button>
          ))}
        </div>
      )}

      {hasFilter && (
        <button
          type="button"
          onClick={() => {
            onSearch('')
            onStatus('all')
          }}
          className="btn btn-ghost btn-sm self-start sm:self-auto"
        >
          <X className="h-3 w-3" />
          {t('filter.clearFilter')}
        </button>
      )}
    </div>
  )
}
