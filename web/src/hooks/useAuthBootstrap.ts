import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore, bootstrapData } from '@/store/useAppStore'

/**
 * 登录态水合 + 首屏数据加载 + 登录失效兜底跳转。
 * - 有会话时：refreshUser（校验令牌）→ bootstrapData
 * - 401 兜底：清会话 → 跳 /login 并提示「登录已过期，请重新登录」
 */
export function useAuthBootstrap() {
  const user = useAuthStore((s) => s.user)
  const sessionExpired = useAuthStore((s) => s.sessionExpired)
  const navigate = useNavigate()
  const location = useLocation()
  const bootstrappedFor = useRef<string | null>(null)

  // 登录后拉首屏聚合数据（只在会话存在时执行）
  useEffect(() => {
    if (!user) {
      bootstrappedFor.current = null
      useAppStore.getState().resetData()
      return
    }
    if (bootstrappedFor.current === user.id) return
    bootstrappedFor.current = user.id
    void bootstrapData()
  }, [user])

  // 会话失效：清空工作区数据并跳登录页
  useEffect(() => {
    if (!sessionExpired) return
    useAppStore.getState().resetData()
    if (location.pathname !== '/login') {
      toast.error('登录已过期，请重新登录', { id: 'session-expired' })
      navigate('/login', { replace: true, state: { from: location.pathname } })
    }
  }, [sessionExpired, location.pathname, navigate])
}
