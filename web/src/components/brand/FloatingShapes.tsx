import { cn } from '@/lib/utils'

interface Props {
  className?: string
  /** 形状数量 */
  count?: number
}

/**
 * 3D 浮动几何元素 - 用于 hero / modal 背景
 * 纯 CSS 3D transform,无需额外依赖
 */
export default function FloatingShapes({ className, count = 5 }: Props) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      {/* 球体 */}
      <div
        className="absolute top-[15%] left-[10%] w-20 h-20 rounded-full animate-float-slow"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(139,92,246,0.7), rgba(139,92,246,0.2) 60%, transparent 80%)',
          boxShadow: '0 0 60px rgba(139,92,246,0.4)',
          animationDelay: '0s',
        }}
      />

      {/* 立方体 */}
      <div
        className="absolute top-[60%] left-[15%] w-16 h-16 animate-float-slower"
        style={{
          background:
            'linear-gradient(135deg, rgba(6,182,212,0.6), rgba(59,130,246,0.4))',
          boxShadow: '0 0 40px rgba(6,182,212,0.4)',
          transform: 'rotate(45deg)',
          animationDelay: '-3s',
        }}
      />

      {/* 环 */}
      <div
        className="absolute top-[20%] right-[18%] w-24 h-24 rounded-full animate-float-slow"
        style={{
          border: '2px solid rgba(236,72,153,0.5)',
          boxShadow: '0 0 30px rgba(236,72,153,0.3), inset 0 0 20px rgba(236,72,153,0.2)',
          animationDelay: '-5s',
        }}
      />

      {/* 小球 */}
      {count >= 4 && (
        <div
          className="absolute top-[45%] right-[10%] w-12 h-12 rounded-full animate-float-slower"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(245,158,11,0.7), rgba(245,158,11,0.2) 60%, transparent 80%)',
            boxShadow: '0 0 40px rgba(245,158,11,0.4)',
            animationDelay: '-2s',
          }}
        />
      )}

      {/* 三角/光斑 */}
      {count >= 5 && (
        <div
          className="absolute bottom-[20%] right-[25%] w-0 h-0 animate-float-slow"
          style={{
            borderLeft: '18px solid transparent',
            borderRight: '18px solid transparent',
            borderBottom: '30px solid rgba(139,92,246,0.4)',
            filter: 'drop-shadow(0 0 20px rgba(139,92,246,0.4))',
            animationDelay: '-7s',
          }}
        />
      )}

      {/* 小光点装饰 */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-white animate-pulse-glow"
          style={{
            top: `${10 + (i * 7) % 80}%`,
            left: `${(i * 13) % 90 + 5}%`,
            opacity: 0.4,
            animationDelay: `${i * 0.3}s`,
            animationDuration: `${2 + (i % 3)}s`,
          }}
        />
      ))}
    </div>
  )
}
