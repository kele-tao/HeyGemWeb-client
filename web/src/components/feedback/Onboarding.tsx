import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronRight,
  X,
  UserCircle2,
  Mic,
  Sparkles,
  Film,
  Check,
} from 'lucide-react'
import FloatingShapes from '@/components/brand/FloatingShapes'
import AuroraBackground from '@/components/brand/AuroraBackground'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'heygem.onboarded'

interface Step {
  icon: React.ReactNode
  titleKey: string
  descKey: string
  gradient: string
  decoration: React.ReactNode
}

interface OnboardingProps {
  /** 强制显示(用于菜单"重看引导") */
  force?: boolean
  onClose?: () => void
}

export default function Onboarding({ force = false, onClose }: OnboardingProps = {}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(force)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (force) {
      setOpen(true)
      return
    }
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) {
      const timer = setTimeout(() => setOpen(true), 600)
      return () => clearTimeout(timer)
    }
  }, [force])

  const finish = () => {
    if (!force) localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
    onClose?.()
  }

  if (!open) return null

  const steps: Step[] = [
    {
      icon: <Sparkles className="w-10 h-10 text-white" />,
      titleKey: 'onboarding.step1Title',
      descKey: 'onboarding.step1Desc',
      gradient: 'from-brand-600 via-brand-500 to-info-500',
      decoration: (
        <div className="grid grid-cols-3 gap-2 max-w-[14rem] mx-auto">
          {['🎬', '🎙️', '👤', '🔊', '✨', '🚀'].map((e, i) => (
            <div
              key={e}
              className="aspect-square rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl ring-1 ring-white/20"
              style={{ animation: `float 6s ease-in-out ${i * 0.2}s infinite` }}
            >
              {e}
            </div>
          ))}
        </div>
      ),
    },
    {
      icon: <UserCircle2 className="w-10 h-10 text-white" />,
      titleKey: 'onboarding.step2Title',
      descKey: 'onboarding.step2Desc',
      gradient: 'from-info-500 via-info-400 to-cyan-500',
      decoration: (
        <div className="flex justify-center">
          <div
            className="w-28 h-28 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-6xl ring-2 ring-white/30 shadow-2xl"
            style={{ animation: 'pulseGlow 2.5s ease-in-out infinite' }}
          >
            👤
          </div>
        </div>
      ),
    },
    {
      icon: <Mic className="w-10 h-10 text-white" />,
      titleKey: 'onboarding.step3Title',
      descKey: 'onboarding.step3Desc',
      gradient: 'from-warning-500 via-pink-500 to-rose-500',
      decoration: (
        <div className="flex items-end justify-center gap-1 h-24 px-4">
          {[8, 16, 24, 32, 40, 32, 24, 16, 24, 32, 40, 32, 24, 16, 8].map((h, i) => (
            <div
              key={i}
              className="w-1.5 bg-white/80 rounded-full"
              style={{
                height: `${h * 1.5}px`,
                animation: `pulse 0.${5 + (i % 3)}s ease-in-out ${i * 0.1}s infinite`,
              }}
            />
          ))}
        </div>
      ),
    },
    {
      icon: <Film className="w-10 h-10 text-white" />,
      titleKey: 'onboarding.step4Title',
      descKey: 'onboarding.step4Desc',
      gradient: 'from-pink-500 via-rose-500 to-orange-500',
      decoration: (
        <div className="flex justify-center">
          <div
            className="w-36 h-24 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center ring-2 ring-white/30 shadow-2xl"
            style={{ animation: 'pulseGlow 2.5s ease-in-out infinite' }}
          >
            <Film className="w-10 h-10 text-white" />
          </div>
        </div>
      ),
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-ink-950/70 backdrop-blur-xl animate-fade-in">
      <AuroraBackground intensity={0.4} dark />

      <div className="relative w-full max-w-md animate-slide-up">
        {/* 浮动 3D 元素 */}
        <FloatingShapes count={4} />

        <div className="relative bg-[rgb(var(--surface))]/95 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-xl border border-[rgb(var(--border))]">
          {/* 顶部 hero */}
          <div
            className={cn(
              'relative bg-gradient-to-br p-8 pb-12 overflow-hidden',
              current.gradient,
            )}
          >
            {/* 光斑 */}
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-white/5 blur-3xl" />

            <button
              onClick={finish}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition backdrop-blur-sm"
              title={t('onboarding.skip')}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative flex justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center ring-2 ring-white/30 shadow-2xl">
                {current.icon}
              </div>
            </div>

            <div className="relative">{current.decoration}</div>
          </div>

          {/* 文字内容 */}
          <div className="relative px-6 pt-6 pb-6 -mt-6">
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold tracking-tight text-balance">
                {t(current.titleKey)}
              </h2>
              <p className="text-sm text-[rgb(var(--text-muted))] mt-2 leading-relaxed text-pretty max-w-sm mx-auto">
                {t(current.descKey)}
              </p>
            </div>

            {/* 进度点 */}
            <div className="flex justify-center items-center gap-1.5 mb-5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === step
                      ? 'w-8 bg-aurora-1'
                      : i < step
                        ? 'w-1.5 bg-success-500'
                        : 'w-1.5 bg-[rgb(var(--border))]',
                  )}
                  aria-label={`Step ${i + 1}`}
                />
              ))}
            </div>

            {/* 步骤计数 */}
            <div className="text-center text-2xs text-[rgb(var(--text-muted))] mb-4 num">
              {step + 1} / {steps.length}
            </div>

            {/* 按钮 */}
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="btn-secondary flex-1"
                >
                  {t('common.back')}
                </button>
              )}
              <button onClick={finish} className="btn-ghost flex-1 text-xs">
                {t('onboarding.skip')}
              </button>
              <button
                onClick={() => (isLast ? finish() : setStep(step + 1))}
                className="btn-primary flex-1"
              >
                {isLast ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t('onboarding.start')}
                  </>
                ) : (
                  <>
                    {t('onboarding.next')}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
