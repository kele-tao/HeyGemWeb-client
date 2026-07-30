import { cn } from '@/lib/utils'

interface Props {
  className?: string
  size?: number
  showText?: boolean
  /** 仅图标(纯图形) */
  iconOnly?: boolean
}

/**
 * HeyGem 品牌 Logo - 极光渐变 + 闪光效果
 */
export default function HeyGemLogo({
  className,
  size = 36,
  showText = true,
  iconOnly = false,
}: Props) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className="relative"
        style={{ width: size, height: size }}
      >
        {/* 光晕背景 */}
        <div
          className="absolute inset-0 rounded-2xl bg-aurora-1 blur-md opacity-60 animate-pulse-glow"
          aria-hidden
        />
        {/* 主图标 */}
        <svg
          viewBox="0 0 36 36"
          fill="none"
          className="relative w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="logo-grad-2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <filter id="logo-glow">
              <feGaussianBlur stdDeviation="0.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect
            x="0"
            y="0"
            width="36"
            height="36"
            rx="9"
            fill="url(#logo-grad)"
            filter="url(#logo-glow)"
          />
          {/* H 字母(品牌标识) */}
          <path
            d="M11 9h3v7.5h8V9h3v18h-3v-7.5h-8V27h-3V9z"
            fill="white"
            fillOpacity="0.96"
          />
          {/* 装饰小光点 */}
          <circle cx="28" cy="10" r="1.5" fill="url(#logo-grad-2)" />
          <circle cx="9" cy="26" r="1" fill="white" fillOpacity="0.6" />
        </svg>
      </div>
      {showText && !iconOnly && (
        <div className="leading-none">
          <div
            className="font-bold text-[15px] tracking-tight bg-clip-text text-transparent bg-aurora-1 bg-[length:200%_200%] animate-gradient"
          >
            HeyGem
          </div>
          <div className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5 font-medium tracking-wide uppercase">
            AI Studio
          </div>
        </div>
      )}
    </div>
  )
}
