import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { AlertCircle, Check } from 'lucide-react'
import Modal from '@/components/feedback/Modal'
import { useAuthStore } from '@/store/useAuthStore'
import { ApiError } from '@/api/client'

interface Props {
  open: boolean
  onClose: () => void
}

/** 账户设置（REQ-012）：展示邮箱与注册时间、修改密码（需原密码）、退出登录入口在侧栏 */
export default function AccountSettingsModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const changePassword = useAuthStore((s) => s.changePassword)
  const uid = useId()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      setError(t('login.errPasswordMin'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('login.errConfirmMismatch'))
      return
    }
    if (newPassword === oldPassword) {
      setError(t('settings.passwordUnchanged'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await changePassword(oldPassword, newPassword)
      toast.success(t('settings.passwordChanged'))
      onClose()
    } catch (err) {
      const e = err as ApiError
      const fieldMsg = e.fieldError?.('new_password') ?? e.fieldError?.('old_password')
      setError(fieldMsg || e.message || t('settings.passwordFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const registeredAt = user?.created_at
    ? new Date(user.created_at).toLocaleString()
    : '—'
  const lastLogin = user?.last_login_at
    ? new Date(user.last_login_at).toLocaleString()
    : '—'

  return (
    <Modal open={open} onClose={onClose} title={t('settings.title')} size="sm">
      <div className="p-5">
        <dl className="space-y-2 rounded-md border border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] p-3 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[rgb(var(--text-3))]">{t('settings.email')}</dt>
            <dd className="min-w-0 truncate text-[rgb(var(--text))]" title={user?.email}>
              {user?.email ?? '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[rgb(var(--text-3))]">{t('settings.registeredAt')}</dt>
            <dd className="num text-[rgb(var(--text-2))]">{registeredAt}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[rgb(var(--text-3))]">{t('settings.lastLogin')}</dt>
            <dd className="num text-[rgb(var(--text-2))]">{lastLogin}</dd>
          </div>
        </dl>

        <form onSubmit={submit} className="mt-5 space-y-3" noValidate>
          <h3 className="text-[13px] font-medium text-[rgb(var(--text))]">
            {t('settings.changePassword')}
          </h3>
          <div>
            <label htmlFor={`${uid}-old`} className="form-label">
              {t('settings.oldPassword')}
            </label>
            <input
              id={`${uid}-old`}
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(e.target.value)
                setError(null)
              }}
              className="input"
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-new`} className="form-label">
              {t('settings.newPassword')}
            </label>
            <input
              id={`${uid}-new`}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                setError(null)
              }}
              className={`input ${error ? 'input-error' : ''}`}
              aria-invalid={!!error}
              aria-describedby={error ? `${uid}-err` : undefined}
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor={`${uid}-confirm`} className="form-label">
              {t('login.confirmPassword')}
            </label>
            <input
              id={`${uid}-confirm`}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setError(null)
              }}
              className={`input ${error ? 'input-error' : ''}`}
              aria-invalid={!!error}
              aria-describedby={error ? `${uid}-err` : undefined}
              disabled={submitting}
            />
          </div>
          {error && (
            <p id={`${uid}-err`} className="form-error" role="alert">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
              {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <Check className="h-4 w-4" aria-hidden />
              {t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
