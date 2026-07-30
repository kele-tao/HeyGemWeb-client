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

    const onLoaded = () => {
      if (cancelled) return
      setMeta({
        loading: false,
        error: null,
        duration: el.duration,
        width: isVideo ? (el as HTMLVideoElement).videoWidth : undefined,
        height: isVideo ? (el as HTMLVideoElement).videoHeight : undefined,
      })
      URL.revokeObjectURL(url)
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
