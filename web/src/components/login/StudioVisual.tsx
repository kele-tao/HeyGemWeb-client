import { useTranslation } from 'react-i18next'
import { Mic, Play, ShieldCheck, UserCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import HeyGemLogo from '@/components/brand/HeyGemLogo'

/** 纯 CSS/SVG 的「影棚」左栏视觉，不引用任何外链图片 */
export function StudioVisual() {
  const { t } = useTranslation()
  return (
    <div className="relative hidden h-full min-h-0 flex-col justify-between overflow-hidden bg-[rgb(8_9_11)] px-10 py-8 lg:flex xl:px-14 xl:py-10">
      {/* 顶部柔光渐晕 + 网格 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% -20%, rgba(217,165,89,0.16) 0%, transparent 55%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden
      />

      <div className="relative flex items-center justify-between">
        <HeyGemLogo size={30} />
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] tracking-[0.08em] text-white/50">
          v3.0
        </span>
      </div>

      <div className="relative">
        {/* 16:10 预览框 */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[14px] bg-[rgb(6_7_8)] ring-1 ring-white/10">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 8%, rgba(255,255,255,0.12) 0%, transparent 58%)',
            }}
            aria-hidden
          />
          {/* 人物剪影 */}
          <svg
            viewBox="0 0 320 200"
            className="absolute bottom-0 left-1/2 h-[86%] w-auto -translate-x-1/2 text-white/12"
            aria-hidden
          >
            <ellipse cx="160" cy="86" rx="34" ry="42" fill="currentColor" />
            <path
              d="M160 132c-40 0-66 26-72 68h144c-6-42-32-68-72-68z"
              fill="currentColor"
            />
          </svg>
          {/* 四角取景框线 */}
          {[
            'left-4 top-4 border-l border-t',
            'right-4 top-4 border-r border-t',
            'left-4 bottom-4 border-l border-b',
            'right-4 bottom-4 border-r border-b',
          ].map((cls) => (
            <span
              key={cls}
              className={cn('absolute h-5 w-5 border-white/[0.18]', cls)}
              aria-hidden
            />
          ))}
          {/* 中央播放按钮 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/92 text-[rgb(20_20_19)]">
              <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden />
            </span>
          </div>
          {/* 右下时间码 */}
          <span className="num absolute bottom-3 right-4 text-[11px] text-white/60">
            00:12 / 01:40
          </span>
          {/* 底部遮罩 */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
            style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)',
            }}
            aria-hidden
          />
        </div>
        <p className="mt-2.5 text-[11px] text-white/40">{t('login.sampleCaption')}</p>

        <h1 className="mt-7 text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-white">
          {t('login.brandLine1')}
          <br />
          <span className="text-[rgb(217_165_89)]">{t('login.brandLine2')}</span>
        </h1>
        <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-white/55">
          {t('login.tagline')}
        </p>

        <ul className="mt-6 space-y-3">
          {[
            { icon: UserCircle2, text: t('login.feature1') },
            { icon: Mic, text: t('login.feature2') },
            { icon: ShieldCheck, text: t('login.feature3') },
          ].map((item) => {
            const Icon = item.icon
            return (
              <li key={item.text} className="flex items-center gap-2.5 text-[13px] text-white/65">
                <Icon className="h-4 w-4 flex-shrink-0 text-[rgb(217_165_89)]" aria-hidden />
                {item.text}
              </li>
            )
          })}
        </ul>
      </div>

      <p className="relative text-[11px] text-white/30">{t('login.footnote')}</p>
    </div>
  )
}

/** 768-1023：压缩为 240px 视觉带 */
export function StudioBand() {
  const { t } = useTranslation()
  return (
    <div className="relative flex h-[240px] items-center justify-between overflow-hidden bg-[rgb(8_9_11)] px-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% -30%, rgba(217,165,89,0.18) 0%, transparent 60%)',
        }}
        aria-hidden
      />
      <div className="relative">
        <HeyGemLogo size={28} />
        <p className="mt-3 max-w-xs text-lg font-semibold leading-snug tracking-[-0.02em] text-white">
          {t('login.brandLine1')}
          <br />
          <span className="text-[rgb(217_165_89)]">{t('login.brandLine2')}</span>
        </p>
      </div>
      <div className="relative hidden h-[150px] w-[240px] overflow-hidden rounded-[14px] bg-[rgb(6_7_8)] ring-1 ring-white/10 sm:block">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 60%)',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[rgb(20_20_19)]">
            <Play className="ml-0.5 h-3.5 w-3.5 fill-current" aria-hidden />
          </span>
        </div>
        <span className="num absolute bottom-2 right-3 text-[10px] text-white/60">00:12 / 01:40</span>
      </div>
    </div>
  )
}