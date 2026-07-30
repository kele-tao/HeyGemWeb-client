import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  /** 带渐变光晕背景 */
  glow?: boolean
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  glow = true,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-20 px-6 relative overflow-hidden',
        className,
      )}
    >
      {glow && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-2/3 w-72 h-72 rounded-full bg-aurora-soft blur-3xl pointer-events-none"
          aria-hidden
        />
      )}
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl bg-aurora-1 blur-xl opacity-30" />
        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-100 to-info-100 dark:from-brand-500/15 dark:to-info-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-5 shadow-soft">
          {icon}
        </div>
      </div>
      <h3 className="relative text-lg font-semibold text-[rgb(var(--text))] mb-2 text-balance">
        {title}
      </h3>
      {description && (
        <p className="relative text-sm text-[rgb(var(--text-muted))] max-w-md mb-6 leading-relaxed text-pretty">
          {description}
        </p>
      )}
      {action && <div className="relative">{action}</div>}
    </div>
  )
}
