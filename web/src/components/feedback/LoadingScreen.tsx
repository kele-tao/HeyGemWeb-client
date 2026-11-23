import { Loader2 } from 'lucide-react'

/** 首屏载入（无装饰动画，仅状态反馈） */
export default function LoadingScreen({ label }: { label?: string }) {
  return (
    <div
      className="flex h-full items-center justify-center bg-[rgb(var(--bg))]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--accent))]" />
        <div className="text-xs text-[rgb(var(--text-3))]">{label ?? '加载中…'}</div>
      </div>
    </div>
  )
}
