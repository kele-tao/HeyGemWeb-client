import { useTranslation } from 'react-i18next'
import Modal from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** 破坏性操作二次确认（删除 / 退出登录） */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  cancelText,
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="p-5">
        <p className="text-sm leading-relaxed text-[rgb(var(--text-2))] text-pretty">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary">
            {cancelText ?? t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={danger ? 'btn-danger' : 'btn-primary'}
          >
            {confirmText ?? t('common.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
