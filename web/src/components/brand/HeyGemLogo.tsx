import { cn } from '@/lib/utils'

interface Props {
  className?: string
  size?: number
  showText?: boolean
  /** 仅图标（纯图形） */
  iconOnly?: boolean
}

/**
 * HeyGem 品牌标识：暖铜色单色方块 + 字母 H。
 * 无渐变位移动画、无发光（设计体系 §1.1「无装饰性动画」）。
 */
export default function HeyGemLogo({
  className,
  size = 32,
  showText = true,
  iconOnly = false,
}: Props) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className="relative inline-flex items-center justify-center rounded-lg bg-[rgb(var(--accent))] text-[rgb(var(--accent-contrast))]"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-[55%] w-[55%]"
          aria-hidden
        >
          <path
            d="M5 3.5h2.6v6.4h8.8V3.5H19v17h-2.6v-7.4H7.6v7.4H5v-17z"
            fill="currentColor"
          />
        </svg>
      </span>
      {showText && !iconOnly && (
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[15px] font-semibold tracking-tight text-[rgb(var(--text))]">
            HeyGem
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-3))]">
            Studio
          </span>
        </span>
      )}
    </div>
  )
}