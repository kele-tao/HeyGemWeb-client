import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import Modal from '@/components/feedback/Modal'
import { useTranslation } from 'react-i18next'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [state, setState] = useState<
    (ConfirmOptions & { resolve: (v: boolean) => void }) | null
  >(null)

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, resolve })
      }),
    [],
  )

  const handleClose = (v: boolean) => {
    state?.resolve(v)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <Modal open onClose={() => handleClose(false)} size="sm" hideClose>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2 text-balance">
              {state.title}
            </h3>
            <p className="text-sm text-[rgb(var(--text-muted))] leading-relaxed text-pretty">
              {state.message}
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => handleClose(false)}
                className="btn-secondary"
              >
                {state.cancelText ?? t('common.cancel')}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={state.danger ? 'btn-danger' : 'btn-primary'}
              >
                {state.confirmText ?? t('common.confirm')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx.confirm
}
