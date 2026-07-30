import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { api } from '@/api'
import type { VideoStatus } from '@/types'

/**
 * 智能轮询视频合成进度。
 * - 指数退避(2s -> 4s -> 8s,上限 10s)
 * - 全部任务完成后自动停止
 * - 失败后重试但保持间隔
 * - 页面不可见时暂停轮询
 */
export function useVideoProgress() {
  const videos = useAppStore((s) => s.videos)
  const updateVideo = useAppStore((s) => s.updateVideo)
  const timerRef = useRef<number | null>(null)
  const delayRef = useRef(2000)
  const pausedRef = useRef(false)

  useEffect(() => {
    const active = videos.filter(
      (v) => v.status === 'queued' || v.status === 'processing',
    )
    if (active.length === 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      delayRef.current = 2000
      return
    }

    const tick = async () => {
      if (pausedRef.current) {
        timerRef.current = window.setTimeout(tick, 5000)
        return
      }

      const codes = useAppStore
        .getState()
        .videos
        .filter((v) => v.status === 'queued' || v.status === 'processing')
        .map((v) => v.task_code)
        .filter(Boolean)

      if (codes.length === 0) return

      try {
        const results = await api.batchCheck(codes)
        for (const r of results) {
          const status = mapStatus(r.status)
          if (!status) continue
          const patch: Partial<{ status: VideoStatus; videoUrl: string; error_message: string }> = { status }
          if (status === 'success' && r.video_url) patch.videoUrl = r.video_url
          if (status === 'failed' && r.msg) patch.error_message = r.msg
          updateVideo(r.code, patch)
        }
        delayRef.current = 2000
      } catch {
        delayRef.current = Math.min(delayRef.current * 1.5, 10000)
      } finally {
        timerRef.current = window.setTimeout(tick, delayRef.current)
      }
    }

    timerRef.current = window.setTimeout(tick, 0)

    // 页面可见性
    const onVisibility = () => {
      pausedRef.current = document.hidden
    }
    document.addEventListener('visibilitychange', onVisibility)
    onVisibility()

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [videos, updateVideo])
}

function mapStatus(s: string): VideoStatus | null {
  switch (s) {
    case '排队中':
    case 'Queued':
      return 'queued'
    case '处理中':
    case 'Processing':
      return 'processing'
    case '成功':
    case 'Success':
      return 'success'
    case '失败':
    case 'Failed':
      return 'failed'
    default:
      return null
  }
}
