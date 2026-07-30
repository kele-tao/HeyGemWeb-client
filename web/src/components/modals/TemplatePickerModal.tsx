import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, FileText, Search, Plus } from 'lucide-react'
import Modal from '@/components/feedback/Modal'
import { TEMPLATE_IDS, getTemplateContent, type TemplateCategory } from '@/data/scriptTemplates'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (script: string) => void
}

const CATEGORIES: { key: TemplateCategory; emoji: string }[] = [
  { key: 'product', emoji: '🆕' },
  { key: 'course', emoji: '📚' },
  { key: 'marketing', emoji: '🔥' },
  { key: 'knowledge', emoji: '🧠' },
  { key: 'festival', emoji: '🎊' },
  { key: 'story', emoji: '📖' },
]

export default function TemplatePickerModal({ open, onClose, onSelect }: Props) {
  const { t, i18n } = useTranslation()
  const [active, setActive] = useState<TemplateCategory>('product')
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = TEMPLATE_IDS.filter((tpl) => tpl.category === active)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = TEMPLATE_IDS.filter((tpl) => {
        const content = getTemplateContent(tpl.id, i18n.language)
        if (!content) return false
        return (
          content.title.toLowerCase().includes(q) ||
          content.content.toLowerCase().includes(q)
        )
      })
    }
    return list
  }, [active, search, i18n.language])

  const handlePick = (id: string) => {
    const content = getTemplateContent(id, i18n.language)
    if (!content) return
    onSelect(content.content)
    onClose()
  }

  const previewContent = preview ? getTemplateContent(preview, i18n.language) : null

  return (
    <Modal open={open} onClose={onClose} size="2xl" hideClose>
      <div className="flex h-[600px] max-h-[80vh]">
        {/* 左:分类 + 列表 */}
        <div className="w-72 flex-shrink-0 border-r border-[rgb(var(--border))] flex flex-col">
          <div className="p-4 border-b border-[rgb(var(--border))]">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-5 h-5 text-brand-500" />
              <h2 className="font-semibold">{t('template.title')}</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgb(var(--text-muted))]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('filter.searchPlaceholder')}
                className="input pl-8 text-sm"
              />
            </div>
          </div>

          <div className="p-2 border-b border-[rgb(var(--border))]">
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => {
                    setActive(c.key)
                    setSearch('')
                  }}
                  className={cn(
                    'flex flex-col items-center gap-0.5 p-2 rounded-lg text-xs transition',
                    active === c.key
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                      : 'hover:bg-[rgb(var(--surface-2))] text-[rgb(var(--text-muted))]',
                  )}
                >
                  <span className="text-lg">{c.emoji}</span>
                  <span className="truncate w-full text-center">
                    {t(`template.categories.${c.key}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-sm text-[rgb(var(--text-muted))]">
                {t('filter.noResult')}
              </div>
            ) : (
              filtered.map((tpl) => {
                const content = getTemplateContent(tpl.id, i18n.language)
                if (!content) return null
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setPreview(tpl.id)}
                    className={cn(
                      'w-full text-left p-2.5 rounded-lg transition flex items-start gap-2.5',
                      preview === tpl.id
                        ? 'bg-brand-50 dark:bg-brand-500/10'
                        : 'hover:bg-[rgb(var(--surface-2))]',
                    )}
                  >
                    <span className="text-xl flex-shrink-0">{tpl.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {content.title}
                      </div>
                      <div className="text-xs text-[rgb(var(--text-muted))] line-clamp-1 mt-0.5">
                        {content.content}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* 右:预览 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-3 border-b border-[rgb(var(--border))] flex items-center justify-between">
            <p className="text-sm text-[rgb(var(--text-muted))]">
              {t('template.desc')}
            </p>
            <button onClick={onClose} className="p-1 hover:bg-[rgb(var(--surface-2))] rounded">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {previewContent ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">
                    {TEMPLATE_IDS.find((t) => t.id === preview)?.icon}
                  </span>
                  <h3 className="text-lg font-semibold">{previewContent.title}</h3>
                </div>
                <div className="prose prose-sm max-w-none text-[rgb(var(--text))] leading-relaxed whitespace-pre-wrap text-sm bg-[rgb(var(--surface-2))] p-4 rounded-lg">
                  {previewContent.content}
                </div>
                <p className="text-xs text-[rgb(var(--text-muted))] mt-3">
                  {t('common.optional') === 'Optional' ? 'Tip' : '提示'}: [xxx]
                  {t('common.optional') === 'Optional' ? ' are placeholders' : ' 是占位符,使用时请替换为实际内容'}
                </p>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-[rgb(var(--text-muted))]">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">
                    {i18n.language.startsWith('zh') ? '选择一个模板预览' : 'Pick a template to preview'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-[rgb(var(--border))] flex justify-end gap-2">
            <button onClick={onClose} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button
              onClick={() => preview && handlePick(preview)}
              disabled={!preview}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              {t('wizard.useTemplate')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
