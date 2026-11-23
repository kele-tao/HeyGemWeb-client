import { useEffect, useState } from 'react'

interface MediaMeta {
  duration?: number
  width?: number
  height?: number
  /** 是否有音频轨(仅视频) */
  hasAudio?: boolean
}

interface Result extends MediaMeta {
  loading: boolean
  error: string | null
}

/**
 * 读取媒体文件元信息(时长/尺寸)
 * - 音频:返回 duration
 * - 视频:返回 duration + 宽高
 */
export function useMediaMeta(file: File | null): Result {
  const [meta, setMeta] = useState<Result>({
    loading: false,
    error: null,
  })

  useEffect(() => {
    if (!file) {
      setMeta({ loading: false, error: null })
      return
    }

    setMeta({ loading: true, error: null })

    const isVideo = file.type.startsWith('video/')
    const isAudio = file.type.startsWith('audio/')
    if (!isVideo && !isAudio) {
      setMeta({ loading: false, error: '不支持的文件类型' })
      return
    }

    const url = URL.createObjectURL(file)
    const el = isVideo ? document.createElement('video') : new Audio()

    let cancelled = false

    const apply = () => {
      if (cancelled) return
      // 流式录制的 webm 元数据里没有 duration（为 Infinity），视为未知交给服务端探测
      const raw = el.duration
      const duration = Number.isFinite(raw) && raw > 0 ? raw : undefined
      setMeta({
        loading: false,
        error: null,
        duration,
        width: isVideo ? (el as HTMLVideoElement).videoWidth || undefined : undefined,
        height: isVideo ? (el as HTMLVideoElement).videoHeight || undefined : undefined,
      })
      URL.revokeObjectURL(url)
    }

    const onLoaded = () => {
      if (cancelled) return
      const raw = el.duration
      if (Number.isFinite(raw) && raw > 0) {
        apply()
        return
      }
      // 某些容器需要先 seek 到末尾才能得到真实时长
      const onDuration = () => {
        el.removeEventListener('durationchange', onDuration)
        apply()
      }
      el.addEventListener('durationchange', onDuration)
      try {
        el.currentTime = Number.MAX_SAFE_INTEGER
      } catch {
        apply()
      }
      // 兜底：1.5s 后无论是否拿到都按"未知时长"完成
      setTimeout(() => {
        el.removeEventListener('durationchange', onDuration)
        apply()
      }, 1500)
    }

    const onError = () => {
      if (cancelled) return
      setMeta({ loading: false, error: '无法读取该文件' })
      URL.revokeObjectURL(url)
    }

    el.preload = 'metadata'
    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('error', onError)
    el.src = url

    return () => {
      cancelled = true
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('error', onError)
      URL.revokeObjectURL(url)
    }
  }, [file])

  return meta
}