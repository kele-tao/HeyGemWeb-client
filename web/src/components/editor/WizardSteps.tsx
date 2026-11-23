import { Check, FileText, Mic, Sparkles, UserCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export type StepKey = 'avatar' | 'voice' | 'script' | 'review'

const STEPS: Array<{ key: StepKey; icon: typeof UserCircle2; labelKey: string; hintKey: string }> = [
  { key: 'avatar', icon: UserCircle2, labelKey: 'editor.steps.avatar', hintKey: 'editor.avatarHint' },
  { key: 'voice', icon: Mic, labelKey: 'editor.steps.voice', hintKey: 'editor.voiceHint' },
  { key: 'script', icon: FileText, labelKey: 'editor.steps.script', hintKey: 'editor.scriptHint' },
  { key: 'review', icon: Sparkles, labelKey: 'editor.steps.review', hintKey: 'editor.reviewHint' },
]

interface Props {
  current: StepKey
  completed: Record<StepKey, boolean>
  onJump: (key: StepKey) => void
}

/** 编辑器步骤条：静态表面色 + 强调竖条，无渐变与循环动画 */
export default function WizardSteps({ current, completed, onJump }: Props) {
  const { t } = useTranslation()
  const currentIndex = STEPS.findIndex((s) => s.key === current)

  return (
    <div className="border-b border-[rgb(var(--hairline))] bg-[rgb(var(--surface))] px-4 py-3 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-1">
          {STEPS.map((step, idx) => {
            const done = completed[step.key]
            const active = current === step.key
            const clickable = done || active || idx <= currentIndex
            const Icon = step.icon
            return (
              <div key={step.key} className="flex flex-1 items-center last:flex-none">
                <button
                  type="button"
                  onClick={() => clickable && onJump(step.key)}
                  disabled={!clickable}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors',
                    clickable ? 'cursor-pointer' : 'cursor-default',
                    active
                      ? 'bg-[rgb(var(--surface-2))] text-[rgb(var(--text))]'
                      : 'text-[rgb(var(--text-3))] hover:text-[rgb(var(--text-2))]',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[11px]',
                      done
                        ? 'border-[rgb(var(--success))]/30 bg-[rgb(var(--success))]/12 text-[rgb(var(--success))]'
                        : active
                          ? 'border-[rgb(var(--accent))]/40 bg-[rgb(var(--accent))]/12 text-[rgb(var(--accent))]'
                          : 'border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] text-[rgb(var(--text-3))]',
                    )}
                  >
                    {done ? (
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                    ) : (
                      <Icon className="h-3 w-3" aria-hidden />
                    )}
                  </span>
                  <span className="hidden whitespace-nowrap text-xs font-medium sm:block">
                    {t(step.labelKey)}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="mx-1 h-px flex-1 bg-[rgb(var(--hairline))]" aria-hidden />
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-center text-[11px] text-[rgb(var(--text-3))]">
          {t(STEPS[currentIndex]?.hintKey ?? 'editor.avatarHint')}
        </p>
      </div>
    </div>
  )
}
