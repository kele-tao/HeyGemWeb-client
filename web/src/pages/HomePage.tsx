import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  UserPlus,
  UserCircle2,
  Mic,
  Film,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Trophy,
  Loader2,
  Zap,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useProjectStore } from '@/store/useProjectStore'
import VideoCard from '@/components/works/VideoCard'
import EmptyState from '@/components/feedback/EmptyState'
import AuroraBackground from '@/components/brand/AuroraBackground'
import FloatingShapes from '@/components/brand/FloatingShapes'
import CountUp from '@/components/feedback/CountUp'
import { cn, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const videos = useAppStore((s) => s.videos)
  const avatars = useAppStore((s) => s.avatars)
  const voices = useAppStore((s) => s.voices)
  const setProject = useProjectStore((s) => s.setProject)
  const resetProject = useProjectStore((s) => s.resetProject)
  const loadDraft = useProjectStore((s) => s.loadDraft)
  const projectId = useProjectStore((s) => s.id)

  const successCount = videos.filter((v) => v.status === 'success').length
  const processingCount = videos.filter(
    (v) => v.status === 'processing' || v.status === 'queued',
  ).length
  const successRate =
    videos.length === 0 ? 100 : Math.round((successCount / videos.length) * 100)

  // 近 7 天趋势
  const trend = (() => {
    const days: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = formatDate(d)
      const count = videos.filter((v) => v.date === dateStr).length
      days.push({ date: dateStr, count })
    }
    return days
  })()
  const maxTrend = Math.max(...trend.map((d) => d.count), 1)

  // 热门模特 top3
  const avatarUsage = avatars
    .map((a) => ({
      avatar: a,
      count: videos.filter((v) => v.avatarId === a.id).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  const recentVideos = videos.slice(0, 4)
  const isFirstTime = avatars.length === 0 && voices.length === 0

  const startNewProject = () => {
    if (avatars.length === 0) {
      navigate('/avatars')
      return
    }
    // 如果有草稿,提示用户
    if (projectId) {
      const resume = window.confirm(
        i18n.language.startsWith('zh')
          ? '检测到未完成的草稿,是否继续编辑?\n点"确定"继续,点"取消"开始新项目。'
          : 'Found unsaved draft. Continue editing?\nOK to resume, Cancel to start fresh.',
      )
      if (resume) {
        navigate('/editor')
        return
      }
      resetProject()
    }
    setProject({
      id: `proj-${Date.now()}`,
      title: i18n.language.startsWith('zh')
        ? `我的数字人视频 ${new Date().toLocaleDateString()}`
        : `My HeyGem Video ${new Date().toLocaleDateString()}`,
      avatarId: avatars[0].id,
      script: i18n.language.startsWith('zh')
        ? '你好,欢迎使用 HeyGem 数字人创作平台。在这里,你可以轻松创作专业级口播视频。'
        : 'Hello, welcome to HeyGem. Create professional talking-head videos with AI.',
    })
    navigate('/editor')
  }

  // 检查草稿并提示
  useEffect(() => {
    if (loadDraft() && projectId) {
      toast(
        i18n.language.startsWith('zh')
          ? '✨ 已恢复未保存的草稿,点击"创建视频"继续编辑'
          : '✨ Draft restored. Click "Create Video" to continue',
        { duration: 6000, icon: '📝' },
      )
    }
    // 只在挂载时跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = [
    {
      key: 'works',
      label: t('home.statWorks'),
      value: videos.length,
      icon: Film,
      gradient: 'from-brand-500 to-info-500',
    },
    {
      key: 'avatars',
      label: t('home.statAvatars'),
      value: avatars.length,
      icon: UserCircle2,
      gradient: 'from-success-500 to-emerald-500',
    },
    {
      key: 'voices',
      label: t('home.statVoices'),
      value: voices.length,
      icon: Mic,
      gradient: 'from-warning-500 to-orange-500',
    },
    {
      key: 'success',
      label: t('home.statSuccess'),
      value: successRate,
      suffix: '%',
      icon: Trophy,
      gradient: 'from-pink-500 via-rose-500 to-orange-500',
    },
  ]

  const actions = [
    {
      key: 'create',
      title: t('home.createVideo'),
      desc: t('home.newProjectDesc'),
      icon: Film,
      gradient: 'from-brand-600 via-brand-500 to-info-500',
      glowClass: 'shadow-glow',
      onClick: startNewProject,
    },
    {
      key: 'avatar',
      title: t('home.customizeAvatar'),
      desc: t('home.quickActionsDesc'),
      icon: UserPlus,
      gradient: 'from-info-500 via-info-400 to-cyan-500',
      onClick: () => navigate('/avatars'),
    },
    {
      key: 'voice',
      title: t('home.cloneVoice'),
      desc: t('home.quickActionsDesc'),
      icon: Mic,
      gradient: 'from-warning-500 via-pink-500 to-rose-500',
      onClick: () => navigate('/voices'),
    },
  ]

  return (
    <div className="relative min-h-full">
      {/* === Hero 区(仅首次访问) === */}
      {isFirstTime && (
        <section className="relative overflow-hidden border-b border-[rgb(var(--border))]">
          <AuroraBackground intensity={0.7} />
          <FloatingShapes count={5} />
          <div className="relative px-6 lg:px-8 py-12 lg:py-16 max-w-7xl mx-auto">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 text-xs font-medium mb-4 ring-1 ring-brand-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                {i18n.language.startsWith('zh') ? 'AI 数字人工坊' : 'AI Digital Human Studio'}
              </div>
              <h1 className="text-3xl lg:text-5xl font-bold tracking-tight text-balance">
                <span className="text-[rgb(var(--text))]">
                  {i18n.language.startsWith('zh') ? '让 AI ' : 'Let AI '}
                </span>
                <span className="bg-clip-text text-transparent bg-aurora-1 bg-[length:200%_200%] animate-gradient">
                  {i18n.language.startsWith('zh') ? '为你发声' : 'Speak for You'}
                </span>
              </h1>
              <p className="mt-4 text-[rgb(var(--text-muted))] text-base lg:text-lg max-w-xl leading-relaxed text-pretty">
                {i18n.language.startsWith('zh')
                  ? '3 步生成专业级数字人视频。上传一段视频创建你的数字分身,上传一段音频克隆你的声音,然后输入脚本——剩下的交给 AI。'
                  : 'Create professional digital human videos in 3 steps. Upload a video to create your digital twin, upload audio to clone your voice, then type a script. AI handles the rest.'}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={startNewProject} className="btn-primary">
                  <Zap className="w-4 h-4" />
                  {i18n.language.startsWith('zh') ? '开始创作' : 'Start Creating'}
                </button>
                <button
                  onClick={() => navigate('/avatars')}
                  className="btn-secondary"
                >
                  <UserPlus className="w-4 h-4" />
                  {i18n.language.startsWith('zh') ? '创建数字人' : 'Create Avatar'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* 顶部欢迎 */}
        {!isFirstTime && (
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-muted))] mb-1.5">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span className="font-medium">HeyGem Studio</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-balance">
              {t('home.welcome')}
            </h1>
            <p className="text-[rgb(var(--text-muted))] mt-1.5 text-pretty">
              {t('home.welcomeDesc')}
            </p>
          </div>
        )}

        {/* 数据卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.key}
                className="card p-4 lg:p-5 relative overflow-hidden group"
              >
                <div
                  className={cn(
                    'absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br opacity-[0.12] blur-2xl group-hover:opacity-25 transition-opacity duration-500',
                    s.gradient,
                  )}
                />
                <div className="relative flex items-center justify-between mb-3">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-sm',
                      s.gradient,
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="relative text-xs text-[rgb(var(--text-muted))] font-medium">
                  {s.label}
                </div>
                <div className="relative text-2xl lg:text-3xl font-bold mt-1 num">
                  <CountUp value={s.value} suffix={s.suffix} />
                </div>
              </div>
            )
          })}
        </div>

        {/* 趋势 + 热门模特(有数据时) */}
        {videos.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <div className="card p-5 lg:col-span-2 relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-brand-500/5 blur-3xl pointer-events-none" />
              <div className="relative flex items-center justify-between mb-5">
                <div>
                  <div className="text-sm font-semibold flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-brand-500" />
                    {i18n.language.startsWith('zh') ? '近 7 天作品' : 'Last 7 days'}
                  </div>
                  <div className="text-xs text-[rgb(var(--text-muted))] mt-1">
                    {trend.reduce((a, b) => a + b.count, 0)}{' '}
                    {i18n.language.startsWith('zh') ? '个作品 · 今日' : 'works · today'}{' '}
                    {trend[trend.length - 1].count}
                  </div>
                </div>
                {processingCount > 0 && (
                  <span className="badge-warning text-2xs">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {processingCount} {i18n.language.startsWith('zh') ? '处理中' : 'processing'}
                  </span>
                )}
              </div>
              <div className="relative flex items-end gap-2 h-32">
                {trend.map((d, i) => {
                  const height = d.count > 0 ? Math.max(8, (d.count / maxTrend) * 100) : 0
                  const isToday = i === trend.length - 1
                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col items-center gap-1.5"
                    >
                      <div className="w-full flex-1 flex items-end relative">
                        {height > 0 ? (
                          <div
                            className={cn(
                              'w-full rounded-t-md transition-all duration-700 ease-out-expo relative overflow-hidden group/bar',
                              isToday
                                ? 'bg-gradient-to-t from-brand-600 via-brand-500 to-info-400'
                                : 'bg-gradient-to-t from-info-500/30 to-info-400/50 hover:from-info-500/50 hover:to-info-400/70',
                            )}
                            style={{
                              height: `${height}%`,
                              transitionDelay: `${i * 60}ms`,
                            }}
                            title={`${d.date}: ${d.count}`}
                          >
                            {isToday && d.count > 0 && (
                              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-2xs font-bold text-brand-600">
                                {d.count}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-px bg-[rgb(var(--border))]" />
                        )}
                      </div>
                      <div
                        className={cn(
                          'text-2xs num',
                          isToday
                            ? 'text-brand-600 font-semibold'
                            : 'text-[rgb(var(--text-muted))]',
                        )}
                      >
                        {d.date.slice(5)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="card p-5">
              <div className="text-sm font-semibold mb-4 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-warning-500" />
                {i18n.language.startsWith('zh') ? '热门模特' : 'Top Avatars'}
              </div>
              {avatarUsage.length === 0 ? (
                <div className="text-xs text-[rgb(var(--text-muted))] py-8 text-center">
                  {i18n.language.startsWith('zh') ? '还没有数据' : 'No data yet'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {avatarUsage.map((u, i) => (
                    <div
                      key={u.avatar.id}
                      className="flex items-center gap-3 p-1.5 -mx-1.5 rounded-lg hover:bg-[rgb(var(--surface-2))] transition"
                    >
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                          i === 0
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-sm'
                            : i === 1
                              ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
                              : 'bg-gradient-to-br from-orange-300 to-amber-500 text-white',
                        )}
                      >
                        {i + 1}
                      </div>
                      <img
                        src={u.avatar.thumbUrl}
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                        alt=""
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {u.avatar.title}
                        </div>
                      </div>
                      <div className="text-xs text-[rgb(var(--text-muted))] num">
                        {u.count}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 快捷操作 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base lg:text-lg font-semibold tracking-tight">
              {t('home.quickActions')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
            {actions.map((a) => {
              const Icon = a.icon
              return (
                <button
                  key={a.key}
                  onClick={a.onClick}
                  className={cn(
                    'group text-left p-5 rounded-2xl text-white relative overflow-hidden',
                    'bg-gradient-to-br shadow-md',
                    'transition-all duration-300 ease-out-expo',
                    'hover:-translate-y-1 hover:shadow-xl',
                    'active:scale-[0.99]',
                    a.gradient,
                    a.glowClass,
                  )}
                >
                  {/* 装饰光斑 */}
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-white/10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  <div className="absolute -left-8 -top-8 w-24 h-24 rounded-full bg-white/5 blur-2xl" />

                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 ring-1 ring-white/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-base font-semibold tracking-tight">
                      {a.title}
                    </div>
                    <div className="text-xs text-white/75 mt-1 leading-relaxed">
                      {a.desc}
                    </div>
                    <ArrowRight className="absolute right-0 top-0 w-5 h-5 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 最近作品 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base lg:text-lg font-semibold tracking-tight">
              {t('home.recentWorks')}
            </h2>
            {videos.length > 0 && (
              <button
                onClick={() => navigate('/works')}
                className="text-sm text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 group"
              >
                {t('home.viewAll')}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>

          {recentVideos.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<Plus className="w-9 h-9" />}
                title={t('home.noWorks')}
                description={t('home.noWorksDesc')}
                action={
                  <button onClick={startNewProject} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    {t('home.createVideo')}
                  </button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentVideos.map((v) => (
                <VideoCard
                  key={v.id}
                  video={v}
                  onOpen={() => navigate('/works')}
                  onDelete={() => navigate('/works')}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
