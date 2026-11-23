import { useTranslation } from 'react-i18next'
import { Play, UserCircle2 } from 'lucide-react'

interface Props {
  onCreateAvatar: () => void
  onViewWorks: () => void
}

/** 新用户空状态：左预览舞台 + 右三步引导（不显示一排 0） */
export default function FirstRunEmpty({ onCreateAvatar, onViewWorks }: Props) {
  const { t } = useTranslation()
  const steps = [
    { n: 1, title: t('home.step1') },
    { n: 2, title: t('home.step2') },
    { n: 3, title: t('home.step3') },
  ]

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative aspect-video bg-[rgb(var(--preview))] lg:aspect-auto lg:min-h-[300px]">
          <div className="stage-light absolute inset-0" aria-hidden />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/40">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/25">
              <Play className="ml-0.5 h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm text-white/60">{t('home.firstRunTitle')}</span>
          </div>
          <span className="num absolute bottom-3 right-4 text-[11px] text-white/40">
            00:00 / 00:00
          </span>
        </div>

        <div className="p-5 lg:p-6">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-[rgb(var(--text))]">
            {t('home.firstRunTitle')}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[rgb(var(--text-3))]">
            {t('home.firstRunDesc')}
          </p>

          <ol className="mt-5 space-y-3">
            {steps.map((step) => (
              <li key={step.n} className="flex items-start gap-3">
                <span className="num flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] text-[11px] font-semibold text-[rgb(var(--text-2))]">
                  {step.n}
                </span>
                <span className="pt-0.5 text-[13px] leading-snug text-[rgb(var(--text-2))]">
                  {step.title}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={onCreateAvatar} className="btn-primary">
              <UserCircle2 className="h-4 w-4" aria-hidden />
              {t('home.createAvatar')}
            </button>
            <button type="button" onClick={onViewWorks} className="btn-secondary">
              {t('home.viewSamples')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
