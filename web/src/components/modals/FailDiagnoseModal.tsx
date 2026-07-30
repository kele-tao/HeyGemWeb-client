import { useTranslation } from 'react-i18next'
import { AlertTriangle, RefreshCw, FileText, X } from 'lucide-react'
import Modal from '@/components/feedback/Modal'
import type { GeneratedVideo } from '@/types'

interface Props {
  video: GeneratedVideo | null
  onClose: () => void
  onRetry: () => void
}

/** 根据错误信息给一些常见原因建议 */
function diagnose(msg?: string): { cause: string; suggestion: string } {
  if (!msg) {
    return {
      cause: 'unknown',
      suggestion:
        '后端未返回具体错误,可能是 GPU 资源不足或网络中断。请稍后重试。',
    }
  }
  const m = msg.toLowerCase()
  if (m.includes('cuda') || m.includes('gpu') || m.includes('out of memory')) {
    return {
      cause: 'GPU 显存不足',
      suggestion:
        '服务正在处理其他任务或显存被占满。建议等待几分钟后重试,或减少并发合成。',
    }
  }
  if (m.includes('audio') || m.includes('wav')) {
    return {
      cause: '音频处理失败',
      suggestion:
        '请检查音频格式(建议 WAV/MP3),时长不少于 1 秒,采样率 16kHz 以上。',
    }
  }
  if (m.includes('video') || m.includes('face') || m.includes('ffmpeg')) {
    return {
      cause: '视频解码失败',
      suggestion:
        '请检查视频格式(MP4/MOV),确认视频未被损坏,编码格式推荐 H.264。',
    }
  }
  if (m.includes('timeout')) {
    return {
      cause: '处理超时',
      suggestion: '服务响应过慢,可稍后重试。如果持续超时,建议联系管理员。',
    }
  }
  if (m.includes('queue') || m.includes('busy')) {
    return {
      cause: '队列繁忙',
      suggestion: '当前有较多任务排队,请稍后重试。',
    }
  }
  return {
    cause: '未知错误',
    suggestion: '后端返回了详细错误信息,请参考下方原始内容,或联系支持。',
  }
}

export default function FailDiagnoseModal({ video, onClose, onRetry }: Props) {
  const { t } = useTranslation()
  if (!video) return null

  const info = diagnose(video.error_message)

  return (
    <Modal open={!!video} onClose={onClose} size="md" hideClose>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-danger-50 text-danger-500 flex items-center justify-center dark:bg-danger-500/10">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t('fail.title')}</h2>
              <p className="text-xs text-[rgb(var(--text-muted))] truncate max-w-xs">
                {video.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <div>
            <div className="text-xs font-medium text-[rgb(var(--text-muted))] mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {t('fail.reason')}
            </div>
            <div className="text-sm font-medium text-danger-600 dark:text-danger-500">
              {info.cause}
            </div>
          </div>
          <div>
            <div className="text-xs text-[rgb(var(--text-muted))] leading-relaxed bg-[rgb(var(--surface-2))] p-3 rounded-lg">
              💡 {info.suggestion}
            </div>
          </div>
          {video.error_message && (
            <details className="text-xs text-[rgb(var(--text-muted))]">
              <summary className="cursor-pointer hover:text-[rgb(var(--text))]">
                {t('common.search')} {t('common.edit').toLowerCase().includes('e') ? 'details' : '原始错误信息'}
              </summary>
              <pre className="mt-2 p-2 bg-[rgb(var(--surface-2))] rounded text-[10px] overflow-x-auto whitespace-pre-wrap break-all">
                {video.error_message}
              </pre>
            </details>
          )}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            {t('common.close')}
          </button>
          <button
            onClick={() => {
              onRetry()
              onClose()
            }}
            className="btn-primary flex-1"
          >
            <RefreshCw className="w-4 h-4" />
            {t('fail.retry')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
