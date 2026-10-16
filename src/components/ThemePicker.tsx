import { useState } from 'react'
import { setWorkspaceTheme, useWorkspaceTheme, type WorkspaceTheme } from '../lib/workspace-theme'

export default function ThemePicker() {
  const { preference } = useWorkspaceTheme()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const change = async (value: WorkspaceTheme) => {
    setBusy(true); setError('')
    try { await setWorkspaceTheme(value) }
    catch (error) { setError(error instanceof Error ? error.message : String(error)) }
    finally { setBusy(false) }
  }
  return <div className="workspace-theme-picker">
    <label>工作区主题<select aria-label="工作区主题" value={preference} disabled={busy} onChange={event => void change(event.target.value as WorkspaceTheme)}>
      <option value="dark">深色</option><option value="light">浅色</option><option value="system">跟随系统</option>
    </select></label>
    <p>浅色为白底深色文字；跟随系统会随设备设置切换。适用于工作区和标准报告。</p>
    {error && <p role="alert">{error}</p>}
  </div>
}
