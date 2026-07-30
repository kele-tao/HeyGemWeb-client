import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { ConfirmProvider } from './hooks/useConfirm'
import ErrorBoundary from './components/feedback/ErrorBoundary'
import './i18n'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgb(var(--surface))',
              color: 'rgb(var(--text))',
              border: '1px solid rgb(var(--border))',
              boxShadow: '0 8px 32px -8px rgba(0,0,0,0.16)',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)

// 注册 Service Worker (生产环境)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (import.meta.env.DEV) console.log('SW registered:', reg.scope)
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('SW registration failed:', err)
      })
  })
}
