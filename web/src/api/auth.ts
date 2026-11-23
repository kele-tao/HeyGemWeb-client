import { http, setAccessToken, clearSession } from './client'
import type { AuthResponse, RefreshResponse, User } from '@/types'

/**
 * 账号接口（契约_账号与鉴权）
 * 刷新令牌为 HttpOnly Cookie，前端不可读；只保存访问令牌。
 */

export async function register(email: string, password: string): Promise<AuthResponse> {
  const data = await http.post<AuthResponse>('/api/auth/register', { email, password })
  setAccessToken(data.access_token, data.user)
  return data
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await http.post<AuthResponse>('/api/auth/login', { email, password })
  setAccessToken(data.access_token, data.user)
  return data
}

/** 静默续期（由 client 内部单例调用，也可显式调用） */
export async function refresh(): Promise<RefreshResponse> {
  const data = await http.post<RefreshResponse>('/api/auth/refresh', undefined, {
    auth: false,
    retryOn401: false,
  })
  setAccessToken(data.access_token)
  return data
}

/** 退出登录：服务端撤销会话 + 清本地令牌（幂等，失败也清） */
export async function logout(): Promise<void> {
  try {
    await http.post<null>('/api/auth/logout', undefined)
  } catch {
    /* 幂等：即便服务端不可达也要清掉本地令牌 */
  } finally {
    clearSession()
  }
}

export function me(): Promise<User> {
  return http.get<User>('/api/auth/me')
}

export function changePassword(oldPassword: string, newPassword: string): Promise<null> {
  return http.post<null>('/api/auth/password', {
    old_password: oldPassword,
    new_password: newPassword,
  })
}
