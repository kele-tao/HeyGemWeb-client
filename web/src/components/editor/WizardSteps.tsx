import { useTranslation } from 'react-i18next'
import { Check, UserCircle2, Mic, FileText, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  key: 'avatar' | 'voice' | 'content' | 'synth'
  icon: React.ComponentType<{ className?: string }>
  labelKey: string
  hintKey: string
}

const STEPS: Step[] = [
  { key: 'avatar', icon: UserCircle2, labelKey: 'wizard.step1', hintKey: 'wizard.step1Hint' },
  { key: 'voice', icon: Mic, labelKey: 'wizard.step2', hintKey: 'wizard.step2Hint' },
  { key: 'content', icon: FileText, labelKey: 'wizard.step3', hintKey: 'wizard.step3Hint' },
  { key: 'synth', icon: Sparkles, labelKey: 'wizard.step4', hintKey: 'wizard.step4Hint' },
]

interface Props {
  current: 'avatar' | 'voice' | 'content' | 'synth'
  completed: {
    avatar: boolean
    voice: boolean
    content: boolean
    synth: boolean
  }
  onJump?: (s: 'avatar' | 'voice' | 'content' | 'synth') => void
}

export default function WizardSteps({ current, completed, onJump }: Props) {
  const { t } = useTranslation()
  const currentIndex = STEPS.findIndex((s) => s.key === current)

  return (
    <div className="px-6 py-3.5 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]/80 backdrop-blur-xl relative">
      {/* 装饰光晕 */}
      <div className="absolute inset-0 bg-aurora-soft opacity-30 pointer-events-none" />

      <div className="relative max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((step, idx) => {
            const isCompleted = completed[step.key]
            const isCurrent = current === step.key
            const isClickable = !!onJump && (isCompleted || isCurrent)

            const Icon = step.icon
            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => isClickable && onJump?.(step.key)}
                  disabled={!isClickable}
                  className={cn(
                    'flex flex-col items-center gap-1.5 group transition-all',
                    isClickable ? 'cursor-pointer' : 'cursor-default',
                  )}
                >
                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300',
                      isCompleted
                        ? 'bg-gradient-to-br from-success-500 to-emerald-500 text-white shadow-md'
                        : isCurrent
                          ? 'bg-aurora-1 bg-[length:200%_200%] text-white shadow-glow animate-gradient'
                          : 'bg-[rgb(var(--surface-2))] text-[rgb(var(--text-muted))] border border-[rgb(var(--border))]',
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" strokeWidth={3} />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'text-2xs font-medium hidden sm:block tracking-tight transition-colors',
                      isCurrent
                        ? 'text-brand-600 dark:text-brand-400'
                        : isCompleted
                          ? 'text-success-600 dark:text-success-400'
                          : 'text-[rgb(var(--text-muted))]',
                    )}
                  >
                    {t(step.labelKey)}
                  </div>
                </button>

                {idx < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 h-0.5 rounded-full bg-[rgb(var(--border))] relative overflow-hidden -mt-4 sm:mt-0">
                    <div
                      className={cn(
                        'absolute inset-y-0 left-0 transition-all duration-500 ease-out-expo',
                        isCompleted
                          ? 'w-full bg-gradient-to-r from-success-500 to-emerald-500'
                          : idx < currentIndex
                            ? 'w-full bg-gradient-to-r from-brand-500 to-info-500'
                            : 'w-0',
                      )}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="text-center mt-2.5">
          <p className="text-2xs text-[rgb(var(--text-muted))] font-medium">
            {STEPS[currentIndex] && t(STEPS[currentIndex].hintKey)}
          </p>
        </div>
      </div>
    </div>
  )
}
