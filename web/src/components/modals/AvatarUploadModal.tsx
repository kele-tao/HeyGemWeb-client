import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Check, FileVideo, Lightbulb, AlertCircle } from 'lucide-react'
import Modal from '@/components/feedback/Modal'
import { api } from '@/api'
import { useAppStore } from '@/store/useAppStore'
import toast from 'react-hot-toast'
import { cn, formatBytes } from '@/lib/utils'
import UploadProgress, {
  useProgressSimulator,
  type ProgressStage,
} from '@/components/feedback/UploadProgress'
import { useMediaMeta } from '@/hooks/useMediaMeta'

interface Props {
  open: boolean
  onClose: () => void
}

const MAX_SIZE = 500 * 1024 * 1024
const MIN_DURATION = 30
const MAX_DURATION = 600
const STAGES: ProgressStage[] = [
  'preparing',
  'extractingFace',
  'buildingModel',
  'generatingThumb',
]

export default function AvatarUploadModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const addAvatar = useAppStore((s) => s.addAvatar)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const meta = useMediaMeta(file)

  const { stage } = useProgressSimulator(
    uploading && !done ? STAGES : [],
    800,
    () => {},
  )

  const reset = () => {
    setName('')
    setFile(null)
    setUploading(false)
    setDragOver(false)
    setDone(false)
  }

  const handleClose = () => {
    if (uploading && !done) return
    reset()
    onClose()
  }

  // 客户端校验
  const validationError = (() => {
    if (!file) return null
    if (meta.loading) return null
    if (meta.error) return meta.error
    if (meta.duration && meta.duration < MIN_DURATION) {
      return `视频时长太短,需 ≥ ${MIN_DURATION} 秒(当前 ${Math.round(meta.duration)} 秒)`
    }
    if (meta.duration && meta.duration > MAX_DURATION) {
      return `视频时长太长,需 ≤ ${MAX_DURATION / 60} 分钟(当前 ${Math.round(meta.duration / 60)} 分钟)`
    }
    if (meta.width && meta.height) {
      const min = Math.min(meta.width, meta.height)
      if (min < 480) return `分辨率太低,建议 ≥ 720P(当前 ${meta.width}×${meta.height})`
    }
    return null
  })()

  const canSubmit = !!name.trim() && !!file && !validationError && !uploading

  const handleFile = (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith('video/')) {
      toast.error(t('notify.fileTypeError'))
      return
    }
    if (f.size > MAX_SIZE) {
      toast.error(t('notify.fileTooBig'))
      return
    }
    setFile(f)
    if (!name) {
      setName(f.name.replace(/\.[^/.]+$/, ''))
    }
  }

  const handleSubmit = async () => {
    if (!name.trim() || !file) {
      toast.error(t('notify.avatarNameAndFile'))
      return
    }
    if (validationError) {
      toast.error(validationError)
      return
    }
    setUploading(true)
    setDone(false)
    try {
      const data = await api.uploadAvatar(name.trim(), file)
      setDone(true)
      setTimeout(() => {
        addAvatar({
          ...data,
          date: data.date || new Date().toISOString().slice(0, 10),
        })
        toast.success(t('notify.avatarUploadOk'), { icon: '🎉' })
        handleClose()
      }, 1200)
    } catch (e: any) {
      toast.error(e.message || t('notify.avatarUploadFail'))
      setUploading(false)
    }
  }

  const reqs = [
    { k: 'duration' },
    { k: 'single' },
    { k: 'face' },
    { k: 'light' },
    { k: 'stable' },
  ] as const

  return (
    <Modal open={open} onClose={handleClose} title={t('modal.uploadAvatar')} size="2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        {/* 左侧:输入 + 上传区 */}
        <div className="space-y-4 flex flex-col">
          <div>
            <label className="text-sm font-medium block mb-1.5">
              {t('modal.avatarName')}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('modal.avatarNamePlaceholder')}
              className="input"
              disabled={uploading}
            />
          </div>

          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              handleFile(e.dataTransfer.files[0])
            }}
            className={cn(
              'flex-1 min-h-[200px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center p-6 cursor-pointer transition',
              dragOver
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10'
                : 'border-[rgb(var(--border))] hover:border-brand-500',
              uploading && 'pointer-events-none opacity-60',
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {file ? (
              <>
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-3',
                    validationError
                      ? 'bg-danger-50 text-danger-600'
                      : 'bg-success-50 text-success-600',
                  )}
                >
                  {validationError ? (
                    <AlertCircle className="w-6 h-6" />
                  ) : (
                    <FileVideo className="w-6 h-6" />
                  )}
                </div>
                <div className="text-sm font-medium">{file.name}</div>
                <div className="text-xs text-[rgb(var(--text-muted))] mt-1 num">
                  {formatBytes(file.size)}
                  {meta.duration && ` · ${Math.round(meta.duration)}秒`}
                  {meta.width && meta.height && ` · ${meta.width}×${meta.height}`}
                  {meta.loading && ' · 读取中...'}
                </div>
                {validationError && (
                  <div className="text-xs text-danger-600 mt-2 px-2 max-w-xs">
                    {validationError}
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    inputRef.current?.click()
                  }}
                  className="btn-ghost mt-3 text-sm"
                  disabled={uploading}
                >
                  {t('common.edit')}
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-medium mb-1">
                  {t('modal.selectVideo')}
                </div>
                <div className="text-xs text-[rgb(var(--text-muted))]">
                  {t('modal.videoHint')}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 右侧:拍摄要求 */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[rgb(var(--text))]">
            <Lightbulb className="w-4 h-4 text-warning-500" />
            {t('modal.requirements')}
          </div>

          <ul className="space-y-2.5">
            {reqs.map((r) => (
              <li
                key={r.k}
                className="flex items-start gap-2.5 text-sm text-[rgb(var(--text-muted))]"
              >
                <Check className="w-4 h-4 text-success-500 flex-shrink-0 mt-0.5" />
                <span>{t(`modal.reqs.${r.k}`)}</span>
              </li>
            ))}
          </ul>

          <div className="p-3 rounded-lg bg-warning-50 dark:bg-warning-500/10 border border-warning-500/20 text-xs text-warning-700 dark:text-warning-500">
            {t('notify.fileTypeError').includes('Unsupported')
              ? 'Tip: A clear, front-facing video gives the best digital human quality.'
              : '提示:正面、光线充足、五官清晰的视频,生成的数字人效果最好。'}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] space-y-3">
        {uploading && (
          <UploadProgress stage={stage} done={done} />
        )}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={uploading && !done}
            className="btn-secondary"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn-primary"
          >
            <Upload className="w-4 h-4" />
            {uploading
              ? done
                ? t('common.loading').includes('Load')
                  ? 'Done'
                  : '完成'
                : t('modal.uploading')
              : t('modal.submit')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
