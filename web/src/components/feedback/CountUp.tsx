import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  value: number
  duration?: number
  className?: string
  /** 格式化函数,默认原样显示 */
  format?: (n: number) => string
  /** 后缀,如 % */
  suffix?: string
}

/**
 * 数字滚动动画 - 当数字变化时平滑过渡
 */
export default function CountUp({
  value,
  duration = 800,
  className,
  format = (n) => Math.round(n).toString(),
  suffix = '',
}: Props) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    fromRef.current = display
    startRef.current = null

    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(1, elapsed / duration)
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - t, 3)
      const current = fromRef.current + (value - fromRef.current) * eased
      setDisplay(current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  return (
    <span className={cn('num tabular-nums', className)}>
      {format(display)}
      {suffix}
    </span>
  )
}
