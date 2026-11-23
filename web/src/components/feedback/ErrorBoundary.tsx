import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

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
    if (import.meta.env.DEV) {
      console.error('Uncaught error:', error, info.componentStack)
    }
  }

  handleReset = () => this.setState({ hasError: false, error: undefined })
  handleReload = () => window.location.reload()

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[rgb(var(--danger))]/25 bg-[rgb(var(--danger))]/10 text-[rgb(var(--danger))]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">页面出了点问题</h1>
          <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--text-3))]">
            {this.state.error?.message || '应用遇到了意外错误，请重试或刷新页面。'}
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 max-h-32 overflow-auto rounded-md bg-[rgb(var(--surface-2))] p-3 text-left text-[11px] text-[rgb(var(--text-3))]">
              {this.state.error.stack}
            </pre>
          )}
          <div className="mt-6 flex justify-center gap-2">
            <button type="button" onClick={this.handleReset} className="btn-secondary">
              <RefreshCw className="h-4 w-4" />
              重试
            </button>
            <button type="button" onClick={this.handleReload} className="btn-primary">
              刷新页面
            </button>
          </div>
        </div>
      </div>
    )
  }
}
