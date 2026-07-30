import { Sparkles } from 'lucide-react'
import AuroraBackground from '@/components/brand/AuroraBackground'

export default function LoadingScreen() {
  return (
    <div className="flex h-full items-center justify-center relative overflow-hidden bg-[rgb(var(--bg))]">
      <AuroraBackground intensity={0.8} />
      <div className="relative flex flex-col items-center gap-5">
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-aurora-1 blur-2xl opacity-70 animate-pulse-glow" />
          <div className="relative w-16 h-16 rounded-3xl bg-aurora-1 bg-[length:200%_200%] animate-gradient flex items-center justify-center text-white shadow-glow-lg">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>
        </div>
        <div className="text-center">
          <div className="text-base font-semibold bg-clip-text text-transparent bg-aurora-1 bg-[length:200%_200%] animate-gradient">
            HeyGem
          </div>
          <div className="text-xs text-[rgb(var(--text-muted))] mt-1.5 tracking-wide">
            AI Digital Human Studio
          </div>
        </div>
        {/* 进度条 */}
        <div className="w-32 h-0.5 bg-[rgb(var(--surface-2))] rounded-full overflow-hidden">
          <div className="h-full bg-aurora-1 animate-progress" />
        </div>
      </div>
    </div>
  )
}
