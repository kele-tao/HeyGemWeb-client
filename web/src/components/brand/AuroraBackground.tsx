import { cn } from '@/lib/utils'

interface Props {
  className?: string
  /** 强度 0-1,默认 0.6 */
  intensity?: number
  /** 暗模式色调(默认 true) */
  dark?: boolean
}

/**
 * 极光背景 - 用于 Hero 区或整页背景
 * 纯 CSS + SVG,无外部依赖
 */
export default function AuroraBackground({
  className,
  intensity = 0.6,
  dark = true,
}: Props) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{ opacity: intensity }}
      aria-hidden
    >
      {/* 极光光斑 */}
      <div
        className={cn(
          'absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full blur-3xl animate-aurora-shift',
          dark ? 'bg-brand-500/30' : 'bg-brand-400/20',
        )}
      />
      <div
        className={cn(
          'absolute -top-20 -right-40 w-[36rem] h-[36rem] rounded-full blur-3xl animate-aurora-shift',
          dark ? 'bg-info-500/25' : 'bg-info-400/20',
        )}
        style={{ animationDelay: '-4s' }}
      />
      <div
        className={cn(
          'absolute -bottom-40 left-1/3 w-[32rem] h-[32rem] rounded-full blur-3xl animate-aurora-shift',
          dark ? 'bg-aurora-cyan/20' : 'bg-aurora-cyan/15',
        )}
        style={{ animationDelay: '-8s' }}
      />

      {/* 网格图案(暗模式) */}
      {dark && (
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
      )}

      {/* 噪点纹理 */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
