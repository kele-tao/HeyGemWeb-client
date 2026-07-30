import { useEffect, useState } from 'react'

interface Piece {
  id: number
  x: number
  delay: number
  duration: number
  color: string
  rotate: number
  size: number
}

const COLORS = [
  '#7c3aed',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#06b6d4',
]

interface Props {
  /** 自动关闭时间,ms */
  duration?: number
  onDone?: () => void
}

export default function Confetti({ duration = 2500, onDone }: Props) {
  const [pieces, setPieces] = useState<Piece[]>([])

  useEffect(() => {
    const next: Piece[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.3,
      duration: 1.5 + Math.random() * 1.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotate: Math.random() * 360,
      size: 6 + Math.random() * 8,
    }))
    setPieces(next)
    const t = setTimeout(() => {
      setPieces([])
      onDone?.()
    }, duration)
    return () => clearTimeout(t)
  }, [duration, onDone])

  return (
    <div className="fixed inset-0 z-[2000] pointer-events-none overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s ${p.delay}s cubic-bezier(0.4, 0, 0.6, 1) forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
