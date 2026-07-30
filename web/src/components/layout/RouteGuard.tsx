import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'

interface Props {
  children: ReactNode
  /** 需要满足的 store 条件 */
  require?: (state: ReturnType<typeof useAppStore.getState>) => boolean
  /** 不满足时跳转的路径 */
  redirectTo?: string
}

export default function RouteGuard({
  children,
  require,
  redirectTo = '/',
}: Props) {
  const location = useLocation()
  const state = useAppStore.getState()

  if (require && !require(state)) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  return <>{children}</>
}
