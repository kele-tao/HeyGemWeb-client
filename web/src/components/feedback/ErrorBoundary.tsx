import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import AuroraBackground from '@/components/brand/AuroraBackground'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // 上线接 Sentry: Sentry.captureException(error, { extra: info })
    if (import.meta.env.DEV) {
      console.error('Uncaught error:', error, info.componentStack)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="relative h-full flex items-center justify-center overflow-hidden bg-[rgb(var(--bg))]">
          <AuroraBackground intensity={0.4} />
          <div className="relative text-center px-6 max-w-md">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 rounded-full bg-danger-500/30 blur-2xl animate-pulse-glow" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-danger-500 to-danger-600 flex items-center justify-center text-white shadow-xl">
                <AlertTriangle className="w-8 h-8" />
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-tight">出了点小问题</h1>
            <p className="text-sm text-[rgb(var(--text-muted))] mt-2 leading-relaxed">
              {this.state.error?.message ||
                '应用遇到了一个意外错误,请刷新页面重试。'}
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-4 p-3 bg-[rgb(var(--surface-2))] rounded-lg text-2xs text-left overflow-auto max-h-32 text-[rgb(var(--text-muted))]">
                {this.state.error.stack}
              </pre>
            )}
            <div className="mt-6 flex justify-center gap-2">
              <button onClick={this.handleReset} className="btn-secondary">
                <RefreshCw className="w-4 h-4" />
                重试
              </button>
              <button onClick={this.handleReload} className="btn-primary">
                刷新页面
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
