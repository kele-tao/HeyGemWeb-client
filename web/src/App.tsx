import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore, bootstrapData } from '@/store/useAppStore'
import AppLayout from '@/components/layout/AppLayout'
import LoadingScreen from '@/components/feedback/LoadingScreen'
import Onboarding from '@/components/feedback/Onboarding'
import NotFound from '@/components/feedback/NotFound'
import ErrorBoundary from '@/components/feedback/ErrorBoundary'
import RouteGuard from '@/components/layout/RouteGuard'
import { useGlobalShortcuts } from '@/hooks/useShortcuts'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// 路由懒加载 - 减小首屏 bundle
const HomePage = lazy(() => import('@/pages/HomePage'))
const WorksPage = lazy(() => import('@/pages/WorksPage'))
const AvatarsPage = lazy(() => import('@/pages/AvatarsPage'))
const VoicesPage = lazy(() => import('@/pages/VoicesPage'))
const EditorPage = lazy(() => import('@/pages/EditorPage'))

function PageFallback() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
  )
}

export default function App() {
  const isDataLoaded = useAppStore((s) => s.isDataLoaded)

  useEffect(() => {
    bootstrapData()
  }, [])

  useGlobalShortcuts()
  useDocumentTitle()

  if (!isDataLoaded) return <LoadingScreen />

  return (
    <>
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/works" element={<WorksPage />} />
              <Route path="/avatars" element={<AvatarsPage />} />
              <Route path="/voices" element={<VoicesPage />} />
              <Route
                path="/editor"
                element={
                  <RouteGuard
                    require={(s) => s.avatars.length > 0}
                    redirectTo="/avatars"
                  >
                    <EditorPage />
                  </RouteGuard>
                }
              />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <Onboarding />
    </>
  )
}
