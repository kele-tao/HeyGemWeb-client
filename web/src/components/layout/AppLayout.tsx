import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Home,
  Film,
  UserCircle2,
  Mic,
  Sun,
  Moon,
  Languages,
  Sparkles,
} from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'
import { useVideoProgress } from '@/hooks/useVideoProgress'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import HeyGemLogo from '@/components/brand/HeyGemLogo'
import HelpMenu from '@/components/layout/HelpMenu'

const navItems = [
  { to: '/', icon: Home, key: 'home' },
  { to: '/works', icon: Film, key: 'works' },
  { to: '/avatars', icon: UserCircle2, key: 'avatars' },
  { to: '/voices', icon: Mic, key: 'voices' },
] as const

export default function AppLayout() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggle } = useThemeStore()
  useVideoProgress()

  const switchLang = () => {
    const next = i18n.language.startsWith('zh') ? 'en' : 'zh'
    i18n.changeLanguage(next)
    toast.success(next === 'zh' ? '已切换到中文' : 'Switched to English', {
      icon: '🌐',
    })
  }

  const isEditor = location.pathname === '/editor'

  return (
    <div className="flex h-full">
      {/* 侧边栏 */}
      <aside
        className={cn(
          'w-[68px] lg:w-[248px] flex-shrink-0',
          'border-r border-[rgb(var(--border))]',
          'bg-[rgb(var(--surface))]/80 backdrop-blur-2xl',
          'flex flex-col relative z-10',
          isEditor && 'hidden',
        )}
      >
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          className="h-16 flex items-center justify-center lg:justify-start lg:px-5 border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-2))] transition group"
        >
          <HeyGemLogo size={32} />
        </button>

        {/* 导航 */}
        <nav className="flex-1 px-2 lg:px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg',
                    'text-sm font-medium transition-all duration-200 ease-out-expo',
                    isActive
                      ? 'text-brand-700 dark:text-brand-300 bg-gradient-to-r from-brand-50 to-brand-50/50 dark:from-brand-500/15 dark:to-brand-500/5 shadow-sm'
                      : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] hover:bg-[rgb(var(--surface-2))]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-brand-500 to-info-500" />
                    )}
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] flex-shrink-0 transition-transform',
                        isActive && 'scale-110',
                      )}
                    />
                    <span className="hidden lg:inline">{t(`nav.${item.key}`)}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* 创建按钮 */}
        <div className="p-3 hidden lg:block">
          <button
            onClick={() => navigate('/editor')}
            className="w-full btn-primary text-sm group"
          >
            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span>{t('home.createVideo')}</span>
          </button>
        </div>

        {/* 底部主题切换 */}
        <div className="p-2 lg:p-3 border-t border-[rgb(var(--border))] space-y-0.5">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))] transition"
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-[18px] h-[18px]" />
            ) : (
              <Moon className="w-[18px] h-[18px]" />
            )}
            <span className="hidden lg:inline">
              {theme === 'dark' ? '浅色' : '深色'}
            </span>
          </button>
          <button
            onClick={switchLang}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))] transition"
          >
            <Languages className="w-[18px] h-[18px]" />
            <span className="hidden lg:inline">
              {i18n.language.startsWith('zh') ? 'English' : '中文'}
            </span>
          </button>
          <HelpMenu />
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 overflow-auto relative">
        <Outlet />
      </main>
    </div>
  )
}
