import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

/** 浏览器标题与任务进度同步 */
export function useDocumentTitle() {
  const videos = useAppStore((s) => s.videos)

  useEffect(() => {
    const processing = videos.filter(
      (v) => v.status === 'processing' || v.status === 'queued',
    ).length
    const failed = videos.filter((v) => v.status === 'failed').length

    let title = 'HeyGem'
    if (processing > 0) title = `HeyGem · ${processing} 个处理中`
    else if (failed > 0) title = `HeyGem · ${failed} 个失败`

    if (document.title !== title) document.title = title
  }, [videos])
}
