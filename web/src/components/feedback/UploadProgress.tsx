import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ProgressStage =
  | 'preparing'
  | 'extractingAudio'
  | 'trainingModel'
  | 'finalizing'
  | 'extractingFace'
  | 'buildingModel'
  | 'generatingThumb'

interface Props {
  /** 当前阶段(为 undefined 时组件隐藏) */
  stage: ProgressStage | null
  /** 后端实际进度 0-100,可选 */
  percent?: number
  /** 完成后是否继续显示 */
  done?: boolean
}

const STAGES_ORDER: ProgressStage[] = [
  'preparing',
  'extractingAudio',
  'trainingModel',
  'finalizing',
]

const STAGES_AVATAR: ProgressStage[] = [
  'preparing',
  'extractingFace',
  'buildingModel',
  'generatingThumb',
]

export default function UploadProgress({ stage, percent, done }: Props) {
  const { t } = useTranslation()
  if (!stage) return null

  const isAvatarStage = (STAGES_AVATAR as readonly string[]).includes(stage)
  const list = isAvatarStage ? STAGES_AVATAR : STAGES_ORDER
  const currentIdx = list.indexOf(stage)

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {list.map((s, idx) => {
          const reached = done || idx <= currentIdx
          const active = !done && idx === currentIdx
          return (
            <div
              key={s}
              className={cn(
                'flex items-center gap-2.5 text-sm transition',
                reached
                  ? active
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-success-600 dark:text-success-500'
                  : 'text-[rgb(var(--text-muted))]',
              )}
            >
              {done || idx < currentIdx ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : active ? (
                <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-current flex-shrink-0 opacity-40" />
              )}
              <span>{t(`uploading.${s}`)}</span>
            </div>
          )
        })}
      </div>

      {percent != null && (
        <div className="h-1 bg-[rgb(var(--surface-2))] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-info-500 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      )}
    </div>
  )
}

/** 简单的阶段模拟器 - 用于前端没真实进度时给用户视觉反馈 */
export function useProgressSimulator(
  stages: ProgressStage[],
  interval = 1200,
  onDone?: () => void,
) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (idx >= stages.length) {
      onDone?.()
      return
    }
    const t = setTimeout(() => setIdx((i) => i + 1), interval)
    return () => clearTimeout(t)
  }, [idx, stages, interval, onDone])
  return {
    stage: stages[idx] ?? null,
    done: idx >= stages.length,
  }
}
