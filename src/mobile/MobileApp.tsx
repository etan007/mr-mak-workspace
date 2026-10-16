import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AgentLogo, Icon, Nose } from '../desktop/Icons'
import type { ChatSession } from '../desktop/types'
import { chatActivityLabel } from '../desktop/chatActivity'
import { chooseMobileDictation, disconnectMobile, mobileApi, mobileEvent, reconnectMobile, onMobileEvent, selectMobileChat, startMobile, useMobile } from './client'
import { mobileChatPosition, saveMobileChatPosition, setMobileHistory, setMobileView, useMobileNavigation } from './app-state'
import Terminal from './Terminal'
import Composer from './Composer'
import ConversationImages from './ConversationImages'
import { spokenText, useReadAloud } from './useReadAloud'
import ReadingVoiceSettings from './ReadingVoiceSettings'
import DictationSettings from '../components/DictationSettings'
import Results from './Results'
import ActivityStatus from './ActivityStatus'
import { useInstall } from './useInstall'
import { visibleUserMessage } from './workspace-context'
import './mobile.css'

interface Pending { id: string; claim: string; code: string }
const toolStatus = { running: '运行中', completed: '已完成', failed: '失败' } as const
interface ToolActivity { id: string; name: string; status: 'running' | 'completed' | 'failed'; at: string }
interface Message { id: string; role: 'user' | 'assistant'; text: string; at: string; images?: { url?: string; name: string; unavailable?: boolean; kind?: 'image' | 'video'; type?: string }[] }
function getPairToken() {
  const token = new URLSearchParams(location.hash.slice(1)).get('pair')
  if (token) { sessionStorage.setItem('mrmak.mobile.pair', token); history.replaceState(null, '', location.pathname) }
  return sessionStorage.getItem('mrmak.mobile.pair') || ''
}
function Connect() {
  const state = useMobile()
  const [pairToken, setPairToken] = useState(getPairToken)
  const [name, setName] = useState('我的手机'), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [pending, setPending] = useState<Pending | null>(() => { try { return JSON.parse(sessionStorage.getItem('mrmak.mobile.pending') || 'null') } catch { return null } })
  useEffect(() => {
    if (!pending) return
    let stopped = false, working = false
    const poll = async () => {
      if (working || document.visibilityState === 'hidden') return
      working = true
      try {
        const result = await mobileApi<{ status: string }>('/pair/finish', pending)
        if (stopped) return
        if (result.status === 'connected') { sessionStorage.removeItem('mrmak.mobile.pending'); sessionStorage.removeItem('mrmak.mobile.pair'); setPairToken(''); setPending(null); void startMobile() }
      } catch (err) { if (!stopped) setError(err instanceof Error ? err.message : String(err)) }
      finally { working = false }
    }
    void poll(); const timer = window.setInterval(poll, 2500)
    return () => { stopped = true; clearInterval(timer) }
  }, [pending])
  async function connect(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { const result = await mobileApi<Pending>('/pair', { token: pairToken || code.replace(/\s/g, ''), name }); sessionStorage.setItem('mrmak.mobile.pending', JSON.stringify(result)); setPending(result) }
    catch (err) { setError(err instanceof Error ? err.message : String(err)) }
    finally { setBusy(false) }
  }
  return <main className="mobile-connect"><Nose size={64} /><span className="mobile-eyebrow">你的代理，触手可及</span><h1>Mr. Mak<br /><span>装进你的手机。</span></h1>
    {pending ? <div className="mobile-connect-card"><Icon name="phone" size={28} /><h2>在电脑上确认</h2><p>在 Mr. Mak 对话窗口中点击手机按钮，核对此代码，然后选择“连接手机”。</p><code className="mobile-pair-code">{pending.code}</code><span className="mobile-waiting">等待确认…</span><button onClick={() => { sessionStorage.removeItem('mrmak.mobile.pending'); setPending(null); setError('请在对话窗口中扫描新的二维码。') }}>取消</button></div>
    : pairToken ? <form className="mobile-connect-card" onSubmit={connect}><h2>连接这部手机</h2><p>你的代理和文件仍保留在电脑上。</p><label>设备名称<input autoComplete="off" maxLength={60} value={name} onChange={event => setName(event.target.value)} /></label><button className="mobile-primary" disabled={busy}>{busy ? '正在连接…' : '请求连接'}<Icon name="arrow" size={17} /></button></form>
    : <form className="mobile-connect-card" onSubmit={connect}><h2>从 Mr. Mak 对话开始</h2><p>在电脑上点击手机图标，扫描二维码或在下方输入连接代码。两台设备都需保持 Tailscale 连接。</p><label>连接代码<input inputMode="numeric" autoComplete="off" maxLength={8} value={code} onChange={event => setCode(event.target.value.replace(/[^0-9]/g, ''))} placeholder="8 位数字" /></label><button className="mobile-primary" disabled={busy || code.length !== 8}>请求连接<Icon name="arrow" size={17} /></button><button type="button" onClick={() => void startMobile()}>检查现有连接</button></form>}
    {(error || state.error) && <p className="mobile-error" role="alert">{error || state.error}</p>}<p className="mobile-connect-foot">你的对话，你的电脑。<br />多一点活动空间。</p>
  </main>
}

function Conversation({ session, active }: { session: ChatSession; active: boolean }) {
  const speech = useReadAloud(session.id), stopReading = speech.stop
  const [mode, setMode] = useState<'messages' | 'terminal'>(() => mobileChatPosition(session.id).mode || (['codex', 'claude'].includes(session.agent) ? 'messages' : 'terminal'))
  useEffect(() => saveMobileChatPosition(session.id, { mode }), [session.id, mode])
  useEffect(() => { if (mode === 'terminal' || !active) stopReading() }, [mode, active, stopReading])
  const [messages, setMessages] = useState<Message[]>([]), [supported, setSupported] = useState(true), [error, setError] = useState('')
  let readStart = 0
  for (let index = 0; index < messages.length; index++) if (messages[index].role === 'user') readStart = index
  const readEnd = messages.length - 1, latestUserId = messages[readStart]?.role === 'user' ? messages[readStart].id : null
  useEffect(() => () => stopReading(), [latestUserId, stopReading])
  const [initialPosition] = useState(() => mobileChatPosition(session.id))
  const scroller = useRef<HTMLDivElement>(null), restored = useRef(false), follow = useRef(initialPosition.follow !== false), state = useMobile()
  const [activity, setActivity] = useState<ToolActivity[]>([])
  const reloadConversation = useRef<(() => Promise<void>) | null>(null)
  const [showJump, setShowJump] = useState(false)
  function jumpToLatest() { follow.current = true; setShowJump(false); const box = scroller.current; if (box) box.scrollTop = box.scrollHeight }
  function showConversation() { if (mode !== 'messages') restored.current = false; setMode('messages'); void reloadConversation.current?.() }
  const modeGesture = useRef<{ x: number; y: number; id: number } | null>(null), suppressModeClick = useRef(false)
  const [checkedAt, setCheckedAt] = useState(0), [changedAt, setChangedAt] = useState(() => Date.now()), [readError, setReadError] = useState(''), [now, setNow] = useState(() => Date.now())
  const transcriptFingerprint = useRef('')
  useEffect(() => {
    if (!active) return
    let stopped = false, working = false
    const load = async () => {
      if (working || document.visibilityState === 'hidden') return
      working = true
      try {
        const result = await mobileApi<{ messages: Message[]; supported: boolean; activity?: ToolActivity[] }>(`/sessions/${session.id}/messages`)
        if (!stopped) {
          const at = Date.now(), fingerprint = JSON.stringify(result.messages)
          if (fingerprint !== transcriptFingerprint.current) { transcriptFingerprint.current = fingerprint; setChangedAt(at) }
          setMessages(result.messages); setActivity(result.activity || []); setSupported(result.supported); setCheckedAt(at); setNow(at); setReadError('')
        }
      } catch { if (!stopped) { setReadError('对话刷新失败，仍显示之前的消息。'); setNow(Date.now()) } }
      finally { working = false }
    }
    reloadConversation.current = load
    void load(); const timer = window.setInterval(load, 2200)
    const seen = () => { mobileEvent({ type: 'subscribe', id: session.id }); if (document.visibilityState === 'visible') mobileEvent({ type: 'seen', id: session.id, completionVersion: session.completionVersion }) }
    seen(); const visible = () => { if (document.visibilityState === 'visible') { seen(); void load() } }
    document.addEventListener('visibilitychange', visible)
    const off = onMobileEvent(event => { if (event.type === 'connected') { seen(); void load() } else if (event.type === 'transcript-changed' && event.id === session.id) void load() })
    return () => { stopped = true; reloadConversation.current = null; clearInterval(timer); off(); document.removeEventListener('visibilitychange', visible) }
  }, [session.id, session.completionVersion, active])
  useLayoutEffect(() => {
    const box = scroller.current
    if (!active || mode !== 'messages' || !box || !messages.length) return
    if (!restored.current) {
      const saved = mobileChatPosition(session.id); follow.current = saved.follow !== false
      box.scrollTop = follow.current ? box.scrollHeight : saved.top || 0; restored.current = true
      requestAnimationFrame(() => { if (scroller.current === box) { const nearEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 100; follow.current = nearEnd; setShowJump(!nearEnd) } })
    }
    else if (follow.current) box.scrollTop = box.scrollHeight
  }, [messages, mode, active, session.id])
  const running = session.status === 'running'
  return <>
    <div className="mobile-chat-tools"><div className="mobile-segment" role="group" aria-label="对话视图"
      onPointerDown={event => { suppressModeClick.current = false; modeGesture.current = event.isPrimary ? { x: event.clientX, y: event.clientY, id: event.pointerId } : null }}
      onPointerCancel={() => { modeGesture.current = null }}
      onPointerUp={event => {
        const start = modeGesture.current; modeGesture.current = null
        if (!start || start.id !== event.pointerId) return
        const dx = event.clientX - start.x, dy = event.clientY - start.y
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return
        suppressModeClick.current = true
        if (dx < 0) setMode('terminal'); else showConversation()
      }}
      onClickCapture={event => { if (suppressModeClick.current) { event.preventDefault(); event.stopPropagation(); suppressModeClick.current = false } }}
    ><button className={mode === 'messages' ? 'active' : ''} onClick={showConversation}>消息</button><button className={mode === 'terminal' ? 'active' : ''} onClick={() => { speech.stop(); setMode('terminal') }}>终端</button></div><ActivityStatus session={session} connected={state.connected} /></div>
    {mode === 'terminal' ? <Terminal id={session.id} /> : <div className="mobile-message-pane"><div className="mobile-messages" ref={scroller} onScroll={() => { const box = scroller.current; if (box) { const nearEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 100; if (!restored.current) return; follow.current = nearEnd; saveMobileChatPosition(session.id, { top: box.scrollTop, follow: nearEnd }); setShowJump(!nearEnd) } }}>
      <div className="mobile-history-note">{checkedAt ? `记录检查于 ${new Date(checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '正在加载对话…'}{messages[messages.length - 1]?.at && ` · 最后一条消息 ${new Date(messages[messages.length - 1].at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</div>
      {(readError || (session.activity === 'working' && now - changedAt >= 45000)) && <div className="mobile-transcript-status" role="status"><p>{readError || '对话近期没有更新，终端中可能有更新的输出。'}</p><button onClick={() => { speech.stop(); setMode('terminal') }}>打开终端<Icon name="arrow" size={15} /></button></div>}
      {messages.map((message, index) => <article className={`mobile-message ${message.role}`} key={message.id}><header>{message.role === 'user' ? '你' : <><AgentLogo agent={session.agent} size={15} />{session.agent === 'claude' ? 'Claude' : 'Codex'}</>}{message.at && <time>{new Date(message.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>}</header><div className="mobile-message-copy"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: () => null, a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a> }}>{message.role === 'user' ? visibleUserMessage(message.text) : message.text}</ReactMarkdown></div><ConversationImages images={message.images} />{index === readEnd && message.role === 'assistant' && messages.slice(readStart).some(item => item.text.trim()) && <div className="mobile-read-aloud"><button type="button" disabled={!speech.supported} aria-label={speech.activeId ? speech.paused ? '继续朗读' : '暂停朗读' : '朗读'} title={!speech.supported ? '此浏览器不支持朗读' : speech.activeId ? speech.paused ? '继续朗读' : '暂停朗读' : '从你的上一条消息朗读到此回复'} onClick={() => { if (speech.activeId) speech.togglePause(); else speech.read(message.id, Array.from(scroller.current?.querySelectorAll<HTMLElement>('.mobile-message-copy') || []).slice(readStart, readEnd + 1).map(spokenText).filter(Boolean).join('\n\n')) }}><Icon name={speech.activeId ? speech.paused ? 'play' : 'pause' : 'speaker'} size={19} /></button>{speech.activeId && <button type="button" aria-label="停止朗读" title="停止朗读" onClick={speech.stop}><Icon name="stop" size={17} /></button>}</div>}</article>)}
      {!messages.length && <div className="mobile-chat-empty"><Icon name="chats" size={30} /><h2>{supported ? '准备好接收你的下一个想法' : '此对话在终端中进行'}</h2><p>{supported ? '代理写入对话记录后，消息会显示在这里。' : '打开实时终端以阅读对话或回应 CLI 提示。'}</p><button onClick={() => { speech.stop(); setMode('terminal') }}>打开终端<Icon name="arrow" size={15} /></button></div>}
      {!!activity.length && <details className="mobile-tool-activity" aria-label="最近的工具活动"><summary>最近活动</summary>{activity.map(item => <div key={item.id}><Icon name={item.status === 'running' ? 'terminal' : item.status === 'failed' ? 'bell' : 'history'} size={14} /><span>{item.name}</span><small>{item.status === 'running' && !running ? '已中断' : toolStatus[item.status]}{item.at && ` · ${new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</small></div>)}</details>}
      {session.activity === 'working' && <p className="mobile-agent-working"><i />代理正在电脑上工作…</p>}
    </div>{showJump && <button className="mobile-jump-latest" onClick={jumpToLatest}><Icon name="down" size={16} />跳到最新</button>}</div>}
    {!running && <div className="mobile-resume"><span>此对话已保存。</span><button disabled={!state.connected} onClick={async () => { try { await mobileApi(`/sessions/${session.id}/resume`, {}); setError('') } catch (err) { setError(err instanceof Error ? err.message : String(err)) } }}>恢复对话</button></div>}
    {speech.error && <p className="mobile-error" role="alert">{speech.error}</p>}
    {error && <p className="mobile-error" role="alert">{error}</p>}
    <Composer key={session.id} id={session.id} connected={state.connected} running={running} active={active} />
  </>
}

function NewChat({ close, opened }: { close: () => void; opened: (id: string) => void }) {
  const state = useMobile(), available = state.agents.filter(item => item.available)
  const [agent, setAgent] = useState(available.some(item => item.id === state.defaultAgent) ? state.defaultAgent! : available[0]?.id || '')
  const [name, setName] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { const session = await mobileApi<ChatSession>('/sessions', { agent, name }); await startMobile(); opened(session.id); close() }
    catch (err) { setError(err instanceof Error ? err.message : String(err)) }
    finally { setBusy(false) }
  }
  return <div className="mobile-modal-backdrop"><form className="mobile-modal" onSubmit={create}><header><h2>新建对话</h2><button type="button" className="mobile-icon" aria-label="关闭新建对话" onClick={close}><Icon name="close" /></button></header><label>代理<select value={agent} onChange={event => setAgent(event.target.value)}>{available.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>对话名称 · 仅限英文<input value={name} onChange={event => setName(event.target.value)} maxLength={100} required placeholder="例如 Video ideas" /></label><p>在电脑上的此工作区文件夹中启动。{state.defaultBypass ? '桌面端默认设置为跳过权限确认。' : '使用桌面端的默认权限。'}</p>{error && <p className="mobile-error" role="alert">{error}</p>}<button className="mobile-primary" disabled={busy || !agent || !state.connected}>{busy ? '正在打开…' : '打开对话'}<Icon name="plus" size={17} /></button></form></div>
}

export default function MobileApp() {
  const installation = useInstall()
  const [resultsHeader, setResultsHeader] = useState<HTMLDivElement | null>(null)
  const { view, history } = useMobileNavigation()
  const state = useMobile(), [query, setQuery] = useState(''), [creating, setCreating] = useState(false), [settings, setSettings] = useState(false)
  const [closing, setClosing] = useState(false), [closeError, setCloseError] = useState('')
  const [refreshing, setRefreshing] = useState(false), refreshTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(refreshTimer.current), [])
  function refreshPage() {
    if (refreshTimer.current !== undefined) return
    setRefreshing(true)
    void reconnectMobile()
    refreshTimer.current = window.setTimeout(() => { setRefreshing(false); refreshTimer.current = undefined }, 500)
  }
  useEffect(() => {
    document.title = 'Mr. Mak 手机版'; document.documentElement.dataset.makTheme = 'dark'
    const manifest = document.createElement('link'); manifest.rel = 'manifest'; manifest.href = '/mobile/manifest.webmanifest'; document.head.append(manifest)
    const icon = document.createElement('link'); icon.rel = 'apple-touch-icon'; icon.href = '/assets/mak-mobile-192.png'; document.head.append(icon)
    const theme = document.createElement('meta'); theme.name = 'theme-color'; theme.content = '#0d0e12'; document.head.append(theme)
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]'), previousViewport = viewport?.content
    if (viewport) viewport.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content'
    // Keep the composer above iOS/Android keyboards without changing desktop geometry.
    const resize = () => document.documentElement.style.setProperty('--mobile-height', `${window.visualViewport?.height || innerHeight}px`)
    resize(); window.visualViewport?.addEventListener('resize', resize); window.addEventListener('resize', resize)
    void startMobile()
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/mobile/sw.js', { scope: '/mobile/' }).catch(() => {})
    return () => { manifest.remove(); icon.remove(); theme.remove(); if (viewport && previousViewport) viewport.content = previousViewport; window.visualViewport?.removeEventListener('resize', resize); window.removeEventListener('resize', resize); document.documentElement.style.removeProperty('--mobile-height') }
  }, [])
  const session = state.sessions.find(item => item.id === state.selectedId)
  useEffect(() => { if (state.ready && state.authenticated && view === 'chat' && !session) setMobileView('list') }, [state.ready, state.authenticated, view, session])
  function open(id: string) { selectMobileChat(id); setCloseError(''); setMobileView('chat') }
  async function closeChat() {
    if (!session || closing || !state.connected) return
    if (!window.confirm(`关闭“${session.name}”？这会关闭桌面端的标签页并停止其 CLI。对话仍保留在历史中。`)) return
    setClosing(true); setCloseError('')
    try { await mobileApi(`/sessions/${session.id}/close`, {}); setMobileView('list') }
    catch (err) { setCloseError(err instanceof Error ? err.message : String(err)) }
    finally { setClosing(false) }
  }
  if (!state.ready) return <div className="mobile-app mobile-loading"><Nose size={52} /><p>正在连接 Mr. Mak…</p></div>
  if (!state.authenticated) return <div className="mobile-app"><Connect /></div>
  const items = [...state.sessions].filter(item => (history || item.open) && `${item.name} ${item.agent}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned) || (history ? b.updatedAt.localeCompare(a.updatedAt) : a.tabOrder - b.tabOrder))
  const title = view === 'chat' && session ? session.name : view === 'results' ? '工作区' : history ? '历史' : '对话'
  return <div className="mobile-app"><header className={`mobile-header ${view === 'chat' ? 'mobile-header-chat' : ''}`}>
    {view === 'chat' && <button className="mobile-icon" aria-label="返回对话列表" onClick={() => setMobileView('list')}><Icon name="back" /></button>}
    <button className={`mobile-nose-refresh ${refreshing ? 'refreshing' : ''}`} aria-label="重新连接" title="不离开此页面重新连接" onClick={refreshPage} disabled={refreshing}><span className={`mobile-connection-logo ${state.connected ? 'online' : ''}`} role="status" aria-label={state.connected ? '已连接到你的电脑' : '正在重新连接 · 代理仍在工作'} title={state.connected ? '已连接到你的电脑' : '正在重新连接 · 代理仍在工作'}><Nose size={26} /></span></button>
    <div className="mobile-header-title" ref={setResultsHeader} id={view === 'results' ? 'mobile-results-header' : undefined}>{view !== 'results' && <h1>{title}</h1>}{view === 'list' && <span className="mobile-header-count" aria-label={`${items.length} 个对话`}>· {items.length}</span>}</div>
    {view === 'chat' && session?.open && <button className="mobile-icon" aria-label="关闭对话" title="关闭对话" disabled={!state.connected || closing} onClick={() => void closeChat()}><Icon name="trash" size={19} /></button>}
    <nav className="mobile-main-nav" aria-label="手机版分区">
      {view === 'list' && <><button className="mobile-icon" aria-label="新建对话" title="新建对话" onClick={() => setCreating(true)} disabled={!state.connected}><Icon name="plus" size={19} /></button><button className={`mobile-icon ${history ? 'active' : ''}`} aria-label="历史" title={history ? '显示进行中的对话' : '对话历史'} aria-pressed={history} onClick={() => setMobileHistory(!history)}><Icon name="history" size={19} /></button></>}
      <button className={`mobile-icon ${view === 'chat' || (view === 'list' && !history) ? 'active' : ''}`} aria-label="对话" title="对话" aria-current={view === 'chat' || (view === 'list' && !history) ? 'page' : undefined} onClick={() => { setMobileHistory(false); setMobileView(session ? 'chat' : 'list') }}><Icon name="chats" size={19} /></button>
      <button className={`mobile-icon ${view === 'results' ? 'active' : ''}`} aria-label="成果" title="工作区" aria-current={view === 'results' ? 'page' : undefined} onClick={() => setMobileView('results')}><Icon name="workspace" size={19} /></button>
    </nav>
    <button className="mobile-icon" aria-label="手机设置" title="手机设置" onClick={() => setSettings(!settings)}><Icon name="phone" size={19} /></button>
  </header>
    {installation.available && !installation.dismissed && <aside className="mobile-install" aria-label="安装 Mr. Mak"><div><strong>把 Mr. Mak 留在手机上</strong><p>把鼻子图标添加到主屏幕，像应用一样打开。</p></div><button onClick={() => void installation.install()} disabled={installation.busy}>安装</button><button className="mobile-icon" aria-label="以后再说" title="以后再说" onClick={installation.dismiss}><Icon name="close" size={17} /></button></aside>}
    {installation.error && <p className="mobile-error" role="alert">{installation.error}</p>}
    {!state.connected && <div className="mobile-offline" role="status">{state.error || '正在重新连接… 请保持 Tailscale 连接且电脑处于唤醒状态。'}</div>}
    {closeError && <div className="mobile-error" role="alert">{closeError}<button className="mobile-icon" aria-label="关闭错误提示" onClick={() => setCloseError('')}><Icon name="close" size={15} /></button></div>}
    {settings && <div className="mobile-device-settings"><strong>{state.device?.name}</strong><p>对话在你的电脑上运行。在这里切换视图不会影响桌面端的视图。</p>{installation.installed ? <p>Mr. Mak 已安装在这部手机上。</p> : installation.available ? <button onClick={() => void installation.install()} disabled={installation.busy}>安装 Mr. Mak</button> : <p>要把 Mr. Mak 添加到主屏幕，请打开浏览器菜单并选择“安装应用”或“添加到主屏幕”。iPhone 上请使用 Safari 的“共享”菜单。</p>}<ReadingVoiceSettings /><DictationSettings info={state.dictation} onChange={chooseMobileDictation} disabled={!state.connected} /><button onClick={() => { if (window.confirm('断开这部手机与 Mr. Mak 的连接？')) void disconnectMobile() }}>断开这部手机</button></div>}
    <div className="mobile-view-host"><div className="mobile-persistent-view" aria-hidden={view !== 'results'} inert={view !== 'results'}><Results header={view === 'results' ? resultsHeader : null} active={view === 'results'} /></div>{session && <div className="mobile-persistent-view" aria-hidden={view !== 'chat'} inert={view !== 'chat'}><Conversation key={session.id} session={session} active={view === 'chat'} /></div>}{view === 'list' && <main className="mobile-chat-list"><label className="mobile-search"><Icon name="search" size={17} /><input aria-label="查找对话" placeholder="查找对话…" value={query} onChange={event => setQuery(event.target.value)} /></label><div className="mobile-chat-cards">{items.map(item => <button className={`mobile-chat-card ${item.activity === 'working' ? 'working' : ''}`} key={item.id} onClick={() => open(item.id)} style={{ '--chat-color': item.tabColor || state.agents.find(agent => agent.id === item.agent)?.color || '#d7aabd' } as React.CSSProperties}><span className="mobile-agent-icon"><AgentLogo agent={item.agent} size={24} />{item.unread && <i />}</span><span className="mobile-card-copy"><strong>{item.name}{item.pinned && <Icon name="pin" size={12} />}</strong><small>{state.agents.find(agent => agent.id === item.agent)?.label || item.agent} · {chatActivityLabel(item)}</small>{item.preview && <p>{item.preview}</p>}</span><Icon name="arrow" size={15} /></button>)}{!items.length && <p className="mobile-list-empty">{query ? '没有匹配的对话。' : '打开一个对话，给下一个想法一个落脚处。'}</p>}</div><p className="mobile-list-foot">手机上的一个想法，<br />电脑上的一项任务。</p></main>}</div>
    {creating && <NewChat close={() => setCreating(false)} opened={open} />}
  </div>
}
