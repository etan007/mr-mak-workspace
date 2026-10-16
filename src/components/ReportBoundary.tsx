import { Component, type ReactNode } from 'react'

// A failed lazy import or renderer must not unmount the Workspace navigation.
export default class ReportBoundary extends Component<{
  children: ReactNode
  onHome: () => void
}, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return <div className="report-error" role="alert">
      <strong>无法打开此报告。</strong>
      <p>重新加载以重试，或返回工作区。你的项目文件没有被修改。</p>
      <div className="report-error-actions">
        <button onClick={() => window.location.reload()}>重新加载页面</button>
        <button onClick={this.props.onHome}>返回工作区</button>
      </div>
      <details><summary>错误详情</summary><pre>{this.state.error.message || String(this.state.error)}</pre></details>
    </div>
  }
}
