import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Eye,
  EyeOff,
  Languages,
  Loader2,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useThemeStore } from '@/store/useThemeStore'
import HeyGemLogo from '@/components/brand/HeyGemLogo'
import { StudioBand, StudioVisual } from '@/components/login/StudioVisual'
import { useLoginForm, type Mode } from '@/components/login/useLoginForm'

/**
 * 登录 / 注册页（设计体系 §四）
 * - ≥1024 两栏 1.15 / 0.85；768–1023 顶部 240px 视觉带；<768 品牌带 + 满宽表单
 * - 胶囊分段切换不换路由；失焦校验、错误就近展示、回车提交、提交 loading 防重复
 */
export default function LoginPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const sessionExpired = useAuthStore((s) => s.sessionExpired)
  const consumeSessionExpired = useAuthStore((s) => s.consumeSessionExpired)
  const { theme, toggle } = useThemeStore()
  const [expiredNotice, setExpiredNotice] = useState(sessionExpired)

  const stateFrom = (location.state as { from?: string } | null)?.from
  const from = stateFrom && stateFrom !== '/login' ? stateFrom : '/'

  // 已登录访问 /login → 回工作台
  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, from, navigate])

  // 登录过期提示只消费一次
  useEffect(() => {
    if (sessionExpired) {
      setExpiredNotice(true)
      consumeSessionExpired()
    }
  }, [sessionExpired, consumeSessionExpired])

  const form = useLoginForm({ from })
  const {
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
  } = form

  const switchLang = () => {
    void i18n.changeLanguage(i18n.language.startsWith('zh') ? 'en' : 'zh')
  }

  if (user) return <Navigate to={from} replace />

  const fieldError = (field: 'email' | 'password' | 'confirm') => errors[field]

  return (
    <div className="flex min-h-full w-full flex-col bg-[rgb(var(--bg))] lg:grid lg:grid-cols-[1.15fr_0.85fr]">
      {/* 视觉栏：≥1024 两栏；768-1023 顶部 240px 压缩视觉带；<768 只保留品牌带 */}
      <div className="hidden md:block lg:h-auto">
        <div className="md:h-[240px] lg:hidden">
          <StudioBand />
        </div>
        <div className="hidden lg:block lg:h-full">
          <StudioVisual />
        </div>
      </div>

      {/* 表单栏 */}
      <div className="relative flex min-h-full flex-col overflow-y-auto px-5 py-6 sm:px-8 lg:px-12">
        <div className="absolute right-4 top-4 flex items-center gap-1">
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
            onClick={switchLang}
            className="btn btn-ghost btn-icon btn-sm"
            aria-label={t('layout.language')}
            title={t('layout.language')}
          >
            <Languages className="h-4 w-4" />
          </button>
        </div>

        {/* 移动端品牌带 */}
        <div className="mb-6 flex items-center gap-2.5 pt-8 md:hidden">
          <HeyGemLogo size={30} />
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-[rgb(var(--text))]">
            {mode === 'login' ? t('login.titleLogin') : t('login.titleRegister')}
          </h2>
          <p className="mt-1.5 text-sm text-[rgb(var(--text-3))]">
            {mode === 'login' ? t('login.subtitleLogin') : t('login.subtitleRegister')}
          </p>

          {expiredNotice && (
            <div
              className="mt-4 flex items-start gap-2 rounded-md border border-[rgb(var(--warning))]/25 bg-[rgb(var(--warning))]/10 p-2.5 text-xs text-[rgb(var(--warning))]"
              role="status"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
              {t('login.expired')}
            </div>
          )}

          {/* 胶囊分段切换 */}
          <div
            className="mt-6 grid grid-cols-2 gap-1 rounded-md bg-[rgb(var(--surface-2))] p-1"
            role="tablist"
            aria-label="登录或注册"
          >
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={cn(
                  'h-8 rounded text-xs font-medium transition-colors',
                  mode === m
                    ? 'border border-[rgb(var(--hairline))] bg-[rgb(var(--surface))] text-[rgb(var(--text))]'
                    : 'border border-transparent text-[rgb(var(--text-3))] hover:text-[rgb(var(--text-2))]',
                )}
              >
                {m === 'login' ? t('login.tabLogin') : t('login.tabRegister')}
              </button>
            ))}
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor={`${uid}-email`} className="form-label">
                {t('login.email')}
              </label>
              <input
                id={`${uid}-email`}
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => onChange('email', e.target.value)}
                onBlur={() => onBlur('email')}
                autoComplete="email"
                inputMode="email"
                placeholder={t('login.emailPlaceholder')}
                aria-invalid={!!fieldError('email')}
                aria-describedby={fieldError('email') ? `${uid}-email-err` : undefined}
                className={cn('input input-lg', fieldError('email') && 'input-error')}
                disabled={submitting}
              />
              {fieldError('email') && (
                <p id={`${uid}-email-err`} className="form-error">
                  <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden />
                  <span>{fieldError('email')}</span>
                  {emailTaken && (
                    <button
                      type="button"
                      onClick={goLoginWithEmail}
                      className="ml-auto flex-shrink-0 font-medium underline underline-offset-2"
                    >
                      {t('login.goLogin')}
                    </button>
                  )}
                </p>
              )}
            </div>

            <div>
              <label htmlFor={`${uid}-password`} className="form-label">
                {t('login.password')}
              </label>
              <div className="relative">
                <input
                  id={`${uid}-password`}
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => onChange('password', e.target.value)}
                  onBlur={() => onBlur('password')}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={t('login.passwordPlaceholder')}
                  aria-invalid={!!fieldError('password')}
                  aria-describedby={fieldError('password') ? `${uid}-pwd-err` : undefined}
                  className={cn(
                    'input input-lg pr-10',
                    fieldError('password') && 'input-error',
                  )}
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-[rgb(var(--text-3))] hover:text-[rgb(var(--text))]"
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  title={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldError('password') && (
                <p id={`${uid}-pwd-err`} className="form-error">
                  <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden />
                  <span>{fieldError('password')}</span>
                </p>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor={`${uid}-confirm`} className="form-label">
                  {t('login.confirmPassword')}
                </label>
                <input
                  id={`${uid}-confirm`}
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => onChange('confirm', e.target.value)}
                  onBlur={() => onBlur('confirm')}
                  autoComplete="new-password"
                  placeholder={t('login.confirmPlaceholder')}
                  aria-invalid={!!fieldError('confirm')}
                  aria-describedby={fieldError('confirm') ? `${uid}-confirm-err` : undefined}
                  className={cn('input input-lg', fieldError('confirm') && 'input-error')}
                  disabled={submitting}
                />
                {fieldError('confirm') && (
                  <p id={`${uid}-confirm-err`} className="form-error">
                    <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden />
                    <span>{fieldError('confirm')}</span>
                  </p>
                )}
              </div>
            )}

            {serverError && (
              <div
                className="flex items-start gap-2 rounded-md border border-[rgb(var(--danger))]/25 bg-[rgb(var(--danger))]/10 p-2.5 text-xs text-[rgb(var(--danger))]"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                <span>{serverError}</span>
              </div>
            )}

            <button type="submit" className="btn-primary btn-lg w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t('login.submitting')}
                </>
              ) : mode === 'login' ? (
                t('login.submitLogin')
              ) : (
                t('login.submitRegister')
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-[rgb(var(--text-3))]">
            {mode === 'login' ? t('login.newUserHint') : t('login.haveAccountHint')}{' '}
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="font-medium text-[rgb(var(--accent))] hover:underline"
            >
              {mode === 'login' ? t('login.switchToRegister') : t('login.switchToLogin')}
            </button>
          </p>

          <div className="mt-6 flex items-start gap-2 rounded-md border border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] p-3 text-[11px] leading-relaxed text-[rgb(var(--text-3))]">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[rgb(var(--accent))]" aria-hidden />
            <span>
              演示环境使用后端 AI 模拟模式（HEYGEM_AI_MODE=mock），生成结果为占位视频，账号走真实注册流程。
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}