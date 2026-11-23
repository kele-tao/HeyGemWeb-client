import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/feedback/Modal'

interface Props {
  open: boolean
  title: string
  label: string
  initialValue: string
  maxLength?: number
  submitting?: boolean
  onCancel: () => void
  onSubmit: (value: string) => void
}

/** 通用重命名弹窗（PATCH /api/{avatars,voices,videos}/{id}） */
export default function RenameDialog({
  open,
  title,
  label,
  initialValue,
  maxLength = 120,
  submitting,
  onCancel,
  onSubmit,
}: Props) {
  const { t } = useTranslation()
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const uid = useId()

  useEffect(() => {
    if (open) {
      setValue(initialValue)
      setError(null)
    }
  }, [open, initialValue])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError(t('works.renameEmpty'))
      return
    }
    onSubmit(trimmed)
  }

  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <form onSubmit={submit} className="p-5">
        <label htmlFor={uid} className="form-label">
          {label}
        </label>
        <input
          id={uid}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          className={`input ${error ? 'input-error' : ''}`}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={error ? `${uid}-err` : undefined}
          autoFocus
          disabled={submitting}
        />
        {error && (
          <p id={`${uid}-err`} className="form-error">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary" disabled={submitting}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
