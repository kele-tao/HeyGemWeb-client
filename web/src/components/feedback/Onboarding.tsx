import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Film, Mic, UserCircle2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Modal from './Modal'

const STORAGE_KEY = 'heygem.onboarded'

interface OnboardingProps {
  force?: boolean
  onClose?: () => void
}

const STEPS = [
  { icon: UserCircle2, titleKey: 'onboarding.step1Title', descKey: 'onboarding.step1Desc' },
  { icon: UserCircle2, titleKey: 'onboarding.step2Title', descKey: 'onboarding.step2Desc' },
  { icon: Mic, titleKey: 'onboarding.step3Title', descKey: 'onboarding.step3Desc' },
  { icon: Film, titleKey: 'onboarding.step4Title', descKey: 'onboarding.step4Desc' },
]

/** 新手引导：静态图标与发丝边框，无渐变光斑与循环动画 */
export default function Onboarding({ force = false, onClose }: OnboardingProps = {}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(force)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (force) {
      setOpen(true)
      return
    }
    let done: string | null = null
    try {
      done = localStorage.getItem(STORAGE_KEY)
    } catch {
      done = null
    }
    if (!done) {
      const timer = setTimeout(() => setOpen(true), 600)
      return () => clearTimeout(timer)
    }
  }, [force])

  const finish = () => {
    if (!force) {
      try {
        localStorage.setItem(STORAGE_KEY, '1')
      } catch {
        /* ignore */
      }
    }
    setOpen(false)
    onClose?.()
  }

  if (!open) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const Icon = current.icon

  return (
    <Modal open={open} onClose={finish} size="md">
      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] text-[rgb(var(--accent))]">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-3))]">
              {step + 1} / {STEPS.length}
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              {t(current.titleKey)}
            </h2>
          </div>
          <button
            type="button"
            onClick={finish}
            className="btn btn-ghost btn-icon btn-sm ml-auto"
            aria-label={t('onboarding.skip')}
            title={t('onboarding.skip')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-[rgb(var(--text-2))] text-pretty">
          {t(current.descKey)}
        </p>

        <div className="mt-5 flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`第 ${i + 1} 步`}
              aria-current={i === step}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === step
                  ? 'w-6 bg-[rgb(var(--accent))]'
                  : 'w-1.5 bg-[rgb(var(--hairline-strong))]',
              )}
            />
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={finish} className="btn-ghost btn-sm">
            {t('onboarding.skip')}
          </button>
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary btn-sm">
              {t('common.back')}
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? finish() : setStep(step + 1))}
            className="btn-primary btn-sm"
          >
            {isLast ? t('onboarding.start') : t('onboarding.next')}
            {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </Modal>
  )
}
