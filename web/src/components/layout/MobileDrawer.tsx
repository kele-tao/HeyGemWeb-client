import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, Moon, Sun, X } from 'lucide-react'
import HeyGemLogo from '@/components/brand/HeyGemLogo'
import { AccountBlock, NavList, CreateAction } from '@/components/layout/SidebarParts'
import { useThemeStore } from '@/store/useThemeStore'

interface Props {
  open: boolean
  drawerRef: React.RefObject<HTMLDivElement>
  onClose: () => void
  onSwitchLang: () => void
}

/** 移动端抽屉（288px，Esc 关闭，打开时焦点进入，关闭后焦点回到触发按钮） */
export default function MobileDrawer({ open, drawerRef, onClose, onSwitchLang }: Props) {
  const { t, i18n } = useTranslation()
  const { theme, toggle } = useThemeStore()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 animate-fade-in bg-black/60"
        onClick={onClose}
        role="presentation"
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="导航菜单"
        className="absolute inset-y-0 left-0 flex w-[288px] max-w-[85vw] flex-col border-r border-[rgb(var(--hairline))] bg-[rgb(var(--bg))] animate-drawer-in"
      >
        <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[rgb(var(--hairline))] px-3">
          <HeyGemLogo size={28} />
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-icon btn-sm"
            aria-label={t('layout.closeMenu')}
            title={t('layout.closeMenu')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <CreateAction />
        <NavList onNavigate={onClose} />
        <div className="space-y-1 border-t border-[rgb(var(--hairline))] p-2">
          <button type="button" onClick={onSwitchLang} className="nav-item w-full">
            <Languages className="h-4 w-4" aria-hidden />
            {i18n.language.startsWith('zh') ? 'English' : '中文'}
          </button>
          <button type="button" onClick={toggle} className="nav-item w-full">
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" aria-hidden />
            ) : (
              <Moon className="h-4 w-4" aria-hidden />
            )}
            {theme === 'dark' ? '浅色主题' : '深色主题'}
          </button>
        </div>
        <AccountBlock />
      </div>
    </div>
  )
}
