import { useTranslation } from 'react-i18next'
import Modal from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  cancelText,
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="p-6">
        <p className="text-sm text-[rgb(var(--text-muted))] leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary">
            {cancelText ?? t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={danger ? 'btn-danger' : 'btn-primary'}
          >
            {confirmText ?? t('common.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
