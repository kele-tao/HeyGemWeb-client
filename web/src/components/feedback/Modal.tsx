import { ReactNode, useCallback, useEffect, useId, useRef } from 'react'
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

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * 弹窗：焦点陷阱 + Esc 关闭 + 关闭后焦点归还触发元素 + aria-modal/aria-labelledby。
 */
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
  const panelRef = useRef<HTMLDivElement | null>(null)
  const restoreRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descId = useId()

  const focusables = useCallback((): HTMLElement[] => {
    const root = panelRef.current
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    )
  }, [])

  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // 焦点进入弹窗：首个可聚焦元素，否则面板本身
    const raf = requestAnimationFrame(() => {
      const items = focusables()
      if (items.length > 0) items[0].focus()
      else panelRef.current?.focus()
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) {
        e.preventDefault()
        panelRef.current?.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (!active || !panelRef.current?.contains(active)) {
        e.preventDefault()
        first.focus()
        return
      }
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      restoreRef.current?.focus?.()
    }
  }, [open, onClose, dismissible, focusables])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 animate-fade-in"
      style={{ zIndex }}
      onClick={() => dismissible && onClose()}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'relative flex w-full max-h-[90vh] flex-col overflow-hidden rounded-xl',
          'border border-[rgb(var(--hairline))] bg-[rgb(var(--surface))] shadow-lift',
          'animate-scale-in focus:outline-none',
          sizeMap[size],
        )}
      >
        {(title || !hideClose) && (
          <div className="flex flex-shrink-0 items-start justify-between border-b border-[rgb(var(--hairline))] px-5 py-4">
            <div className="min-w-0 flex-1">
              {title && (
                <h2
                  id={titleId}
                  className="text-lg font-semibold tracking-tight text-[rgb(var(--text))] text-balance"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id={descId}
                  className="mt-1 text-xs text-[rgb(var(--text-3))] text-pretty"
                >
                  {description}
                </p>
              )}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost btn-icon ml-3 flex-shrink-0"
                aria-label="关闭"
                title="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto scrollbar-thin">{children}</div>
      </div>
    </div>
  )
}
