import { useCallback, useEffect, useState } from 'react'
import { api, reportError, selectChat, sendEvent, useDesktop, windowAction } from './client'
import type { AgentId, ChatSession } from './types'
import { AgentLogo, Icon, Nose } from './Icons'
import TerminalPane from './TerminalPane'
import SessionLogo from './SessionLogo'
import { chatActivityLabel } from './chatActivity'
import ChatTabs from './ChatTabs'
import { orderedChats, tabColors } from './chatOrder'
import MobileAccess from './MobileAccess'
import DictationComposer from './DictationComposer'
import { isMac, isWindows, modKey, modLabel, shortcutLabel } from './platform'

const effortLabels = { medium: '中', high: '高', xhigh: '超高', max: '最高' } as const

function NewChat({ close }: { close: () => void }) {
  const state = useDesktop()
  const [agent, setAgent] = useState<AgentId>(state.settings.defaultAgent)
  const [name, setName] = useState('')
  const [cwd, setCwd] = useState(state.repo)
  const [bypass, setBypass] = useState(state.settings.defaultBypass)
  const [resumeId, setResumeId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function launch(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const session = await api<ChatSession>('/sessions', { agent, name: name.trim() || undefined, cwd, bypass, resumeId: resumeId.trim() || undefined })
      await api('/settings', { defaultAgent: agent, defaultBypass: bypass })
      selectChat(session.id); close()
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(false) }
  }
  return <div className="desk-scrim" onClick={close}><form className="desk-dialog" onClick={event => event.stopPropagation()} onSubmit={launch}>
    <div className="desk-dialog-heading"><div><span className="desk-eyebrow">为下一件事准备的地方</span><h2>新建对话</h2></div><button type="button" className="desk-icon" onClick={close} aria-label="关闭"><Icon name="close" /></button></div>
    <div className="agent-picker">{state.agents.map(item => <button type="button" key={item.id} className={`agent-choice ${agent === item.id ? 'selected' : ''}`} onClick={() => setAgent(item.id)} disabled={!item.available} style={{ '--agent-color': item.color } as React.CSSProperties}><span className="agent-mark"><AgentLogo agent={item.id} size={23} /></span><span>{item.label}<small>{item.available ? item.id === 'shell' ? '本地终端' : item.id === 'opencode' ? '你的模型服务商' : '你的 CLI 账号' : '未安装'}</small></span>{agent === item.id && <span className="choice-check">✓</span>}</button>)}</div>
    {agent === 'antigravity' && <p className="desk-muted">在终端中登录 Google，然后用 /model 选择可用模型。访问权限和用量限制取决于你的 Google 账号或 API 计费。</p>}
    <label className="desk-field">对话名称 <small>仅限英文</small><input autoFocus placeholder="例如 Dream Game · animations" value={name} onChange={event => setName(event.target.value)} maxLength={100} /></label>
    <label className="desk-field">工作文件夹<input value={cwd} onChange={event => setCwd(event.target.value)} required spellCheck={false} /></label>
    {agent !== 'shell' && <><label className="desk-check"><input type="checkbox" checked={bypass} onChange={event => setBypass(event.target.checked)} /><span>{agent === 'opencode' ? '自动批准权限请求' : '跳过代理的权限确认'}<small>{agent === 'opencode' ? 'OpenCode 中显式的 deny 规则仍然生效。' : `与平时使用的终端相同的 ${isMac ? 'macOS' : isWindows ? 'Windows' : ''}账号和文件访问权限。`}</small></span></label><details className="desk-details"><summary>恢复已有的 CLI 对话</summary><p>对于在 Mr. Mak 之外开始的对话，从 CLI 的会话详情或恢复选择器中复制其 ID。在这里创建的对话会自动恢复。</p><label className="desk-field">原生会话 ID<input value={resumeId} onChange={event => setResumeId(event.target.value)} placeholder="可选的会话 ID" /></label></details></>}
    {error && <p className="desk-error-inline" role="alert">{error}</p>}
    <button className="desk-primary" disabled={busy || !state.connected}>{busy ? '正在打开…' : '打开对话'}<Icon name="arrow" size={16} /></button>
  </form></div>
}

function History({ close, choose }: { close: () => void; choose: (id: string) => void }) {
  const state = useDesktop()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [opening, setOpening] = useState<string | null>(null)
  const items = [...state.sessions].filter(item => (filter === 'all' || (filter === 'pinned' ? item.pinned : item.agent === filter)) && `${item.name} ${item.agent} ${item.cwd} ${item.preview || ''}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned) || String(b.updatedAt).localeCompare(String(a.updatedAt)))
  async function open(item: ChatSession) {
    if (opening) return
    setOpening(item.id)
    try { if (!item.open || item.status !== 'running') await api(`/sessions/${item.id}/resume`, {}); choose(item.id); close() }
    catch (error) { reportError(error) } finally { setOpening(null) }
  }
  return <section className="chat-history" aria-label="对话历史">
    <header><span><Icon name="history" /><strong>历史</strong><small>{state.sessions.length} 个对话</small></span><button className="desk-icon" aria-label="关闭历史" onClick={close}><Icon name="close" /></button></header>
    <div className="history-search"><Icon name="search" size={16} /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="查找对话…" aria-label="搜索对话历史" /></div>
    <div className="history-filters">{[['all', '全部'], ['pinned', '已置顶'], ...state.agents.filter(item => item.id !== 'shell').map(item => [item.id, item.label])].map(([value, label]) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <div className="history-list">{items.map(item => <article key={item.id} className="history-item">
      <button className="history-open" onClick={() => open(item)} disabled={!!opening} title={`打开 ${item.name} · ${chatActivityLabel(item)}`}><span className="history-agent" style={{ color: state.agents.find(agent => agent.id === item.agent)?.color }}><SessionLogo session={item} size={24} /></span><span><strong>{item.name}</strong><small>{state.agents.find(agent => agent.id === item.agent)?.label} · {item.open ? '已打开' : new Date(item.updatedAt || item.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} · {item.cwd.split(/[\\/]/).filter(Boolean).slice(-1)[0]}</small>{item.preview && <p>{item.preview}</p>}</span><Icon name={opening === item.id ? 'refresh' : 'arrow'} size={16} /></button>
      <button className={`desk-icon history-pin ${item.pinned ? 'active' : ''}`} aria-label={`${item.pinned ? '取消置顶' : '置顶'} ${item.name}`} onClick={() => api(`/sessions/${item.id}`, { pinned: !item.pinned }, 'PATCH').catch(reportError)}><Icon name="pin" size={15} /></button>
    </article>)}{!items.length && <p className="desk-muted">{query ? '没有匹配的对话。' : filter === 'pinned' ? '置顶对话，方便随时找到。' : '关闭的对话会保存在这里，随时可以找回。'}</p>}</div>
    <footer>关闭标签页即可收起，对话仍保留在这里。</footer>
  </section>
}

export default function Chats() {
  const state = useDesktop()
  const [newChat, setNewChat] = useState(false)
  const [switcher, setSwitcher] = useState(false)
  const [history, setHistory] = useState(false)
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState('')
  const [pinned, setPinned] = useState(false)
  const [fontSize, setFontSize] = useState(() => state.settings.terminalFontSize || 13)
  const [attachmentNotice, setAttachmentNotice] = useState({ id: '', text: '' })
  const attachmentStatus = useCallback((id: string, text: string) => setAttachmentNotice(current => text || current.id === id ? { id, text } : current), [])
  const active = orderedChats(state.sessions)
  const session = active.find(item => item.id === state.selectedId) || active[0]
  const agent = state.agents.find(item => item.id === session?.agent)
  const running = session?.status === 'running' || session?.status === 'starting'
  const filtered = active.filter(item => `${item.name} ${item.agent} ${item.cwd}`.toLowerCase().includes(query.toLowerCase()))
  const choose = (id: string) => { selectChat(id); setSwitcher(false); setMenu(false); setHistory(false); setRenaming(false) }
  const closeChat = (id: string) => api(`/sessions/${id}`, {}, 'DELETE').catch(reportError)
  useEffect(() => {
    if (!state.connected || !session?.unread || history || switcher || newChat) return
    let timer = 0
    const viewed = () => {
      clearTimeout(timer)
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return
      timer = window.setTimeout(() => {
        if (document.visibilityState === 'visible' && document.hasFocus()) sendEvent({ type: 'seen', id: session.id, completionVersion: session.completionVersion })
      }, 600)
    }
    viewed()
    window.addEventListener('focus', viewed)
    window.addEventListener('blur', viewed)
    document.addEventListener('visibilitychange', viewed)
    return () => { clearTimeout(timer); window.removeEventListener('focus', viewed); window.removeEventListener('blur', viewed); document.removeEventListener('visibilitychange', viewed) }
  }, [state.connected, session?.id, session?.unread, session?.completionVersion, history, switcher, newChat])
  useEffect(() => {
    document.title = 'Mr. Mak — 对话'
    const shortcut = (event: KeyboardEvent) => {
      if (modKey(event) && event.shiftKey && event.code === 'KeyT') { event.preventDefault(); setNewChat(true) }
      if (modKey(event) && event.shiftKey && event.code === 'KeyP') { event.preventDefault(); setSwitcher(value => !value) }
      if (event.key === 'Escape') { setSwitcher(false); setMenu(false); setNewChat(false); setHistory(false) }
      if (modKey(event) && event.shiftKey && event.code === 'KeyH') { event.preventDefault(); setHistory(value => !value) }
      if (modKey(event) && event.shiftKey && event.code === 'KeyW' && session?.id) { event.preventDefault(); api(`/sessions/${session.id}`, {}, 'DELETE').catch(reportError) }
      const openChats = orderedChats(state.sessions)
      if (event.ctrlKey && event.code === 'Tab' && openChats.length) {
        event.preventDefault()
        const index = openChats.findIndex(item => item.id === session?.id)
        selectChat(openChats[(index + (event.shiftKey ? -1 : 1) + openChats.length) % openChats.length].id)
      }
      if ((isMac ? event.metaKey : event.altKey) && /^Digit[1-9]$/.test(event.code)) {
        const target = openChats[Number(event.code.slice(5)) - 1]
        if (target) { event.preventDefault(); selectChat(target.id) }
      }
    }
    // macOS: Cmd+1…9 arrive from the native Chats menu (the web view never sees them).
    const menuSelect = (event: Event) => {
      const target = orderedChats(state.sessions)[((event as CustomEvent<{ index: number }>).detail?.index || 0) - 1]
      if (target) selectChat(target.id)
    }
    window.addEventListener('keydown', shortcut)
    window.addEventListener('mrmak-select-chat', menuSelect)
    return () => { window.removeEventListener('keydown', shortcut); window.removeEventListener('mrmak-select-chat', menuSelect) }
  }, [state.sessions, session?.id])
  const changeFont = (delta: number) => { const value = Math.max(10, Math.min(24, fontSize + delta)); setFontSize(value); api('/settings', { terminalFontSize: value }).catch(reportError) }
  async function rename(event: React.FormEvent) { event.preventDefault(); if (!session) return; try { await api(`/sessions/${session.id}`, { name: title }, 'PATCH'); setRenaming(false) } catch (error) { reportError(error) } }

  return <div className="chats-surface">
    <header className="chats-header"><div className="chats-brand"><Nose size={25} tone="black" /><span>Mr. Mak <b>对话</b></span></div><div className="chats-header-actions"><MobileAccess /><button className={`desk-icon ${pinned ? 'active' : ''}`} title="将对话窗口置于其他窗口之上" onClick={() => { setPinned(!pinned); windowAction('chats', 'pin', !pinned) }}><Icon name="pin" size={16} /></button><button className="desk-icon" title="显示工作区" onClick={() => windowAction('workspace')}><Icon name="workspace" size={18} /></button></div></header>
    <div className="chat-tabs-row"><ChatTabs items={active} selectedId={session?.id} agents={state.agents} choose={choose} close={closeChat} /><div className="chat-tab-actions"><button className="desk-icon new-chat-button" onClick={() => setNewChat(true)} title={`新建对话 · ${shortcutLabel('Shift+T')}`} aria-label="新建对话"><Icon name="plus" /></button><button className={`desk-icon ${switcher ? 'active' : ''}`} onClick={() => { setSwitcher(value => !value); setHistory(false) }} title={`查找对话 · ${shortcutLabel('Shift+P')}`} aria-label="查找对话"><Icon name="search" size={16} /></button><button className={`history-button ${history ? 'active' : ''}`} onClick={() => { setHistory(value => !value); setSwitcher(false); setMenu(false) }} title={`历史 · ${shortcutLabel('Shift+H')}`}><Icon name="history" size={15} /><span>历史</span></button></div></div>
    <div className="chat-body">
    {history && <History close={() => setHistory(false)} choose={choose} />}
    {switcher && <div className="chat-switcher"><div className="switcher-search"><Icon name="search" size={16} /><input autoFocus placeholder="查找任意对话…" value={query} onChange={event => setQuery(event.target.value)} /></div><div className="switcher-list">{filtered.map(item => <button key={item.id} onClick={() => choose(item.id)} className={session?.id === item.id ? 'selected' : ''}><span className="agent-letter" style={{ color: state.agents.find(a => a.id === item.agent)?.color }}><SessionLogo session={item} size={19} /></span><span><strong>{item.name}</strong><small>{item.cwd}</small></span><span className="switcher-state">{chatActivityLabel(item)}</span></button>)}{!filtered.length && <p className="desk-muted">没有匹配的对话。</p>}</div></div>}
    {session ? <>
      <div className="chat-context"><span className="agent-label" style={{ color: agent?.color }}>{agent?.label}</span><span className="chat-folder" title={session.cwd}>{session.cwd.split(/[\\/]/).filter(Boolean).slice(-1)[0]}</span><button className="desk-icon" title={`附加文件路径 · 拖入文件或文件夹 · ${modLabel}V 粘贴截图`} aria-label="附加文件" onClick={() => window.dispatchEvent(new Event('mrmak-attach-file'))}><Icon name="attach" size={16} /></button><DictationComposer key={`dictation-${session.id}`} id={session.id} connected={state.connected} running={session.status === 'running'} /><button className="desk-icon" title="对话选项" onClick={() => setMenu(!menu)}><Icon name="more" size={18} /></button></div>
      {menu && <div className="chat-options">{renaming ? <form className="inline-rename" onSubmit={rename}><input autoFocus value={title} onChange={event => setTitle(event.target.value)} aria-label="对话名称（英文）" /><button type="submit">保存</button></form> : <button onClick={() => { setTitle(session.name); setRenaming(true) }}>重命名对话</button>}<button onClick={() => api(`/sessions/${session.id}`, { pinned: !session.pinned }, 'PATCH').catch(reportError)}>{session.pinned ? '在历史中取消置顶' : '在历史中置顶'}</button><button onClick={() => api('/reveal', { path: session.cwd }).catch(reportError)}>显示工作文件夹</button><button onClick={() => api(`/sessions/${session.id}/clear`, {}).then(() => setMenu(false)).catch(reportError)} title="清除可见的滚动记录，保留代理对话">清除终端滚动记录</button><div className="chat-color-setting"><span>标签页颜色</span><div role="group" aria-label="标签页颜色"><button className={`tab-color-swatch no-color ${!session.tabColor ? 'selected' : ''}`} aria-label="无标签页颜色" aria-pressed={!session.tabColor} onClick={() => api(`/sessions/${session.id}`, { tabColor: null }, 'PATCH').catch(reportError)} title="无颜色" />{tabColors.map(color => <button key={color.value} className={`tab-color-swatch ${session.tabColor === color.value ? 'selected' : ''}`} style={{ '--swatch': color.value } as React.CSSProperties} aria-label={`${color.name}标签页颜色`} aria-pressed={session.tabColor === color.value} title={color.name} onClick={() => api(`/sessions/${session.id}`, { tabColor: color.value }, 'PATCH').catch(reportError)} />)}</div></div><div className="terminal-appearance-setting"><span>终端外观 <small>所有对话</small></span><div role="group" aria-label="终端外观">{[['original', '原始 CLI 配色'], ['focus', 'Mr. Mak 专注']].map(([value, label]) => <button key={value} aria-pressed={(state.settings.terminalAppearance || 'original') === value} onClick={() => api('/settings', { terminalAppearance: value }).catch(reportError)}>{label}</button>)}</div><p><i className="legend-user" />你 <i className="legend-agent" />代理 <i className="legend-detail" />细节</p></div><div className="font-control"><span>终端字号</span><button onClick={() => changeFont(-1)}>−</button><span>{fontSize}</span><button onClick={() => changeFont(1)}>+</button></div><button onClick={() => { closeChat(session.id); setMenu(false) }}>关闭标签页 · 保留在历史中</button></div>}
      <TerminalPane key={session.id} id={session.id} agent={session.agent} fontSize={fontSize} appearance={state.settings.terminalAppearance || 'original'} onAttachmentStatus={attachmentStatus} />
      {!running && <div className="terminal-reconnect"><span>{session.restoreError || '正在重新连接对话…'}</span><button onClick={() => api(`/sessions/${session.id}/resume`, {}).catch(reportError)}>重新连接</button></div>}
      <footer className="chat-status">{attachmentNotice.id === session.id && attachmentNotice.text ? <span className="attachment-status" role="status"><Icon name="attach" size={12} /><span>{attachmentNotice.text}</span></span> : <><span><i className={state.connected ? 'connected-dot' : 'disconnected-dot'} />{state.connected ? running ? '已连接 · 自动保存' : '正在重新连接…' : '正在重新连接…'}</span><span title={session.effort ? '推理强度 · 终端权限' : undefined}>{session.effort && `推理强度 ${effortLabels[session.effort]} · `}{session.agent === 'shell' ? (isMac ? 'macOS' : isWindows ? 'Windows' : '本地') : session.bypass ? '跳过权限确认' : 'CLI 权限'}</span><span className="status-shortcut">{modLabel}V · 图片</span></>}</footer>
    </> : <div className="chats-empty"><div className="empty-orbit"><Nose size={64} tone="black" /></div><span className="desk-eyebrow">思考的空间</span><h1>你的代理，<br />触手可及。</h1><p>每个任务一个对话。<br />把这个窗口放在<br />你正在做的事旁边。</p><button className="desk-primary" onClick={() => setNewChat(true)}><Icon name="plus" size={17} />打开第一个对话</button><div className="empty-agent-names"><span>Claude</span><span>Codex</span><span>OpenCode</span><span>Kimi</span></div><small>你的 CLI 账号，你的本地文件。</small></div>}
    </div>
    {newChat && <NewChat close={() => setNewChat(false)} />}
  </div>
}
