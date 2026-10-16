import { useEffect, useState } from 'react'
import { api, onServiceEvent, useDesktop } from './client'
import type { Settings } from './types'
import { Icon } from './Icons'
import DictationSettings from '../components/DictationSettings'
import { useDictation } from './useDictation'
import ThemePicker from '../components/ThemePicker'
import { isMac, shellName } from './platform'

type NativeSettings = { available: boolean; winKey: boolean; label?: string; error?: string }
export default function WorkspaceSettings({ onClose }: { onClose: () => void }) {
  const dictation = useDictation()
  const { settings, repo } = useDesktop()
  const [native, setNative] = useState<NativeSettings>({ available: false, winKey: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const refresh = () => api<NativeSettings>('/native/settings').then(setNative).catch(error => setError(String(error.message || error)))
    void refresh()
    return onServiceEvent(event => { if (event.type === 'native-settings') void refresh() })
  }, [])
  const change = async (patch: Partial<Settings>) => {
    setBusy(true); setError('')
    try { await api('/settings', patch) } catch (error) { setError(String(error instanceof Error ? error.message : error)) }
    finally { setBusy(false) }
  }
  const winKey = async (enabled: boolean) => {
    setBusy(true); setError('')
    try { setNative(await api<NativeSettings>('/native/settings', { winKey: enabled })) }
    catch (error) { setError(String(error instanceof Error ? error.message : error)) }
    finally { setBusy(false) }
  }
  return <div className="files-panel workspace-settings"><header><h2>设置</h2><button className="desk-icon" onClick={onClose} aria-label="关闭设置"><Icon name="close" size={17} /></button></header>
    <div className="settings-scroll"><section><h3>外观</h3><ThemePicker /></section><section><h3>{isMac ? '快捷键' : 'Windows'}</h3><label className="setting-toggle"><span>按 {native.label || (isMac ? '⌃⌥Space' : 'Win 键')} 显示 Mr. Mak<small>{isMac ? '在任意应用中调回已打开的窗口。' : '调回已打开的窗口。Win 组合快捷键仍然有效；Ctrl+Esc 打开开始菜单。'}</small></span><input type="checkbox" checked={native.winKey} disabled={busy || !native.available} onChange={event => void winKey(event.target.checked)} /></label>{!native.available && <p>{native.error || '仅在 Windows 和 macOS 桌面应用中可用。'}</p>}</section>
    <section><h3>对话</h3><label>默认代理<select disabled={busy} value={settings.defaultAgent} onChange={event => void change({ defaultAgent: event.target.value as Settings['defaultAgent'] })}><option value="codex">Codex</option><option value="claude">Claude</option><option value="antigravity">Antigravity</option><option value="opencode">OpenCode</option><option value="kimi">Kimi</option><option value="shell">{shellName}</option></select></label>
      <label>终端字号<select disabled={busy} value={settings.terminalFontSize || 13} onChange={event => void change({ terminalFontSize: Number(event.target.value) })}>{Array.from({ length: 15 }, (_, i) => i + 10).map(size => <option key={size} value={size}>{size} px</option>)}</select></label>
      <label>终端外观<select disabled={busy} value={settings.terminalAppearance || 'original'} onChange={event => void change({ terminalAppearance: event.target.value as Settings['terminalAppearance'] })}><option value="original">原始 CLI 配色</option><option value="focus">Mr. Mak 专注 · 柔和配色</option></select></label><p>原始配色保留 CLI 的颜色，包括新增和删除的行。专注模式使用柔和配色。该选择对所有对话生效，立即应用，无需重启。</p>
      <label className="setting-toggle"><span>跳过 CLI 权限确认<small>新对话的默认设置。</small></span><input type="checkbox" checked={settings.defaultBypass} disabled={busy} onChange={event => void change({ defaultBypass: event.target.checked })} /></label>
    </section><DictationSettings info={dictation.info} onChange={dictation.choose} /><section><h3>Mr. Mak</h3><label>语音<select disabled={busy} value={settings.voiceName || 'cedar'} onChange={event => void change({ voiceName: event.target.value })}><option value="cedar">Cedar</option><option value="marin">Marin</option></select></label><label>协调器推理强度<select disabled={busy} value={settings.coordinatorEffort || 'medium'} onChange={event => void change({ coordinatorEffort: event.target.value as Settings['coordinatorEffort'] })}><option value="medium">中</option><option value="high">高</option></select></label><p>语音更改将在下一次对话中生效。</p></section>
      <section><h3>项目</h3><p className="settings-repo">{repo}</p><p>技能、知识和流程都属于此仓库。</p></section>
      {error && <p className="desk-error-inline" role="alert">{error}</p>}
    </div></div>
}
