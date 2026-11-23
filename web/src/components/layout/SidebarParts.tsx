import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Film, Home, LogOut, Mic, MonitorPlay, UserCircle2 } from 'lucide-react'
import { cn, emailInitial } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { useProjectStore } from '@/store/useProjectStore'
import { useConfirm } from '@/hooks/useConfirm'

export const NAV = [
  { to: '/', icon: Home, key: 'home' },
  { to: '/works', icon: Film, key: 'works' },
  { to: '/avatars', icon: UserCircle2, key: 'avatars' },
  { to: '/voices', icon: Mic, key: 'voices' },
] as const

/** 侧栏账号区：首字母方块 + 邮箱 + 退出登录（二次确认） */
export function AccountBlock({ collapsed }: { collapsed?: boolean }) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const confirm = useConfirm()
  const navigate = useNavigate()

  const handleLogout = async () => {
    const ok = await confirm({
      title: t('layout.logoutTitle'),
      message: t('layout.logoutMessage'),
      confirmText: t('layout.logoutConfirm'),
      cancelText: t('common.cancel'),
      danger: true,
    })
    if (!ok) return
    await logout()
    // 退出后清空工作区数据与本地草稿（契约_账号与鉴权 §2.4）
    useAppStore.getState().resetData()
    useProjectStore.getState().resetProject()
    navigate('/login', { replace: true })
  }

  return (
    <div
      className={cn(
        'border-t border-[rgb(var(--hairline))] p-2',
        collapsed ? 'flex flex-col items-center gap-1' : 'space-y-1',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2.5 rounded-md px-1.5 py-1.5',
          collapsed && 'justify-center',
        )}
      >
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] text-xs font-semibold text-[rgb(var(--text-2))]"
          aria-hidden
        >
          {emailInitial(user?.email)}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate text-xs text-[rgb(var(--text-3))]" title={user?.email}>
            {user?.email ?? '—'}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className={cn(
          'flex items-center gap-2.5 rounded-md px-1.5 py-2 text-sm text-[rgb(var(--text-2))] transition-colors hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))]',
          collapsed ? 'justify-center' : 'w-full',
        )}
        aria-label={t('layout.logout')}
        title={t('layout.logout')}
      >
        <LogOut className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span className="text-xs">{t('layout.logout')}</span>}
      </button>
    </div>
  )
}

export function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation()
  return (
    <nav className={cn('flex-1 space-y-1 overflow-y-auto p-2 scrollbar-thin')} aria-label="主导航">
      {NAV.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            title={collapsed ? t(`nav.${item.key}`) : undefined}
            className={({ isActive }) =>
              cn('nav-item group', isActive && 'nav-item-active', collapsed && 'justify-center px-0')
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-[rgb(var(--accent))]"
                    aria-hidden
                  />
                )}
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden />
                {!collapsed && <span className="truncate">{t(`nav.${item.key}`)}</span>}
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function CreateAction({ collapsed }: { collapsed?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="border-b border-[rgb(var(--hairline))] p-2">
      <button
        type="button"
        onClick={() => navigate('/editor')}
        className={cn('btn-primary w-full', collapsed && 'btn-icon')}
        aria-label={t('nav.createVideo')}
        title={t('nav.createVideo')}
      >
        <MonitorPlay className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span className="truncate">{t('nav.createVideo')}</span>}
      </button>
    </div>
  )
}