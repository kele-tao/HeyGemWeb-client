import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/api'
import { ApiError } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import { useProjectStore } from '@/store/useProjectStore'
import { useConfirm } from '@/hooks/useConfirm'
import { guessCategory } from '@/lib/category'
import LoadingScreen from '@/components/feedback/LoadingScreen'
import WizardSteps, { type StepKey } from '@/components/editor/WizardSteps'
import StepAvatar from '@/components/editor/StepAvatar'
import StepVoice, { type AudioSource } from '@/components/editor/StepVoice'
import StepScript from '@/components/editor/StepScript'
import StepReview from '@/components/editor/StepReview'
import PreviewPanel from '@/components/editor/PreviewPanel'

/**
 * 创作页（步骤：形象 → 声音 → 脚本 → 提交）。
 * 提交走 POST /api/videos（multipart），成功后用返回的 Video 更新列表并跳作品库。
 */
export default function EditorPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const confirm = useConfirm()

  const project = useProjectStore()
  const setProject = useProjectStore((s) => s.setProject)
  const resetProject = useProjectStore((s) => s.resetProject)
  const avatars = useAppStore((s) => s.avatars)
  const voices = useAppStore((s) => s.voices)
  const upsertVideo = useAppStore((s) => s.upsertVideo)
  const getAvatarById = useAppStore((s) => s.getAvatarById)
  const getVoiceById = useAppStore((s) => s.getVoiceById)
  const isDataLoaded = useAppStore((s) => s.isDataLoaded)

  const [step, setStep] = useState<StepKey>('avatar')
  const [audio, setAudio] = useState<AudioSource | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const audioRef = useRef<AudioSource | null>(null)

  // 初始化草稿 / 默认选中最近可用的形象与声音
  const initedRef = useRef(false)
  useEffect(() => {
    if (initedRef.current) return
    initedRef.current = true
    const store = useProjectStore.getState()
    if (!store.id) store.loadDraft()
    const readyAvatars = avatars.filter((a) => a.status === 'ready')
    const readyVoices = voices.filter((v) => v.status === 'complete')
    const patch: Record<string, string> = {}
    if (!useProjectStore.getState().avatarId && readyAvatars[0]) patch.avatarId = readyAvatars[0].id
    if (!useProjectStore.getState().voiceId && readyVoices[0]) patch.voiceId = readyVoices[0].id
    if (Object.keys(patch).length > 0) setProject(patch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 释放 blob URL
  useEffect(() => {
    audioRef.current = audio
  }, [audio])
  useEffect(
    () => () => {
      if (audioRef.current) URL.revokeObjectURL(audioRef.current.url)
    },
    [],
  )

  const avatar = getAvatarById(project.avatarId)
  const voice = getVoiceById(project.voiceId)

  const completed = useMemo<Record<StepKey, boolean>>(
    () => ({
      avatar: !!project.avatarId,
      voice: !!project.voiceId,
      script: project.script.trim().length > 0,
      review: false,
    }),
    [project.avatarId, project.voiceId, project.script],
  )

  const hasUnsavedWork = useMemo(
    () => !!project.script.trim() || !!audio || project.title.trim().length > 0,
    [project.script, audio, project.title],
  )

  const goBack = async () => {
    if (hasUnsavedWork && !submitting) {
      const ok = await confirm({
        title: t('editor.leaveTitle'),
        message: t('editor.leaveMessage'),
        confirmText: t('editor.leaveConfirm'),
        cancelText: t('editor.leaveCancel'),
        danger: true,
      })
      if (!ok) return
    }
    if (audio) URL.revokeObjectURL(audio.url)
    resetProject()
    navigate('/')
  }

  // 刷新/关闭前的提醒
  useEffect(() => {
    if (!hasUnsavedWork || submitting) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedWork, submitting])

  const handleSubmit = async () => {
    if (submitting) return
    if (!project.avatarId) {
      toast.error(t('editor.needAvatar'))
      setStep('avatar')
      return
    }
    if (!audio) {
      toast.error(t('editor.needVoiceOrAudio'))
      setStep('script')
      return
    }
    const finalTitle = (
      project.title.trim() ||
      (i18n.language.startsWith('zh') ? '未命名作品' : 'Untitled work')
    ).slice(0, 120)
    setSubmitting(true)
    try {
      const video = await api.videos.create({
        title: finalTitle,
        avatar_id: project.avatarId,
        audio_file: audio.kind === 'upload' ? audio.file : audio.blob,
        voice_id: audio.kind === 'tts' ? project.voiceId ?? undefined : undefined,
        script: project.script.trim() || undefined,
        category: guessCategory(project.script),
      })
      upsertVideo(video)
      toast.success(t('editor.submitSuccess'))
      if (audio) URL.revokeObjectURL(audio.url)
      resetProject()
      navigate('/works')
    } catch (err) {
      const e = err as ApiError
      toast.error(e.message || t('editor.submitFail'))
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = !!project.avatarId && !!audio && !submitting

  if (!isDataLoaded) return <LoadingScreen label={t('common.loading')} />

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-[rgb(var(--hairline))] px-4 py-2.5 md:px-6">
        <button type="button" onClick={goBack} className="btn btn-ghost btn-sm" title={t('editor.back')}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t('editor.back')}</span>
        </button>
        <div className="min-w-0 flex-1">
          <input
            value={project.title}
            onChange={(e) => setProject({ title: e.target.value.slice(0, 120) })}
            placeholder={t('editor.titlePlaceholder')}
            className="w-full max-w-md rounded border border-transparent bg-transparent px-1 py-1 text-sm font-medium text-[rgb(var(--text))] hover:border-[rgb(var(--hairline))] focus:border-[rgb(var(--hairline-strong))] focus:outline-none"
            maxLength={120}
            aria-label={t('editor.reviewTitle')}
          />
        </div>
        {submitting && (
          <span className="flex items-center gap-1.5 text-[11px] text-[rgb(var(--text-3))]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {t('editor.submitting')}
          </span>
        )}
      </header>

      <WizardSteps current={step} completed={completed} onJump={setStep} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-5 px-4 py-5 md:px-6 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 space-y-5">
            {step === 'avatar' && (
              <StepAvatar avatarId={project.avatarId} onSelect={(id) => setProject({ avatarId: id })} />
            )}
            {step === 'voice' && (
              <StepVoice
                voiceId={project.voiceId ?? ''}
                onVoiceChange={(id) => setProject({ voiceId: id })}
                audio={audio}
                onAudioChange={setAudio}
              />
            )}
            {step === 'script' && (
              <StepScript
                script={project.script}
                onScriptChange={(value) => setProject({ script: value })}
                voiceId={project.voiceId ?? ''}
                audio={audio}
                onAudioChange={setAudio}
              />
            )}
            {step === 'review' && (
              <StepReview
                title={project.title}
                onTitleChange={(value) => setProject({ title: value })}
                avatarName={avatar?.name ?? ''}
                voiceName={voice?.name ?? ''}
                audio={audio}
                script={project.script}
                submitting={submitting}
                canSubmit={canSubmit}
                onSubmit={handleSubmit}
              />
            )}

            <div className="flex items-center justify-between gap-2 border-t border-[rgb(var(--hairline))] pt-4">
              <button
                type="button"
                onClick={() => {
                  const order: StepKey[] = ['avatar', 'voice', 'script', 'review']
                  const idx = order.indexOf(step)
                  if (idx > 0) setStep(order[idx - 1])
                }}
                disabled={step === 'avatar'}
                className="btn-secondary"
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const order: StepKey[] = ['avatar', 'voice', 'script', 'review']
                  const idx = order.indexOf(step)
                  if (idx < order.length - 1) setStep(order[idx + 1])
                  else void handleSubmit()
                }}
                disabled={submitting}
                className="btn-primary"
              >
                {step === 'review' ? t('editor.submit') : t('common.next')}
              </button>
            </div>
          </div>

          <aside className="space-y-3">
            <PreviewPanel avatar={avatar} submitting={submitting} />
            <div className="card p-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[rgb(var(--text-3))]">
                {t('editor.steps.review')}
              </div>
              <ul className="mt-2 space-y-1.5 text-xs">
                <li className="flex items-center justify-between gap-2">
                  <span className="text-[rgb(var(--text-3))]">{t('editor.reviewAvatar')}</span>
                  <span className="truncate font-medium">{avatar?.name ?? '—'}</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-[rgb(var(--text-3))]">{t('editor.reviewVoice')}</span>
                  <span className="truncate font-medium">{voice?.name ?? '—'}</span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-[rgb(var(--text-3))]">{t('editor.reviewAudio')}</span>
                  <span className="truncate font-medium">
                    {audio
                      ? audio.kind === 'tts'
                        ? t('editor.reviewAudioTts')
                        : t('editor.reviewAudioUpload')
                      : '—'}
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}