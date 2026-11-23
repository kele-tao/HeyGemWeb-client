import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Home } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="num text-6xl font-semibold tracking-tight text-[rgb(var(--text-3))]">
          404
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t('notfound.title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--text-3))]">
          {t('notfound.desc')}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            {t('notfound.back')}
          </button>
          <button type="button" onClick={() => navigate('/')} className="btn-primary">
            <Home className="h-4 w-4" />
            {t('notfound.home')}
          </button>
        </div>
      </div>
    </div>
  )
}
