import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, HelpCircle, Keyboard, Rocket } from 'lucide-react'
import Onboarding from '@/components/feedback/Onboarding'

const SHORTCUTS: Array<{ keys: string; zh: string }> = [
  { keys: 'g h', zh: '工作台' },
  { keys: 'g w', zh: '作品库' },
  { keys: 'g a', zh: '数字人' },
  { keys: 'g v', zh: '声音' },
]

/** 帮助菜单（顶栏图标按钮 + 弹出面板） */
export default function HelpMenu({ compact }: { compact?: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  return (
    <>
      <div className="relative" ref={wrapperRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t('layout.help')}
          title={t('layout.help')}
          className="btn btn-ghost btn-icon btn-sm"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[rgb(var(--hairline))] bg-[rgb(var(--surface))] p-1.5 shadow-lift animate-slide-down"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                try {
                  localStorage.removeItem('heygem.onboarded')
                } catch {
                  /* ignore */
                }
                setShowOnboarding(true)
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-[rgb(var(--text-2))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))]"
            >
              <Rocket className="h-4 w-4" />
              重新查看新手引导
            </button>
            <a
              href="#"
              role="menuitem"
              onClick={(e) => {
                e.preventDefault()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-[rgb(var(--text-2))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))]"
            >
              <BookOpen className="h-4 w-4" />
              使用文档
            </a>
            {!compact && (
              <div className="mt-1 border-t border-[rgb(var(--hairline))] px-2.5 py-2">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-3))]">
                  <Keyboard className="h-3 w-3" />
                  快捷键
                </div>
                <ul className="space-y-1">
                  {SHORTCUTS.map((s) => (
                    <li key={s.keys} className="flex items-center justify-between text-xs">
                      <span className="text-[rgb(var(--text-3))]">{s.zh}</span>
                      <kbd className="rounded border border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] px-1.5 py-0.5 font-mono text-[10px] text-[rgb(var(--text-2))]">
                        {s.keys}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      {showOnboarding && <Onboarding force onClose={() => setShowOnboarding(false)} />}
    </>
  )
}
