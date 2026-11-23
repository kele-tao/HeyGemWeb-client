import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useVideoProgress } from '@/hooks/useVideoProgress'
import HeyGemLogo from '@/components/brand/HeyGemLogo'
import Topbar from '@/components/layout/Topbar'
import MobileDrawer from '@/components/layout/MobileDrawer'
import { AccountBlock, CreateAction, NavList } from '@/components/layout/SidebarParts'

/**
 * 应用外壳（设计体系 §二）
 * - 侧栏：≥1280 248px 完整 / 768–1279 72px 图标栏 / <768 抽屉 288px
 * - 顶栏 56px sticky；滚动只发生在 Main
 */
export default function AppLayout() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement | null>(null)
  const menuBtnRef = useRef<HTMLButtonElement | null>(null)
  useVideoProgress()

  // 路由切换关闭抽屉
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // 抽屉：Esc 关闭 + 焦点进入抽屉 + 关闭后焦点回到触发按钮
  useEffect(() => {
    if (!drawerOpen) return
    const timer = setTimeout(() => {
      drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus()
    }, 0)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setDrawerOpen(false)
      menuBtnRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', onKey)
    }
  }, [drawerOpen])

  const switchLang = () => {
    const next = i18n.language.startsWith('zh') ? 'en' : 'zh'
    void i18n.changeLanguage(next)
    toast.success(next === 'zh' ? '已切换到中文' : 'Switched to English')
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    menuBtnRef.current?.focus()
  }

  return (
    <div className="flex h-full overflow-hidden bg-[rgb(var(--bg))]">
      {/* === 侧栏 === */}
      <aside
        className="hidden w-[72px] flex-shrink-0 flex-col border-r border-[rgb(var(--hairline))] bg-[rgb(var(--bg))] md:flex xl:w-[248px]"
        aria-label={t('layout.studio')}
      >
        <div className="flex h-16 flex-shrink-0 items-center justify-center border-b border-[rgb(var(--hairline))] px-2 xl:justify-start xl:px-4">
          <NavLink to="/" aria-label="HeyGem 工作台" className="flex items-center">
            <span className="xl:hidden">
              <HeyGemLogo size={30} showText={false} />
            </span>
            <span className="hidden xl:block">
              <HeyGemLogo size={30} />
            </span>
          </NavLink>
        </div>

        <div className="hidden xl:block">
          <CreateAction />
        </div>
        <div className="xl:hidden">
          <CreateAction collapsed />
        </div>

        <div className="hidden flex-1 xl:block">
          <NavList />
        </div>
        <div className="flex-1 xl:hidden">
          <NavList collapsed />
        </div>

        <div className="hidden xl:block">
          <AccountBlock />
        </div>
        <div className="xl:hidden">
          <AccountBlock collapsed />
        </div>
      </aside>

      <MobileDrawer
        open={drawerOpen}
        drawerRef={drawerRef}
        onClose={closeDrawer}
        onSwitchLang={switchLang}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          pathname={location.pathname}
          menuBtnRef={menuBtnRef}
          drawerOpen={drawerOpen}
          onOpenDrawer={() => setDrawerOpen(true)}
          onSwitchLang={switchLang}
        />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
