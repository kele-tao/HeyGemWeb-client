import { useTranslation } from 'react-i18next'
import { Loader2, Sparkles } from 'lucide-react'
import type { AudioSource } from './StepVoice'

interface Props {
  title: string
  onTitleChange: (value: string) => void
  avatarName: string
  voiceName: string
  audio: AudioSource | null
  script: string
  submitting: boolean
  onSubmit: () => void
  canSubmit: boolean
}

/** 第四步：确认信息并提交（multipart：title, avatar_id, audio_file, voice_id?, script?, category?） */
export default function StepReview({
  title,
  onTitleChange,
  avatarName,
  voiceName,
  audio,
  script,
  submitting,
  onSubmit,
  canSubmit,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-[rgb(var(--text))]">{t('editor.steps.review')}</h2>

      <div>
        <label htmlFor="title-input" className="form-label">
          {t('editor.reviewTitle')}
        </label>
        <input
          id="title-input"
          value={title}
          onChange={(e) => onTitleChange(e.target.value.slice(0, 120))}
          placeholder={t('editor.titlePlaceholder')}
          className="input"
          maxLength={120}
        />
      </div>

      <dl className="divide-y divide-[rgb(var(--hairline))] rounded-lg border border-[rgb(var(--hairline))]">
        {[
          { k: t('editor.reviewAvatar'), v: avatarName || '—' },
          { k: t('editor.reviewVoice'), v: voiceName || '—' },
          {
            k: t('editor.reviewAudio'),
            v: audio ? (audio.kind === 'tts' ? t('editor.reviewAudioTts') : t('editor.reviewAudioUpload')) : '—',
          },
        ].map((row) => (
          <div key={row.k} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <dt className="text-xs text-[rgb(var(--text-3))]">{row.k}</dt>
            <dd className="truncate text-xs font-medium text-[rgb(var(--text))]">{row.v}</dd>
          </div>
        ))}
      </dl>

      {audio && <audio src={audio.url} controls className="h-9 w-full" />}

      {script.trim() && (
        <div>
          <div className="mb-1 text-xs text-[rgb(var(--text-3))]">{t('editor.scriptLabel')}</div>
          <p className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md bg-[rgb(var(--surface-2))] p-3 text-xs leading-relaxed text-[rgb(var(--text-2))] scrollbar-thin">
            {script}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || submitting}
        className="btn-primary btn-lg w-full"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t('editor.submitting')}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" aria-hidden />
            {t('editor.submit')}
          </>
        )}
      </button>
    </div>
  )
}
