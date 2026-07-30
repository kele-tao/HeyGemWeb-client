import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mic, Upload, FileAudio, AlertCircle } from 'lucide-react'
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

const MAX_SIZE = 200 * 1024 * 1024
const MIN_DURATION = 30
const STAGES: ProgressStage[] = [
  'preparing',
  'extractingAudio',
  'trainingModel',
  'finalizing',
]

export default function VoiceUploadModal({ open, onClose }: Props) {
  const { t } = useTranslation()
  const addVoice = useAppStore((s) => s.addVoice)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [trainResult, setTrainResult] = useState<{
    asr_format_audio_url: string
    reference_audio_text: string
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const meta = useMediaMeta(file)

  const { stage, done: stageDone } = useProgressSimulator(
    uploading && !trainResult ? STAGES : [],
    1100,
    () => {},
  )

  // 客户端校验
  const validationError = (() => {
    if (!file) return null
    if (meta.loading) return null
    if (meta.error) return meta.error
    if (meta.duration && meta.duration < MIN_DURATION) {
      return `音频时长太短,需 ≥ ${MIN_DURATION} 秒(当前 ${Math.round(meta.duration)} 秒)`
    }
    return null
  })()

  const canSubmit =
    !!name.trim() && !!file && !validationError && !uploading

  const reset = () => {
    setName('')
    setFile(null)
    setUploading(false)
    setDragOver(false)
    setTrainResult(null)
  }

  const handleClose = () => {
    if (uploading && !trainResult) return
    reset()
    onClose()
  }

  const handleFile = (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith('audio/')) {
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
      toast.error(t('notify.voiceNameAndFile'))
      return
    }
    setUploading(true)
    setTrainResult(null)
    try {
      const data = await api.trainVoice(file)
      setTrainResult(data)
      // 等进度条跑完再关闭,给用户完成感
      setTimeout(() => {
        addVoice({
          id: `voice-${Date.now()}`,
          name: name.trim(),
          status: 'complete',
          date: new Date().toISOString().slice(0, 10),
          asr_format_audio_url: data.asr_format_audio_url,
          reference_audio_text: data.reference_audio_text,
        })
        toast.success(t('notify.voiceTrainOk'))
        handleClose()
      }, 1500)
    } catch (e: any) {
      toast.error(e.message || t('notify.voiceTrainFail'))
      setUploading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={t('modal.cloneVoice')}>
      <div className="p-6 space-y-5">
        <div>
          <label className="text-sm font-medium block mb-1.5">
            {t('modal.voiceName')}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('modal.voiceNamePlaceholder')}
            className="input"
            disabled={uploading}
          />
        </div>

        <div>
          <label className="text-sm font-medium block mb-1.5">
            {t('modal.selectAudio')}
          </label>
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
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition',
              dragOver
                ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10'
                : 'border-[rgb(var(--border))] hover:border-brand-500',
              uploading && 'pointer-events-none opacity-60',
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {file ? (
              <div className="w-full">
                <div className="flex items-center justify-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      validationError
                        ? 'bg-danger-50 text-danger-600'
                        : 'bg-success-50 text-success-600',
                    )}
                  >
                    {validationError ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <FileAudio className="w-5 h-5" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">{file.name}</div>
                    <div className="text-xs text-[rgb(var(--text-muted))] num">
                      {formatBytes(file.size)}
                      {meta.duration && ` · ${Math.round(meta.duration)}秒`}
                      {meta.loading && ' · 读取中...'}
                    </div>
                  </div>
                </div>
                {validationError && (
                  <div className="text-xs text-danger-600 mt-2 text-center px-2">
                    {validationError}
                  </div>
                )}
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto text-[rgb(var(--text-muted))] mb-2" />
                <div className="text-sm text-[rgb(var(--text-muted))]">
                  {t('modal.selectAudio')}
                </div>
              </>
            )}
          </div>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-2">
            {t('modal.audioHint')}
          </p>
        </div>

        {uploading && (
          <div className="p-4 rounded-lg bg-brand-50/50 dark:bg-brand-500/5 border border-brand-500/20">
            <UploadProgress stage={stage} done={!!trainResult || stageDone} />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            disabled={uploading && !trainResult}
            className="btn-secondary"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn-primary"
          >
            <Mic className="w-4 h-4" />
            {uploading
              ? trainResult
                ? t('common.loading').includes('Load')
                  ? 'Done'
                  : '完成'
                : t('modal.training')
              : t('modal.startTraining')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
