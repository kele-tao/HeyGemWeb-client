import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * 全局快捷键
 * - `g h` 跳首页
 * - `g w` 跳作品
 * - `g a` 跳模特
 * - `g v` 跳声音
 * - `g n` 新建项目
 * - `?` 显示快捷键
 */
export function useGlobalShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    let prefix: string | null = null
    let prefixTimer: ReturnType<typeof setTimeout> | null = null

    const handle = (e: KeyboardEvent) => {
      // 输入框中不响应
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      if (prefix === 'g') {
        switch (e.key) {
          case 'h':
            navigate('/')
            break
          case 'w':
            navigate('/works')
            break
          case 'a':
            navigate('/avatars')
            break
          case 'v':
            navigate('/voices')
            break
        }
        prefix = null
        if (prefixTimer) clearTimeout(prefixTimer)
        return
      }

      if (e.key === 'g') {
        prefix = 'g'
        prefixTimer = setTimeout(() => {
          prefix = null
        }, 1500)
        return
      }
    }

    document.addEventListener('keydown', handle)
    return () => {
      document.removeEventListener('keydown', handle)
      if (prefixTimer) clearTimeout(prefixTimer)
    }
  }, [navigate])
}
