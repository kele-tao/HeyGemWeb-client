import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

interface Props {
  children: ReactNode
  /** 需要满足的条件（如至少一个数字人） */
  when: boolean
  /** 不满足时跳转的路径 */
  redirectTo?: string
}

/** 业务前置条件守卫（保留原有「至少一个数字人」职责） */
export default function RouteGuard({ children, when, redirectTo = '/' }: Props) {
  const location = useLocation()
  if (!when) {
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}
