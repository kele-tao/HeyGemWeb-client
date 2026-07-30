import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  hideClose?: boolean
  dismissible?: boolean
  /** 弹窗层级 */
  zIndex?: number
}

const sizeMap: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-6xl',
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  hideClose,
  dismissible = true,
  zIndex = 50,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (dismissible && e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, dismissible])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      style={{ zIndex }}
      onClick={() => dismissible && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full bg-[rgb(var(--surface))] rounded-2xl',
          'border border-[rgb(var(--border))]',
          'shadow-xl',
          'animate-scale-in overflow-hidden',
          'max-h-[90vh] flex flex-col',
          sizeMap[size],
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between px-6 py-4 border-b border-[rgb(var(--border))] flex-shrink-0">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="text-base font-semibold tracking-tight text-balance">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5 text-pretty">
                  {description}
                </p>
              )}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                className="ml-3 p-1.5 rounded-lg text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))] transition flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  )
}
