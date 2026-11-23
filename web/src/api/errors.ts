/** 统一错误模型与中文文案（契约 00_全局API索引 §2.3 / §2.4） */

/** 服务端错误结构 */
export interface ApiErrorPayload {
  code?: string
  message?: string
  fields?: Array<{ field: string; message: string }>
  request_id?: string
}

/** 统一错误类：code 供分类处理，message 可直接展示 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly fields: Array<{ field: string; message: string }>
  readonly requestId?: string

  constructor(
    code: string,
    message: string,
    status: number,
    fields: Array<{ field: string; message: string }> = [],
    requestId?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.fields = fields
    this.requestId = requestId
  }

  /** 取某个字段的就近错误文案 */
  fieldError(field: string): string | undefined {
    return this.fields.find((f) => f.field === field)?.message
  }
}

/** HTTP 状态码 → 契约错误码（响应体缺 code 时兜底） */
export function httpCodeToAppCode(status: number): string {
  switch (status) {
    case 401:
      return 'AUTH_TOKEN_INVALID'
    case 403:
      return 'FORBIDDEN'
    case 404:
      return 'RESOURCE_NOT_FOUND'
    case 409:
      return 'RESOURCE_STATE_INVALID'
    case 413:
      return 'MEDIA_TOO_LARGE'
    case 415:
      return 'MEDIA_TYPE_UNSUPPORTED'
    case 422:
      return 'VALIDATION_ERROR'
    case 429:
      return 'AUTH_RATE_LIMITED'
    case 503:
      return 'AI_SERVICE_UNAVAILABLE'
    default:
      return status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED'
  }
}

/** 错误码 → 可直接展示的中文文案 */
export const MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: '提交内容不合法',
  AUTH_INVALID_CREDENTIALS: '邮箱或密码不正确',
  AUTH_EMAIL_TAKEN: '该邮箱已注册',
  AUTH_WEAK_PASSWORD: '密码长度需为 8-128 个字符',
  AUTH_PASSWORD_UNCHANGED: '新密码不能与原密码相同',
  AUTH_TOKEN_INVALID: '登录已过期，请重新登录',
  AUTH_TOKEN_EXPIRED: '登录已过期，请重新登录',
  AUTH_ACCOUNT_DISABLED: '账号已被禁用，请联系运营',
  AUTH_RATE_LIMITED: '操作过于频繁，请稍后再试',
  RESOURCE_NOT_FOUND: '资源不存在或已被删除',
  RESOURCE_IN_USE: '有作品正在使用该资源，无法删除',
  RESOURCE_BUSY: '该资源已有进行中的任务，请稍候',
  RESOURCE_STATE_INVALID: '当前状态不允许该操作',
  MEDIA_TYPE_UNSUPPORTED: '文件格式不支持',
  MEDIA_TOO_LARGE: '文件超过体积上限',
  MEDIA_DURATION_TOO_SHORT: '媒体时长不足',
  MEDIA_DURATION_TOO_LONG: '媒体时长超限',
  MEDIA_PROBE_FAILED: '无法解析该媒体文件，可能已损坏',
  MEDIA_SIGNATURE_INVALID: '媒体链接已过期，请刷新后重试',
  SHARE_NOT_FOUND: '分享链接已失效',
  AI_SERVICE_UNAVAILABLE: 'AI 服务暂不可用，请稍后重试',
  AI_SERVICE_ERROR: 'AI 服务返回异常，请稍后重试',
  AI_REQUEST_REJECTED: 'AI 服务拒绝了该输入',
  STORAGE_PATH_INVALID: '存储路径异常，请联系支持',
  INTERNAL_ERROR: '服务出现异常，请稍后重试',
  NETWORK_ERROR: '网络连接失败，请检查网络后重试',
  REQUEST_FAILED: '请求失败，请稍后重试',
}

export function defaultMessage(code: string, status?: number): string {
  if (MESSAGES[code]) return MESSAGES[code]
  return status ? `请求失败（HTTP ${status}）` : '请求失败，请稍后重试'
}
