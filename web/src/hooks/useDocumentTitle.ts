import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

/**
 * 同步浏览器标题显示任务进度
 * - 有处理中任务: "HeyGem · 2 个任务处理中"
 * - 失败任务: "HeyGem · 1 个失败"
 * - 正常: "HeyGem"
 */
export function useDocumentTitle() {
  const videos = useAppStore((s) => s.videos)

  useEffect(() => {
    const processing = videos.filter(
      (v) => v.status === 'processing' || v.status === 'queued',
    ).length
    const failed = videos.filter((v) => v.status === 'failed').length

    let title = 'HeyGem'
    if (processing > 0) {
      title = `HeyGem · ${processing} 个处理中`
    } else if (failed > 0) {
      title = `HeyGem · ${failed} 个失败`
    }

    if (document.title !== title) {
      document.title = title
    }
  }, [videos])
}
