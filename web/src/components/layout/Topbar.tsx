import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Languages, Menu, MonitorPlay, Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useAppStore } from '@/store/useAppStore'
import HelpMenu from '@/components/layout/HelpMenu'

const TITLES: Record<string, string> = {
  '/': 'nav.home',
  '/works': 'nav.works',
  '/avatars': 'nav.avatars',
  '/voices': 'nav.voices',
  '/editor': 'nav.editor',
}

function sectionTitle(pathname: string): string {
  if (pathname.startsWith('/editor')) return 'nav.editor'
  return TITLES[pathname] ?? 'nav.home'
}

interface Props {
  pathname: string
  menuBtnRef: React.RefObject<HTMLButtonElement>
  drawerOpen: boolean
  onOpenDrawer: () => void
  onSwitchLang: () => void
}

/** 顶栏（56px sticky）：区块标题 + 任务状态 + 主题 / 语言 / 帮助 */
export default function Topbar({
  pathname,
  menuBtnRef,
  drawerOpen,
  onOpenDrawer,
  onSwitchLang,
}: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { theme, toggle } = useThemeStore()
  const server = useAppStore((s) => s.server)
  const videos = useAppStore((s) => s.videos)
  const activeTasks = videos.filter(
    (v) => v.status === 'queued' || v.status === 'processing',
  ).length

  return (
    <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center gap-2 border-b border-[rgb(var(--hairline))] bg-[rgb(var(--bg))]/92 px-4 backdrop-blur-md md:px-5">
      <button
        ref={menuBtnRef}
        type="button"
        onClick={onOpenDrawer}
        className="btn btn-ghost btn-icon btn-sm md:hidden"
        aria-label={t('layout.menu')}
        aria-expanded={drawerOpen}
        title={t('layout.menu')}
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="hidden text-[11px] font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-3))] sm:block">
          {t('layout.studio')}
        </div>
        <div className="truncate text-sm font-medium text-[rgb(var(--text))]">
          {t(sectionTitle(pathname))}
        </div>
      </div>

      {server?.ai_mode === 'mock' && (
        <span className="badge-neutral hidden sm:inline-flex" title={t('layout.demoModeHint')}>
          <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--warning))]" aria-hidden />
          {t('layout.demoMode')}
        </span>
      )}

      {activeTasks > 0 && (
        <button
          type="button"
          onClick={() => navigate('/works')}
          className="badge-warning"
          title={t('layout.tasksRunning', { count: activeTasks })}
        >
          <MonitorPlay className="h-3 w-3" aria-hidden />
          <span className="num">{activeTasks}</span>
          <span className="sr-only">{t('layout.tasksRunning', { count: activeTasks })}</span>
        </button>
      )}

      <button
        type="button"
        onClick={toggle}
        className="btn btn-ghost btn-icon btn-sm"
        aria-label={t('layout.theme')}
        title={t('layout.theme')}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={onSwitchLang}
        className="btn btn-ghost btn-icon btn-sm hidden sm:inline-flex"
        aria-label={t('layout.language')}
        title={t('layout.language')}
      >
        <Languages className="h-4 w-4" />
      </button>
      <HelpMenu />
    </header>
  )
}
