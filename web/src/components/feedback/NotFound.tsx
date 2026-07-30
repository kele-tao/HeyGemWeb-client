import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import AuroraBackground from '@/components/brand/AuroraBackground'
import FloatingShapes from '@/components/brand/FloatingShapes'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="relative h-full flex items-center justify-center overflow-hidden bg-[rgb(var(--bg))]">
      <AuroraBackground intensity={0.6} />
      <FloatingShapes count={4} />

      <div className="relative text-center px-6 max-w-md">
        <div className="relative inline-block">
          <div className="absolute inset-0 rounded-full bg-aurora-1 blur-3xl opacity-40 animate-pulse-glow" />
          <div className="relative text-[10rem] lg:text-[14rem] font-bold leading-none bg-clip-text text-transparent bg-aurora-1 bg-[length:200%_200%] animate-gradient tracking-tighter">
            404
          </div>
        </div>
        <h1 className="text-2xl font-bold mt-2 tracking-tight">
          页面去火星了
        </h1>
        <p className="text-sm text-[rgb(var(--text-muted))] mt-2 leading-relaxed">
          你要找的页面不存在,或者已经被外星人带走了。
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
          <button onClick={() => navigate('/')} className="btn-primary">
            <Home className="w-4 h-4" />
            回首页
          </button>
        </div>
      </div>
    </div>
  )
}
