import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HelpCircle, BookOpen, Github, MessageCircle } from 'lucide-react'
import Onboarding from '@/components/feedback/Onboarding'

export default function HelpMenu() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))] hover:text-[rgb(var(--text))] transition"
          title="帮助"
        >
          <HelpCircle className="w-[18px] h-[18px]" />
          <span className="hidden lg:inline">{t('common.help', { defaultValue: '帮助' })}</span>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-xl shadow-xl z-40 animate-slide-up">
              <button
                onClick={() => {
                  setOpen(false)
                  localStorage.removeItem('heygem.onboarded')
                  setShowOnboarding(true)
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-[rgb(var(--surface-2))] transition text-left"
              >
                <BookOpen className="w-4 h-4" />
                <span>重新查看引导</span>
              </button>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-[rgb(var(--surface-2))] transition text-left"
              >
                <MessageCircle className="w-4 h-4" />
                <span>使用文档</span>
              </a>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-[rgb(var(--surface-2))] transition text-left"
              >
                <Github className="w-4 h-4" />
                <span>项目仓库</span>
              </a>
            </div>
          </>
        )}
      </div>
      {showOnboarding && (
        <Onboarding force onClose={() => setShowOnboarding(false)} />
      )}
    </>
  )
}
