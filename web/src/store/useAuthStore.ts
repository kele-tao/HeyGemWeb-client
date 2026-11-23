import { create } from 'zustand'
import * as authApi from '@/api/auth'
import {
  ApiError,
  clearSession,
  getAccessToken,
  getStoredUser,
  onUnauthorized,
  setAccessToken,
} from '@/api/client'
import type { AuthResponse, User } from '@/types'

type Status = 'idle' | 'loading' | 'error'

interface AuthState {
  user: User | null
  /** 首帧水合完成（同步读 localStorage，避免受保护页面闪现） */
  isHydrated: boolean
  status: Status
  error: string | null
  /** 登录已失效的提示（登录页展示"登录已过期，请重新登录"） */
  sessionExpired: boolean

  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<User | null>
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  /** 清空本地会话（401 兜底 / 账号禁用） */
  resetSession: (expired?: boolean) => void
  clearError: () => void
  consumeSessionExpired: () => void
}

const initialUser = getStoredUser()

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  isHydrated: true,
  status: 'idle',
  error: null,
  sessionExpired: false,

  login: async (email, password) => {
    set({ status: 'loading', error: null })
    try {
      const data: AuthResponse = await authApi.login(email, password)
      setAccessToken(data.access_token, data.user)
      set({ user: data.user, status: 'idle', error: null, sessionExpired: false })
    } catch (err) {
      const e = err as ApiError
      set({ status: 'error', error: e.message || '登录失败' })
      throw err
    }
  },

  register: async (email, password) => {
    set({ status: 'loading', error: null })
    try {
      const data: AuthResponse = await authApi.register(email, password)
      setAccessToken(data.access_token, data.user)
      set({ user: data.user, status: 'idle', error: null, sessionExpired: false })
    } catch (err) {
      const e = err as ApiError
      set({ status: 'error', error: e.message || '注册失败' })
      throw err
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
      set({ user: null, status: 'idle', error: null, sessionExpired: false })
    }
  },

  refreshUser: async () => {
    if (!getAccessToken()) {
      set({ user: null })
      return null
    }
    try {
      const user = await authApi.me()
      setAccessToken(getAccessToken() as string, user)
      set({ user })
      return user
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession()
        set({ user: null })
      }
      return null
    }
  },

  changePassword: async (oldPassword, newPassword) => {
    await authApi.changePassword(oldPassword, newPassword)
  },

  resetSession: (expired = false) => {
    clearSession()
    set({ user: null, status: 'idle', sessionExpired: expired })
  },

  clearError: () => set({ error: null }),
  consumeSessionExpired: () => set({ sessionExpired: false }),
}))

/** 全局 401 兜底：清会话并标记"登录已过期" */
onUnauthorized(() => {
  useAuthStore.getState().resetSession(true)
})