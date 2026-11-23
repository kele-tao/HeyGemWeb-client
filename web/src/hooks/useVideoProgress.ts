import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { api } from '@/api'
import type { VideoProgress } from '@/types'

const START_DELAY = 2000
const MAX_DELAY = 10000

/**
 * 作品进度轮询（GET /api/videos/progress）。
 * - queued/processing 存在时 2s 起，指数退避到 10s
 * - 全部终态即停止
 * - 页面不可见时暂停
 */
export function useVideoProgress() {
  const videos = useAppStore((s) => s.videos)
  const applyProgress = useAppStore((s) => s.applyProgress)
  const timerRef = useRef<number | null>(null)
  const delayRef = useRef(START_DELAY)
  const pausedRef = useRef(false)
  const inFlightRef = useRef(false)

  const activeIds = videos
    .filter((v) => v.status === 'queued' || v.status === 'processing')
    .map((v) => v.id)
  const activeKey = activeIds.join(',')

  useEffect(() => {
    if (!activeKey) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      delayRef.current = START_DELAY
      return
    }

    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      if (pausedRef.current) {
        timerRef.current = window.setTimeout(tick, 5000)
        return
      }
      if (inFlightRef.current) return
      const ids = useAppStore
        .getState()
        .videos.filter((v) => v.status === 'queued' || v.status === 'processing')
        .map((v) => v.id)
      if (ids.length === 0) return

      inFlightRef.current = true
      try {
        const results: VideoProgress[] = await api.videos.progress(ids)
        applyProgress(results)
        const stillActive = results.some(
          (r) => r.status === 'queued' || r.status === 'processing',
        )
        delayRef.current = stillActive
          ? Math.min(delayRef.current * 1.6, MAX_DELAY)
          : START_DELAY
      } catch {
        delayRef.current = Math.min(delayRef.current * 1.8, MAX_DELAY)
      } finally {
        inFlightRef.current = false
        if (!cancelled) {
          timerRef.current = window.setTimeout(tick, delayRef.current)
        }
      }
    }

    timerRef.current = window.setTimeout(tick, 0)

    const onVisibility = () => {
      pausedRef.current = document.hidden
    }
    document.addEventListener('visibilitychange', onVisibility)
    onVisibility()

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [activeKey, applyProgress])
}

/**
 * 单个资源的处理状态轮询（数字人 processing → ready/failed，声音 training → complete/failed）。
 * 2s 起，指数退避到 10s；到达终态或超时即停止。
 */
export function usePollResource(
  active: boolean,
  fetcher: () => Promise<{ status: string }>,
  onUpdate: (value: { status: string }) => void,
  onSettled?: (status: string) => void,
) {
  const fetcherRef = useRef(fetcher)
  const updateRef = useRef(onUpdate)
  const settledRef = useRef(onSettled)
  fetcherRef.current = fetcher
  updateRef.current = onUpdate
  settledRef.current = onSettled

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let timer: number | null = null
    let delay = 2000
    let attempts = 0
    const MAX_ATTEMPTS = 150 // ≈ 20 分钟上限

    const tick = async () => {
      if (cancelled) return
      attempts += 1
      try {
        const value = await fetcherRef.current()
        if (cancelled) return
        updateRef.current(value)
        const terminal = ['ready', 'complete', 'failed'].includes(value.status)
        if (terminal) {
          settledRef.current?.(value.status)
          return
        }
        delay = Math.min(delay * 1.5, 10000)
      } catch {
        delay = Math.min(delay * 1.8, 10000)
      }
      if (attempts >= MAX_ATTEMPTS) return
      timer = window.setTimeout(tick, delay)
    }

    timer = window.setTimeout(tick, 600)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [active])
}
