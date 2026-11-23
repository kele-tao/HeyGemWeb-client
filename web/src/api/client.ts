import type { User } from '@/types'
import {
  ApiError,
  MESSAGES,
  defaultMessage,
  httpCodeToAppCode,
  type ApiErrorPayload,
} from './errors'

export { ApiError, type ApiErrorPayload } from './errors'

/** 后端基础路径：开发用 vite proxy，生产由同源反代提供 */
export const BASE = ''

/** 访问令牌镜像使用的 localStorage 键（刷新令牌不落前端存储） */
export const ACCESS_KEY = 'heygem.access'

// ---------------------------------------------------------------------------
// 令牌存取（内存 + localStorage 镜像）
// ---------------------------------------------------------------------------

interface StoredAccess {
  token: string
  user: User | null
}

let memoryToken: string | null = null

function readStored(): StoredAccess | null {
  try {
    const raw = localStorage.getItem(ACCESS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredAccess>
    if (typeof parsed?.token !== 'string' || !parsed.token) return null
    return { token: parsed.token, user: (parsed.user as User) ?? null }
  } catch {
    return null
  }
}

export function getAccessToken(): string | null {
  return memoryToken ?? readStored()?.token ?? null
}

export function setAccessToken(token: string | null, user: User | null = null) {
  memoryToken = token
  try {
    if (token) localStorage.setItem(ACCESS_KEY, JSON.stringify({ token, user }))
    else localStorage.removeItem(ACCESS_KEY)
  } catch {
    /* 隐私模式下 localStorage 不可用时仅保留内存态 */
  }
}

export function getStoredUser(): User | null {
  return readStored()?.user ?? null
}

/** 清空本地令牌（不触发跳转，由上层决定） */
export function clearSession() {
  memoryToken = null
  try {
    localStorage.removeItem(ACCESS_KEY)
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// 401 统一处理：静默刷新（单例 Promise 去重）+ 原请求重放
// ---------------------------------------------------------------------------

type Listener = () => void
const unauthorizedListeners = new Set<Listener>()

/** 订阅「登录已失效」事件（由 App 层跳转登录页 + 提示） */
export function onUnauthorized(fn: Listener): () => void {
  unauthorizedListeners.add(fn)
  return () => unauthorizedListeners.delete(fn)
}

function emitUnauthorized() {
  for (const fn of unauthorizedListeners) {
    try {
      fn()
    } catch {
      /* ignore */
    }
  }
}

let refreshPromise: Promise<string | null> | null = null

/** 单例刷新：并发 401 时只发起一次 /api/auth/refresh，避免轮换复用检测误踢会话 */
function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) {
          clearSession()
          return null
        }
        const data = (await res.json()) as { access_token?: string }
        if (!data?.access_token) {
          clearSession()
          return null
        }
        setAccessToken(data.access_token, getStoredUser())
        return data.access_token
      } catch {
        return null
      } finally {
        setTimeout(() => {
          refreshPromise = null
        }, 0)
      }
    })()
  }
  return refreshPromise
}

/** 解析错误响应，兜底成 ApiError */
async function toApiError(res: Response): Promise<ApiError> {
  let payload: ApiErrorPayload = {}
  try {
    payload = (await res.json()) as ApiErrorPayload
  } catch {
    /* 非 JSON 响应 */
  }
  const code = payload.code || httpCodeToAppCode(res.status)
  return new ApiError(
    code,
    payload.message || defaultMessage(code, res.status),
    res.status,
    Array.isArray(payload.fields) ? payload.fields : [],
    payload.request_id,
  )
}

export interface RequestOptions {
  method?: string
  /** JSON 请求体（与 body 二选一） */
  json?: unknown
  /** FormData / Blob / 原始请求体 */
  body?: BodyInit | null
  headers?: Record<string, string>
  /** 是否携带 Authorization（默认 true） */
  auth?: boolean
  /** 401 是否尝试静默刷新（默认 true） */
  retryOn401?: boolean
  signal?: AbortSignal
  /** 额外 query 参数（undefined / null / '' 会被跳过） */
  query?: Record<string, string | number | boolean | undefined | null>
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = BASE + path
  if (!query) return url
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue
    sp.append(k, String(v))
  }
  const qs = sp.toString()
  return qs ? `${url}?${qs}` : url
}

/** 解析响应体（204 返回 null；非 JSON 时按 text 返回） */
async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return null as T
  const text = await res.text()
  if (!text) return null as T
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return JSON.parse(text) as T
  return text as unknown as T
}

/** 统一请求入口 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', json, body, headers = {}, auth = true, retryOn401 = true } = options
  const url = buildUrl(path, options.query)

  const h: Record<string, string> = { Accept: 'application/json', ...headers }
  let payload: BodyInit | null | undefined = body
  if (json !== undefined) {
    h['Content-Type'] = 'application/json'
    payload = JSON.stringify(json)
  }
  const token = auth ? getAccessToken() : null
  if (token) h['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: h,
      body: payload as BodyInit | undefined,
      credentials: 'include',
      signal: options.signal,
    })
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err
    throw new ApiError('NETWORK_ERROR', MESSAGES.NETWORK_ERROR, 0)
  }

  if (res.ok) return parseResponse<T>(res)

  const error = await toApiError(res)

  if (res.status === 401 && auth && retryOn401) {
    if (error.code !== 'AUTH_TOKEN_EXPIRED' && error.code !== 'AUTH_TOKEN_INVALID') {
      // 凭据错误（登录接口）直接抛出，由表单就近展示
      throw error
    }
    const fresh = await refreshAccessToken()
    if (fresh) return request<T>(path, { ...options, retryOn401: false })
    emitUnauthorized()
    throw new ApiError('AUTH_TOKEN_INVALID', MESSAGES.AUTH_TOKEN_INVALID, 401)
  }

  if (res.status === 403 && error.code === 'AUTH_ACCOUNT_DISABLED') {
    clearSession()
    emitUnauthorized()
    throw error
  }

  throw error
}

/**
 * 带上传进度的 multipart 请求（XMLHttpRequest；fetch 无法上报上传进度）。
 * 401 时同样走单例刷新并重放一次。
 */
export function uploadWithProgress<T>(
  path: string,
  form: FormData,
  onProgress?: (percent: number) => void,
  retried = false,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', BASE + path, true)
    xhr.withCredentials = true
    xhr.setRequestHeader('Accept', 'application/json')
    const token = getAccessToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return
      onProgress(e.lengthComputable ? (e.loaded / e.total) * 100 : 0)
    }
    xhr.onerror = () => reject(new ApiError('NETWORK_ERROR', MESSAGES.NETWORK_ERROR, 0))
    xhr.onabort = () => reject(new ApiError('REQUEST_ABORTED', '上传已取消', 0))
    xhr.onload = async () => {
      const text = xhr.responseText
      let payload: unknown = null
      if (text) {
        try {
          payload = JSON.parse(text)
        } catch {
          payload = text
        }
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve((xhr.status === 204 ? null : payload) as T)
        return
      }
      const p = (payload ?? {}) as ApiErrorPayload
      const code = p.code || httpCodeToAppCode(xhr.status)
      const error = new ApiError(
        code,
        p.message || defaultMessage(code, xhr.status),
        xhr.status,
        Array.isArray(p.fields) ? p.fields : [],
        p.request_id,
      )
      if (xhr.status === 401 && !retried) {
        const fresh = await refreshAccessToken()
        if (fresh) {
          try {
            resolve(await uploadWithProgress<T>(path, form, onProgress, true))
          } catch (e) {
            reject(e)
          }
          return
        }
        emitUnauthorized()
        reject(new ApiError('AUTH_TOKEN_INVALID', MESSAGES.AUTH_TOKEN_INVALID, 401))
        return
      }
      reject(error)
    }
    xhr.send(form)
  })
}

/** 便捷方法 */
export const http = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { query }),
  post: <T>(path: string, json?: unknown, options?: Omit<RequestOptions, 'method' | 'json'>) =>
    request<T>(path, { ...options, method: 'POST', json }),
  patch: <T>(path: string, json?: unknown) => request<T>(path, { method: 'PATCH', json }),
  delete: <T = null>(path: string) => request<T>(path, { method: 'DELETE' }),
  /** 取二进制（如 speech 接口返回的 wav） */
  blob: async (path: string, json?: unknown): Promise<Blob> => {
    const headers: Record<string, string> = { Accept: 'audio/wav, */*' }
    const token = getAccessToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (json !== undefined) headers['Content-Type'] = 'application/json'
    let res: Response
    try {
      res = await fetch(BASE + path, {
        method: 'POST',
        headers,
        body: json !== undefined ? JSON.stringify(json) : undefined,
        credentials: 'include',
      })
    } catch {
      throw new ApiError('NETWORK_ERROR', MESSAGES.NETWORK_ERROR, 0)
    }
    if (res.ok) return res.blob()
    const error = await toApiError(res)
    if (res.status === 401) {
      const fresh = await refreshAccessToken()
      if (fresh) return http.blob(path, json)
      emitUnauthorized()
      throw new ApiError('AUTH_TOKEN_INVALID', MESSAGES.AUTH_TOKEN_INVALID, 401)
    }
    throw error
  },
}
