import { Film } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Avatar } from '@/types'

interface Props {
  avatar: Avatar | undefined
  submitting?: boolean
}

/** 编辑器预览：16:9 近黑容器，人物视频静音循环（无外发光） */
export default function PreviewPanel({ avatar, submitting }: Props) {
  const { t } = useTranslation()

  return (
    <div className="preview-frame aspect-video w-full">
      {avatar?.video_url ? (
        <video
          src={avatar.video_url}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      ) : avatar?.thumb_url ? (
        <img src={avatar.thumb_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <>
          <div className="stage-light absolute inset-0" aria-hidden />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/35">
            <Film className="h-8 w-8" aria-hidden />
            <span className="text-xs">{t('editor.previewEmpty')}</span>
          </div>
        </>
      )}

      {submitting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white">
          {t('editor.submitting')}
        </div>
      )}
    </div>
  )
}
