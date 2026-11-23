import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Plus, Search } from 'lucide-react'
import Modal from '@/components/feedback/Modal'
import { TEMPLATE_IDS, getTemplateContent, type TemplateCategory } from '@/data/scriptTemplates'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (script: string) => void
}

const CATEGORIES: TemplateCategory[] = [
  'product',
  'course',
  'marketing',
  'knowledge',
  'festival',
  'story',
]

export default function TemplatePickerModal({ open, onClose, onSelect }: Props) {
  const { t, i18n } = useTranslation()
  const [active, setActive] = useState<TemplateCategory>('product')
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase()
      return TEMPLATE_IDS.filter((tpl) => {
        const content = getTemplateContent(tpl.id, i18n.language)
        if (!content) return false
        return (
          content.title.toLowerCase().includes(q) || content.content.toLowerCase().includes(q)
        )
      })
    }
    return TEMPLATE_IDS.filter((tpl) => tpl.category === active)
  }, [active, search, i18n.language])

  const previewContent = preview ? getTemplateContent(preview, i18n.language) : null

  const handlePick = (id: string) => {
    const content = getTemplateContent(id, i18n.language)
    if (!content) return
    onSelect(content.content)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={t('template.title')} size="2xl">
      <div className="flex h-[560px] max-h-[78vh] flex-col md:flex-row">
        {/* 左：分类 + 列表 */}
        <div className="flex w-full flex-shrink-0 flex-col border-b border-[rgb(var(--hairline))] md:w-72 md:border-b-0 md:border-r">
          <div className="border-b border-[rgb(var(--hairline))] p-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--text-3))]"
                aria-hidden
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('filter.searchPlaceholder')}
                className="input pl-8"
                aria-label={t('filter.searchPlaceholder')}
                type="search"
              />
            </div>
          </div>

          <div className="border-b border-[rgb(var(--hairline))] p-2">
            <div className="flex flex-wrap gap-1">
              {CATEGORIES.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActive(key)
                    setSearch('')
                  }}
                  aria-pressed={active === key && !search}
                  className={cn(
                    'rounded px-2 py-1 text-xs transition-colors',
                    active === key && !search
                      ? 'bg-[rgb(var(--surface-2))] text-[rgb(var(--text))]'
                      : 'text-[rgb(var(--text-3))] hover:text-[rgb(var(--text))]',
                  )}
                >
                  {t(`template.categories.${key}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-0.5 overflow-y-auto p-2 scrollbar-thin">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-[rgb(var(--text-3))]">
                {t('filter.noResult')}
              </div>
            ) : (
              filtered.map((tpl) => {
                const content = getTemplateContent(tpl.id, i18n.language)
                if (!content) return null
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setPreview(tpl.id)}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-md p-2 text-left transition-colors',
                      preview === tpl.id
                        ? 'bg-[rgb(var(--surface-2))]'
                        : 'hover:bg-[rgb(var(--surface-2))]',
                    )}
                  >
                    <span className="flex-shrink-0 text-base" aria-hidden>
                      {tpl.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{content.title}</span>
                      <span className="mt-0.5 line-clamp-1 block text-[11px] text-[rgb(var(--text-3))]">
                        {content.content}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* 右：预览 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            {previewContent ? (
              <>
                <h3 className="mb-2 text-lg font-semibold">{previewContent.title}</h3>
                <div className="whitespace-pre-wrap rounded-md bg-[rgb(var(--surface-2))] p-3 text-sm leading-relaxed text-[rgb(var(--text-2))]">
                  {previewContent.content}
                </div>
                <p className="mt-2 text-[11px] text-[rgb(var(--text-3))]">
                  {t('template.placeholderHint')}
                </p>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-[rgb(var(--text-3))]">
                <div className="text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" aria-hidden />
                  <p className="text-xs">{t('template.desc')}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-[rgb(var(--hairline))] p-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => preview && handlePick(preview)}
              disabled={!preview}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t('template.use')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
