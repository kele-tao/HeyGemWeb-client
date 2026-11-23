import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import RequireAuth from '@/components/layout/RequireAuth'
import RouteGuard from '@/components/layout/RouteGuard'
import ErrorBoundary from '@/components/feedback/ErrorBoundary'
import Onboarding from '@/components/feedback/Onboarding'
import LoadingScreen from '@/components/feedback/LoadingScreen'
import NotFound from '@/components/feedback/NotFound'
import { useGlobalShortcuts } from '@/hooks/useShortcuts'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap'
import { useAppStore } from '@/store/useAppStore'
import { useAuthStore } from '@/store/useAuthStore'

const HomePage = lazy(() => import('@/pages/HomePage'))
const WorksPage = lazy(() => import('@/pages/WorksPage'))
const AvatarsPage = lazy(() => import('@/pages/AvatarsPage'))
const VoicesPage = lazy(() => import('@/pages/VoicesPage'))
const EditorPage = lazy(() => import('@/pages/EditorPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))

function PageFallback() {
  return (
    <div className="flex h-full items-center justify-center" role="status" aria-live="polite">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[rgb(var(--accent))] border-t-transparent" />
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const avatars = useAppStore((s) => s.avatars)
  const user = useAuthStore((s) => s.user)
  const isDataLoaded = useAppStore((s) => s.isDataLoaded)
  const loadError = useAppStore((s) => s.loadError)
  // 数据就绪，或已明确加载失败（此时由路由守卫把用户带去可重试的页面）
  const dataReady = isDataLoaded || !!loadError
  useAuthBootstrap()
  useGlobalShortcuts()
  useDocumentTitle()

  // 路由切换回到顶部（滚动容器是 main）
  useEffect(() => {
    const main = document.querySelector('main')
    if (main) main.scrollTop = 0
  }, [location.pathname])

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<PageFallback />}>
                  <HomePage />
                </Suspense>
              }
            />
            <Route
              path="works"
              element={
                <Suspense fallback={<PageFallback />}>
                  <WorksPage />
                </Suspense>
              }
            />
            <Route
              path="avatars"
              element={
                <Suspense fallback={<PageFallback />}>
                  <AvatarsPage />
                </Suspense>
              }
            />
            <Route
              path="voices"
              element={
                <Suspense fallback={<PageFallback />}>
                  <VoicesPage />
                </Suspense>
              }
            />
            <Route
              path="editor"
              element={
                /* 首屏数据未就绪时先不判定（避免刷新 /editor 被误踢），就绪后再校验 */
                dataReady ? (
                  <RouteGuard when={avatars.length > 0} redirectTo="/avatars">
                    <Suspense fallback={<PageFallback />}>
                      <EditorPage />
                    </Suspense>
                  </RouteGuard>
                ) : (
                  <LoadingScreen />
                )
              }
            />
            <Route path="404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Routes>
      </Suspense>
      {/* 新手引导只在已登录的非登录页出现 */}
      {user && location.pathname !== '/login' && <Onboarding />}
    </ErrorBoundary>
  )
}