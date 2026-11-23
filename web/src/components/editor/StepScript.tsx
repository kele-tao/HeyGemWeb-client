import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Volume2, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/api'
import { ApiError } from '@/api/client'
import TemplatePickerModal from '@/components/modals/TemplatePickerModal'
import type { AudioSource } from './StepVoice'

interface Props {
  script: string
  onScriptChange: (value: string) => void
  voiceId: string
  audio: AudioSource | null
  onAudioChange: (audio: AudioSource | null) => void
}

const MAX_SCRIPT = 2000

/** 第三步：撰写脚本；speech 只传 { text } 拿 blob 试听 */
export default function StepScript({ script, onScriptChange, voiceId, audio, onAudioChange }: Props) {
  const { t } = useTranslation()
  const [generating, setGenerating] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const estimate = (() => {
    if (!script.trim()) return '00:00'
    const seconds = Math.max(1, Math.round(script.length / 4))
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  })()

  const generate = async () => {
    if (!script.trim()) {
      setError(t('editor.scriptRequired'))
      return
    }
    if (!voiceId) {
      setError(t('editor.needVoiceOrAudio'))
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const blob = await api.voices.speech(voiceId, script.trim())
      if (audio) URL.revokeObjectURL(audio.url)
      const url = URL.createObjectURL(blob)
      onAudioChange({ kind: 'tts', blob, url })
      toast.success(t('editor.generatedAudio'))
    } catch (err) {
      const e = err as ApiError
      setError(e.message || t('notify.networkError'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[rgb(var(--text))]">{t('editor.steps.script')}</h2>
        <button
          type="button"
          onClick={() => setShowTemplates(true)}
          className="btn btn-ghost btn-sm"
        >
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          {t('editor.templates')}
        </button>
      </div>

      <div>
        <label htmlFor="script-input" className="form-label">
          {t('editor.scriptLabel')}
        </label>
        <textarea
          id="script-input"
          value={script}
          onChange={(e) => {
            onScriptChange(e.target.value.slice(0, MAX_SCRIPT))
            setError(null)
          }}
          placeholder={t('editor.scriptPlaceholder')}
          className="input min-h-[180px] resize-y"
          maxLength={MAX_SCRIPT}
          aria-invalid={!!error}
          aria-describedby="script-count"
        />
        <div
          id="script-count"
          className="num mt-1 flex items-center justify-between text-[11px] text-[rgb(var(--text-3))]"
        >
          <span>{script.trim() ? t('editor.estimate', { time: estimate }) : ''}</span>
          <span>
            {t('editor.scriptCount', { n: script.length })}
          </span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-[rgb(var(--danger))]" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={generating || !script.trim() || !voiceId}
          className="btn-primary"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t('editor.generating')}
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4" aria-hidden />
              {t('editor.generateAudio')}
            </>
          )}
        </button>
        {audio?.kind === 'tts' && <span className="badge-success">{t('editor.generatedAudio')}</span>}
      </div>

      {audio && (
        <div className="rounded-lg border border-[rgb(var(--hairline))] bg-[rgb(var(--surface-2))] p-3">
          <div className="mb-1.5 text-[11px] font-medium text-[rgb(var(--text-3))]">
            {audio.kind === 'tts' ? t('editor.reviewAudioTts') : t('editor.uploadedAudio')}
          </div>
          <audio src={audio.url} controls className="h-9 w-full" />
        </div>
      )}

      <TemplatePickerModal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={(content) => onScriptChange(content.slice(0, MAX_SCRIPT))}
      />
    </div>
  )
}
