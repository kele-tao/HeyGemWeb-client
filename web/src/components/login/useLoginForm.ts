import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { ApiError } from '@/api/client'
import { useAuthStore } from '@/store/useAuthStore'

export type Mode = 'login' | 'register'
export type Field = 'email' | 'password' | 'confirm'
export type Errors = Partial<Record<Field, string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Options {
  /** 登录成功后的回跳地址 */
  from: string
}

/**
 * 登录/注册表单逻辑：失焦校验、输入实时复校验、提交 loading 防重复、
 * 服务端错误按 code 就近展示（AUTH_EMAIL_TAKEN → 邮箱字段 + 「去登录」）。
 */
export function useLoginForm({ from }: Options) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [emailTaken, setEmailTaken] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const emailRef = useRef<HTMLInputElement | null>(null)
  const passwordRef = useRef<HTMLInputElement | null>(null)
  const uid = useId()

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  const validateEmail = useCallback(
    (value: string) => {
      if (!value.trim()) return t('login.errEmailRequired')
      if (!EMAIL_RE.test(value.trim())) return t('login.errEmailInvalid')
      return undefined
    },
    [t],
  )
  const validatePassword = useCallback(
    (value: string) => {
      if (!value) return t('login.errPasswordRequired')
      if (value.length < 8) return t('login.errPasswordMin')
      return undefined
    },
    [t],
  )
  const validateConfirm = useCallback(
    (value: string) => {
      if (!value) return t('login.errConfirmRequired')
      if (value !== password) return t('login.errConfirmMismatch')
      return undefined
    },
    [password, t],
  )

  const validateField = useCallback(
    (field: Field, value: string) => {
      if (field === 'email') return validateEmail(value)
      if (field === 'password') return validatePassword(value)
      return validateConfirm(value)
    },
    [validateEmail, validatePassword, validateConfirm],
  )

  const focusFirstError = useCallback((errs: Errors) => {
    if (errs.email) emailRef.current?.focus()
    else if (errs.password) passwordRef.current?.focus()
  }, [])

  const onBlur = useCallback(
    (field: Field) => {
      const value = field === 'email' ? email : field === 'password' ? password : confirm
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }))
    },
    [email, password, confirm, validateField],
  )

  const onChange = useCallback(
    (field: Field, value: string) => {
      if (field === 'email') setEmail(value)
      else if (field === 'password') setPassword(value)
      else setConfirm(value)
      setServerError(null)
      if (field === 'email') setEmailTaken(false)
      // 已报错字段在输入时实时复校验
      setErrors((prev) => {
        if (!prev[field]) return prev
        const next = { ...prev }
        const msg = validateField(field, value)
        if (msg) next[field] = msg
        else delete next[field]
        return next
      })
      if (field === 'password' && mode === 'register' && confirm) {
        setErrors((prev) => {
          const next = { ...prev }
          const msg = validateConfirm(confirm)
          if (msg) next.confirm = msg
          else delete next.confirm
          return next
        })
      }
    },
    [mode, confirm, validateField, validateConfirm],
  )

  const switchMode = useCallback((next: Mode) => {
    setMode((current) => {
      if (current === next) return current
      setPassword('')
      setConfirm('')
      setErrors({})
      setServerError(null)
      setEmailTaken(false)
      requestAnimationFrame(() => emailRef.current?.focus())
      return next
    })
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (submitting) return
      setServerError(null)
      setEmailTaken(false)

      const raw: Errors = { email: validateEmail(email), password: validatePassword(password) }
      if (mode === 'register') raw.confirm = validateConfirm(confirm)
      const cleaned: Errors = {}
      for (const [k, v] of Object.entries(raw)) if (v) cleaned[k as Field] = v
      setErrors(cleaned)
      if (Object.keys(cleaned).length > 0) {
        focusFirstError(cleaned)
        return
      }

      setSubmitting(true)
      try {
        if (mode === 'login') await login(email.trim(), password)
        else await register(email.trim(), password)
        toast.success(mode === 'login' ? '登录成功' : '注册成功')
        navigate(from, { replace: true })
      } catch (err) {
        const e2 = err as ApiError
        const code = e2?.code
        const msg = e2?.message || t('login.loginFailed')
        if (code === 'AUTH_EMAIL_TAKEN') {
          setEmailTaken(true)
          setErrors((prev) => ({ ...prev, email: t('login.emailTaken') }))
        } else if (code === 'VALIDATION_ERROR') {
          const next: Errors = {}
          for (const f of e2.fields ?? []) {
            if (f.field === 'email') next.email = f.message
            if (f.field === 'password') next.password = f.message
          }
          if (Object.keys(next).length > 0) {
            setErrors((prev) => ({ ...prev, ...next }))
            focusFirstError(next)
          } else {
            setServerError(msg)
          }
        } else if (code === 'AUTH_INVALID_CREDENTIALS' || code === 'AUTH_WEAK_PASSWORD') {
          setErrors((prev) => ({ ...prev, password: msg }))
        } else {
          setServerError(msg)
        }
      } finally {
        setSubmitting(false)
      }
    },
    [
      submitting,
      validateEmail,
      validatePassword,
      validateConfirm,
      email,
      password,
      confirm,
      mode,
      focusFirstError,
      login,
      register,
      navigate,
      from,
      t,
    ],
  )

  const goLoginWithEmail = useCallback(() => switchMode('login'), [switchMode])

  return {
    mode,
    email,
    password,
    confirm,
    errors,
    serverError,
    emailTaken,
    submitting,
    showPassword,
    emailRef,
    passwordRef,
    uid,
    setShowPassword,
    onChange,
    onBlur,
    switchMode,
    handleSubmit,
    goLoginWithEmail,
  }
}
