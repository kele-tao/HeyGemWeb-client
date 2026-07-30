import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  Sparkles,
  Mic,
  Upload as UploadIcon,
  Volume2,
  Loader2,
  Film,
  Pencil,
  Check,
  Wand2,
  Image as ImageIcon,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useProjectStore } from '@/store/useProjectStore'
import { api } from '@/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { GeneratedVideo } from '@/types'
import WizardSteps from '@/components/editor/WizardSteps'
import TemplatePickerModal from '@/components/modals/TemplatePickerModal'
import Confetti from '@/components/feedback/Confetti'
import { useConfirm } from '@/hooks/useConfirm'

type WizardStep = 'avatar' | 'voice' | 'content' | 'synth'
type AudioSource =
  | { kind: 'none' }
  | { kind: 'tts'; url: string; blob?: Blob }
  | { kind: 'upload'; file: File; url: string }

export default function EditorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const project = useProjectStore()
  const resetProject = useProjectStore((s) => s.resetProject)
  const avatars = useAppStore((s) => s.avatars)
  const voices = useAppStore((s) => s.voices)
  const getVoiceById = useAppStore((s) => s.getVoiceById)
  const getAvatarById = useAppStore((s) => s.getAvatarById)
  const addVideo = useAppStore((s) => s.addVideo)
  const setRecent = useAppStore((s) => s.setRecent)
  const recentAvatarId = useAppStore((s) => s.recentAvatarId)
  const recentVoiceId = useAppStore((s) => s.recentVoiceId)
  const confirm = useConfirm()

  const [voiceId, setVoiceId] = useState('')
  const [tab, setTab] = useState<'tts' | 'upload'>('tts')
  const [audio, setAudio] = useState<AudioSource>({ kind: 'none' })
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [auditioning, setAuditioning] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [step, setStep] = useState<WizardStep>('avatar')
  const [showConfetti, setShowConfetti] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 用 ref 跟踪已自动设置的初始值,避免重复触发
  const initialAvatarSet = useRef(false)
  const initialVoiceSet = useRef(false)
  const userTouchedStep = useRef(false)
  const prevAudioRef = useRef(audio)

  useEffect(() => {
    if (!voiceId && voices.length > 0 && !initialVoiceSet.current) {
      const prefer =
        (recentVoiceId && voices.find((v) => v.id === recentVoiceId)) ||
        voices.find((v) => v.status === 'complete')
      if (prefer) {
        setVoiceId(prefer.id)
        initialVoiceSet.current = true
      }
    }
  }, [voices, voiceId, recentVoiceId])

  useEffect(() => {
    if (
      !project.avatarId &&
      avatars.length > 0 &&
      !initialAvatarSet.current
    ) {
      const prefer =
        (recentAvatarId && avatars.find((a) => a.id === recentAvatarId)) ||
        avatars[0]
      if (prefer) {
        project.setProject({ avatarId: prefer.id })
        initialAvatarSet.current = true
      }
    }
  }, [avatars, project, recentAvatarId])

  // 跟 audio kind 即可,避免对象比较误判
  useEffect(() => {
    const prev = prevAudioRef.current
    prevAudioRef.current = audio
    return () => {
      // 在下次 effect 跑前(也就是 audio 变化时)cleanup 上一次的
      if (prev.kind === 'tts' && prev.url.startsWith('blob:')) {
        URL.revokeObjectURL(prev.url)
      }
      if (prev.kind === 'upload') {
        URL.revokeObjectURL(prev.url)
      }
    }
  }, [audio])

  const handleStepJump = (s: 'avatar' | 'voice' | 'content' | 'synth') => {
    userTouchedStep.current = true
    setStep(s)
  }

  // 智能跳步骤:仅在用户没主动跳过时,且每步停留 1.5s 让用户看清完成状态
  useEffect(() => {
    if (userTouchedStep.current) return
    const timer = setTimeout(() => {
      if (project.avatarId && voiceId && audio.kind !== 'none') {
        setStep('synth')
      } else if (project.avatarId && voiceId) {
        setStep('content')
      } else if (project.avatarId) {
        setStep('voice')
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [project.avatarId, voiceId, audio.kind])

  if (!project.id) {
    return (
      <div className="h-full flex items-center justify-center text-[rgb(var(--text-muted))]">
        {t('editor.noAvatar')}
      </div>
    )
  }

  const selectedAvatar = project.avatarId
    ? getAvatarById(project.avatarId)
    : undefined

  const completed = {
    avatar: !!project.avatarId,
    voice: !!voiceId,
    content: audio.kind !== 'none',
    synth: false,
  }

  const handleAudition = async () => {
    const voice = voiceId ? getVoiceById(voiceId) : undefined
    if (!voice || !voice.asr_format_audio_url || !voice.reference_audio_text) {
      toast.error(t('notify.voiceIncomplete'))
      return
    }
    setAuditioning(true)
    try {
      const data = await api.auditionVoice(voice.id, t('editor.auditionText'), voice)
      const a = new Audio(data.url)
      a.onended = () => setAuditioning(false)
      a.onerror = () => {
        setAuditioning(false)
        toast.error(t('notify.audioFail'))
      }
      a.play()
    } catch (e: any) {
      toast.error(e.message || t('notify.audioFail'))
      setAuditioning(false)
    }
  }

  const handleGenerateAudio = async () => {
    if (!voiceId || !project.script.trim()) {
      toast.error(t('notify.voiceAndText'))
      return
    }
    const voice = getVoiceById(voiceId)
    if (!voice || !voice.asr_format_audio_url || !voice.reference_audio_text) {
      toast.error(t('notify.voiceIncomplete'))
      return
    }
    setGenerating(true)
    try {
      const res = await api.synthesizeAudio(project.script, voice)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || t('notify.audioFail'))
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setAudio({ kind: 'tts', url, blob })
      toast.success(t('notify.audioOk'), { icon: '🎉' })
    } catch (e: any) {
      toast.error(e.message || t('notify.audioFail'))
    } finally {
      setGenerating(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 200 * 1024 * 1024) {
      toast.error(t('notify.fileTooBig'))
      return
    }
    const url = URL.createObjectURL(file)
    setAudio({ kind: 'upload', file, url })
  }

  const handleSynthesize = async () => {
    if (audio.kind === 'none' || !project.avatarId) {
      toast.error(t('notify.audioAvatarRequired'))
      return
    }
    const avatar = getAvatarById(project.avatarId)
    if (!avatar) {
      toast.error(t('notify.avatarFirst'))
      return
    }

    setSubmitting(true)
    try {
      let audioBlob: Blob
      if (audio.kind === 'upload') audioBlob = audio.file
      else if (audio.kind === 'tts') {
        if (audio.blob) audioBlob = audio.blob
        else audioBlob = await (await fetch(audio.url)).blob()
      } else return

      setRecent('avatar', project.avatarId)
      if (voiceId) setRecent('voice', voiceId)

      const { task_code } = await api.synthesizeVideo({
        audioBlob,
        avatar,
        projectTitle: project.title || 'Untitled',
      })

      // 简单的关键词分类
      const scriptLower = project.script.toLowerCase()
      let guessedCategory = 'other'
      if (/产品|新品|价格|购买|下单|购物/.test(scriptLower)) guessedCategory = 'product'
      else if (/课程|教程|学习|讲解|知识/.test(scriptLower)) guessedCategory = 'course'
      else if (/促销|限时|优惠|折扣|直播|福利/.test(scriptLower)) guessedCategory = 'marketing'
      else if (/科普|原理|知识|为什么|科学/.test(scriptLower)) guessedCategory = 'knowledge'
      else if (/新年|春节|圣诞|节日|祝福|生日快乐/.test(scriptLower)) guessedCategory = 'festival'
      else if (/品牌|故事|创立|开始/.test(scriptLower)) guessedCategory = 'story'

      const newVideo: GeneratedVideo = {
        id: `video-${task_code}`,
        task_code,
        title: project.title || 'Untitled',
        thumbUrl: avatar.thumbUrl,
        videoUrl: null,
        date: new Date().toISOString().slice(0, 10),
        status: 'queued',
        avatarId: avatar.id,
        category: guessedCategory,
      }
      addVideo(newVideo)
      toast.success(t('notify.videoQueued'), { icon: '🚀' })
      setShowConfetti(true)
      setTimeout(() => navigate('/works'), 1200)
    } catch (e: any) {
      toast.error(e.message || t('notify.videoFail'))
    } finally {
      setSubmitting(false)
    }
  }

  const voiceList = voices.filter((v) => v.status === 'complete')
  const canSynth = audio.kind !== 'none' && project.avatarId && !submitting

  const handleSelectTemplate = (script: string) => {
    project.setProject({ script })
    setTab('tts')
  }

  // 离开前判断是否有未保存工作
  const hasUnsavedWork =
    !!project.script.trim() || audio.kind !== 'none' || editingTitle

  // 离开前确认
  const handleBack = async () => {
    if (hasUnsavedWork && !submitting) {
      const ok = await confirm({
        title: '确定要离开吗?',
        message: '当前编辑的内容还没合成视频,离开后将丢失脚本和音频。',
        confirmText: '离开',
        cancelText: '继续编辑',
        danger: true,
      })
      if (!ok) return
    }
    resetProject()
    navigate('/')
  }

  // 浏览器关闭/刷新提醒
  useEffect(() => {
    if (!hasUnsavedWork || submitting) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedWork, submitting])

  return (
    <div className="h-full flex flex-col">
      {/* 顶部条 */}
      <header className="h-16 px-6 flex items-center gap-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))]/80 backdrop-blur-xl flex-shrink-0 relative z-10">
        <button
          onClick={handleBack}
          className="btn-ghost px-2"
          title={t('common.back')}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('common.back')}</span>
        </button>

        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          {editingTitle ? (
            <>
              <input
                value={project.title}
                onChange={(e) => project.setProject({ title: e.target.value })}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                autoFocus
                className="input max-w-md text-center"
                placeholder={t('editor.titlePlaceholder')}
              />
              <button
                onClick={() => setEditingTitle(false)}
                className="text-brand-600"
              >
                <Check className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <h1
                className="font-semibold truncate max-w-md tracking-tight"
                title={project.title}
              >
                {project.title || t('editor.titlePlaceholder')}
              </h1>
              <button
                onClick={() => setEditingTitle(true)}
                className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))] transition"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        <button
          onClick={handleSynthesize}
          disabled={!canSynth}
          className="btn-primary"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('editor.synthesizing')}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {t('editor.synthesizeVideo')}
            </>
          )}
        </button>
      </header>

      <WizardSteps current={step} completed={completed} onJump={handleStepJump} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_360px] overflow-hidden">
        {/* 左:模特列表 */}
        <aside
          className={cn(
            'border-r border-[rgb(var(--border))] bg-[rgb(var(--surface))] overflow-y-auto scrollbar-thin',
            step !== 'avatar' && 'hidden lg:block',
          )}
        >
          <div className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[rgb(var(--text-muted))]">
              <Film className="w-4 h-4" />
              {t('editor.avatars')}
            </h3>
            {avatars.length === 0 ? (
              <button
                onClick={() => navigate('/avatars')}
                className="w-full p-6 border-2 border-dashed border-[rgb(var(--border))] rounded-xl text-sm text-[rgb(var(--text-muted))] hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50/30 dark:hover:bg-brand-500/5 transition text-center"
              >
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                {t('editor.noAvatar')}
              </button>
            ) : (
              <div className="space-y-2">
                {avatars.map((a) => {
                  const active = a.id === project.avatarId
                  return (
                    <button
                      key={a.id}
                      onClick={() => project.setProject({ avatarId: a.id })}
                      className={cn(
                        'w-full p-2 rounded-xl text-left flex items-center gap-3 border transition-all duration-200',
                        active
                          ? 'border-brand-500 bg-gradient-to-r from-brand-50 to-brand-50/30 dark:from-brand-500/15 dark:to-brand-500/5 shadow-sm'
                          : 'border-transparent hover:bg-[rgb(var(--surface-2))] hover:border-[rgb(var(--border))]',
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={a.thumbUrl}
                          alt={a.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        {active && (
                          <div className="absolute -inset-0.5 rounded-lg ring-2 ring-brand-500/50 animate-pulse-glow" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {a.title}
                        </div>
                      </div>
                      {a.id === recentAvatarId && (
                        <span className="text-2xs px-1.5 py-0.5 bg-gradient-to-r from-brand-500 to-info-500 text-white rounded font-bold">
                          NEW
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        {/* 中:预览 */}
        <section
          className={cn(
            'flex items-center justify-center p-6 bg-[rgb(var(--bg))] overflow-hidden relative',
            step === 'avatar' && 'hidden lg:flex',
          )}
        >
          {/* 装饰光斑 */}
          <div className="absolute inset-0 bg-mesh-1 dark:bg-mesh-dark opacity-50 pointer-events-none" />

          <div className="relative w-full max-w-3xl aspect-video rounded-2xl bg-black overflow-hidden shadow-xl">
            {/* 视频外发光 */}
            <div className="absolute -inset-1 rounded-2xl bg-aurora-1 opacity-20 blur-xl pointer-events-none" />

            <div className="relative w-full h-full rounded-2xl overflow-hidden ring-1 ring-white/10">
              {project.videoUrl ? (
                <video
                  src={project.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : selectedAvatar ? (
                selectedAvatar.videoUrl ? (
                  <video
                    src={selectedAvatar.videoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={selectedAvatar.thumbUrl}
                    alt={selectedAvatar.title}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/60 bg-gradient-to-br from-ink-900 to-ink-950">
                  <div className="text-center">
                    <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <div>{t('editor.selectAvatar')}</div>
                  </div>
                </div>
              )}
              {submitting && (
                <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center text-white">
                  <div className="text-center">
                    <div className="relative w-12 h-12 mx-auto mb-3">
                      <div className="absolute inset-0 rounded-full bg-aurora-1 blur-lg opacity-60 animate-pulse-glow" />
                      <Loader2 className="relative w-12 h-12 animate-spin" />
                    </div>
                    <div className="text-sm font-medium">{t('editor.synthesizing')}</div>
                    <div className="text-xs text-white/60 mt-1">
                      {t('editor.synthesisHint')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 右:合成面板 */}
        <aside
          className={cn(
            'border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] flex flex-col overflow-hidden',
            step === 'avatar' && 'hidden lg:flex',
          )}
        >
          <div className="relative p-1 m-3 bg-[rgb(var(--surface-2))] rounded-xl">
            <div
              className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[rgb(var(--surface))] rounded-lg shadow-sm transition-all duration-300 ease-spring"
              style={{
                transform: tab === 'tts' ? 'translateX(0)' : 'translateX(100%)',
              }}
            />
            <div className="relative flex">
              <button
                onClick={() => setTab('tts')}
                className={cn(
                  'flex-1 py-1.5 text-sm rounded-lg transition flex items-center justify-center gap-1.5',
                  tab === 'tts'
                    ? 'text-brand-600 dark:text-brand-400 font-medium'
                    : 'text-[rgb(var(--text-muted))]',
                )}
              >
                <Mic className="w-3.5 h-3.5" />
                {t('editor.audioTab')}
              </button>
              <button
                onClick={() => setTab('upload')}
                className={cn(
                  'flex-1 py-1.5 text-sm rounded-lg transition flex items-center justify-center gap-1.5',
                  tab === 'upload'
                    ? 'text-brand-600 dark:text-brand-400 font-medium'
                    : 'text-[rgb(var(--text-muted))]',
                )}
              >
                <UploadIcon className="w-3.5 h-3.5" />
                {t('editor.uploadTab')}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4">
            {tab === 'tts' ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[rgb(var(--text-muted))] font-medium">
                    Script
                  </span>
                  <button
                    onClick={() => setShowTemplates(true)}
                    className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 group font-medium"
                  >
                    <Wand2 className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                    {t('wizard.templates')}
                  </button>
                </div>
                <textarea
                  value={project.script}
                  onChange={(e) => project.setProject({ script: e.target.value })}
                  placeholder={t('editor.scriptPlaceholder')}
                  className="input min-h-[180px] resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1 text-xs num">
                  <span className="text-[rgb(var(--text-muted))]">
                    {(() => {
                      // 估算口播时长:中文约 4 字/秒,英文约 3 词/秒
                      const len = project.script.length
                      if (len === 0) return ''
                      const seconds = Math.max(1, Math.round(len / 4))
                      const m = Math.floor(seconds / 60)
                      const s = seconds % 60
                      return `约 ${m}:${String(s).padStart(2, '0')}`
                    })()}
                  </span>
                  <span
                    className={cn(
                      project.script.length > 800 && 'text-warning-600',
                      project.script.length > 1500 && 'text-danger-600',
                    )}
                  >
                    {project.script.length} / 1500 字
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs text-[rgb(var(--text-muted))] mb-1.5 block font-medium">
                      {t('editor.selectVoice')}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={voiceId}
                        onChange={(e) => setVoiceId(e.target.value)}
                        className="input flex-1"
                      >
                        {voiceList.length === 0 ? (
                          <option value="">{t('editor.noVoice')}</option>
                        ) : (
                          <>
                            <option value="">{t('editor.selectVoice')}</option>
                            {voiceList.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.id === recentVoiceId ? '⭐ ' : ''}
                                {v.name}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      <button
                        onClick={handleAudition}
                        disabled={!voiceId || auditioning}
                        className="btn-secondary px-3"
                        title={t('editor.audition')}
                      >
                        {auditioning ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 fill-current" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateAudio}
                    disabled={generating || !voiceId || !project.script.trim()}
                    className="btn-primary w-full"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('editor.generating')}
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        {t('editor.generateAudio')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="h-full min-h-[280px] border-2 border-dashed border-[rgb(var(--border))] rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50/30 dark:hover:bg-brand-500/5 transition-all p-6 group"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {audio.kind === 'upload' ? (
                  <div className="animate-scale-in">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success-500 to-emerald-500 text-white flex items-center justify-center mb-3 mx-auto shadow-glow">
                      <Check className="w-7 h-7" strokeWidth={3} />
                    </div>
                    <div className="text-sm font-medium">{audio.file.name}</div>
                    <div className="text-xs text-[rgb(var(--text-muted))] mt-1 num">
                      {(audio.file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        fileRef.current?.click()
                      }}
                      className="btn-ghost mt-3 text-xs"
                    >
                      {t('editor.changeFile')}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-100 to-info-100 dark:from-brand-500/15 dark:to-info-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <UploadIcon className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-medium">
                      {t('editor.selectFile')}
                    </div>
                    <div className="text-xs text-[rgb(var(--text-muted))] mt-1">
                      {t('editor.selectFileHint')}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {audio.kind !== 'none' && (
            <div className="border-t border-[rgb(var(--border))] p-3 bg-[rgb(var(--surface-2))]/50">
              <div className="text-2xs text-[rgb(var(--text-muted))] mb-1.5 font-medium flex items-center gap-1.5">
                <Volume2 className="w-3 h-3" />
                {audio.kind === 'upload'
                  ? t('editor.uploadedAudio')
                  : t('editor.generating').includes('Generating')
                    ? 'Generated Audio'
                    : '已生成音频'}
              </div>
              <audio
                ref={audioRef}
                src={audio.url}
                controls
                className="w-full h-9"
              />
            </div>
          )}
        </aside>
      </div>

      <TemplatePickerModal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={handleSelectTemplate}
      />

      {showConfetti && <Confetti duration={1500} />}
    </div>
  )
}
