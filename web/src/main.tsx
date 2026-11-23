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
              border: '1px solid rgb(var(--hairline))',
              boxShadow: '0 18px 40px -24px rgba(0,0,0,0.85)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: 'rgb(79,169,110)', secondary: 'rgb(16,18,21)' } },
            error: { iconTheme: { primary: 'rgb(229,72,77)', secondary: 'rgb(16,18,21)' } },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)

// 注册 Service Worker (生产环境)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      if (import.meta.env.DEV) console.warn('SW registration failed:', err)
    })
  })
}
