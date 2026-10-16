import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { api, clientId, onServiceEvent, reportError, surface, useDesktop } from './client'
import { liveVoice } from './live'
import { Icon, Nose } from './Icons'
import MakComposer from './MakComposer'
import MakImages from './MakImages'
import type { Operation } from './types'

export default function VoiceDock() {
  const state = useDesktop()
  const live = useSyncExternalStore(liveVoice.subscribe, liveVoice.snapshot)
  const [panel, setPanel] = useState(false)
  const [tab, setTab] = useState<'conversation' | 'activity'>('conversation')
  const [sending, setSending] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const active = ['live', 'connecting', 'closing'].includes(live.status)
  const otherVoice = state.voice.owner && state.voice.owner.clientId !== clientId
  useEffect(() => onServiceEvent(event => {
    if (event.type === 'disconnected') liveVoice.disconnect()
    if (event.type === 'notice' && event.notice) liveVoice.announce(`Verified terminal event: ${event.notice.text}. This does not by itself confirm that the project task succeeded.`)
    if (['session', 'navigate', 'connected'].includes(event.type)) liveVoice.context()
  }), [])
  useEffect(() => { if (panel) bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [live.captions, state.operations, panel])
  const toggle = () => { if (active) liveVoice.stop(); else { setPanel(true); liveVoice.start() } }
  async function send(text: string, images: string[]) {
    setSending(true)
    try {
      const result = await api<Operation>('/coordinator', { id: crypto.randomUUID(), text, images, selectedId: state.selectedId })
      if (result.status !== 'completed') throw new Error(result.result || 'Mr. Mak 无法完成此请求。')
    } finally { setSending(false) }
  }
  return <div className={`voice-dock ${surface} ${active ? 'is-live' : ''} ${panel ? 'panel-open' : ''}`}>
    <section className="voice-panel" hidden={!panel} style={{ display: panel ? undefined : 'none' }} aria-label="Mr. Mak 对话"><header><span><Nose size={24} /><strong>Mr. Mak</strong><small>{live.status === 'live' ? '正在聆听' : live.status === 'connecting' ? '正在连接…' : live.status === 'closing' ? '正在结束…' : state.coordinator === 'working' ? '工作中…' : '随时为你效劳'}</small></span><button className="desk-icon" title="隐藏对话 · 语音保持当前状态" onClick={() => setPanel(false)}><Icon name="close" size={16} /></button></header><div className="voice-tabs"><button className={tab === 'conversation' ? 'selected' : ''} onClick={() => setTab('conversation')}>对话</button><button className={tab === 'activity' ? 'selected' : ''} onClick={() => setTab('activity')}>动态{state.notices.length > 0 && <span>{state.notices.length}</span>}</button></div><div className="voice-settings"><label>Codex<select aria-label="协调器推理强度" value={state.settings.coordinatorEffort || 'medium'} onChange={event => api('/settings', { coordinatorEffort: event.target.value }).catch(reportError)}><option value="medium">中</option><option value="high">高</option></select></label><span>Codex 订阅</span></div><div className="voice-messages" aria-live="polite">
      {tab === 'conversation' ? <>{live.captions.length === 0 && state.operations.length === 0 && <div className="voice-welcome"><p>一个对话，<br />调度你所有的代理。</p><span>“打开 Dream Game 对话。”<br />“让 Claude 检查一下动画。”</span></div>}{state.operations.slice(-15).map(operation => <div key={operation.id} className="mak-exchange"><p className="caption user"><span>你</span>{operation.text}</p>{!!operation.images?.length && <MakImages paths={operation.images} />}<p className={`caption assistant ${operation.status !== 'completed' ? 'failed' : ''}`}><span>Mr. Mak</span>{operation.result || '工作中…'}</p></div>)}{!live.captions.length && state.voiceHistory.length > 0 && <details className="previous-voice"><summary>上一次语音对话</summary>{state.voiceHistory[state.voiceHistory.length - 1].captions.map((caption, index) => <p key={index} className={`caption ${caption.role}`}><span>{caption.role === 'user' ? '你' : 'Mr. Mak'}</span>{caption.text}</p>)}</details>}{live.captions.map((caption, index) => <p key={`${caption.start}-${index}`} className={`caption ${caption.role}`}><span>{caption.role === 'user' ? '你' : 'Mr. Mak'}</span>{caption.text}</p>)}{(sending || state.coordinator === 'working') && <p className="voice-working"><i /><i /><i />正在检查工作区</p>}<div ref={bottom} /></> : <>{state.notices.length === 0 && <p className="desk-muted">终端的待处理请求和退出事件会显示在这里。</p>}{[...state.notices].reverse().map(notice => <button className="activity-item" key={notice.id} onClick={() => api(`/sessions/${notice.sessionId}/focus`, {}).catch(reportError)}><Icon name="bell" size={16} /><span><strong>{notice.name}</strong><small>{notice.text}</small></span><time>{new Date(notice.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></button>)}</>}
    </div>{live.error && <div className="voice-error" role="alert"><span>{live.error}</span><button className="desk-icon" aria-label="关闭语音错误提示" onClick={() => liveVoice.dismissError()}><Icon name="close" size={14} /></button></div>}{!live.audible && <button className="desk-secondary" onClick={() => liveVoice.enablePlayback()}>启用扬声器声音</button>}{otherVoice && <div className="voice-hint">语音正在{state.voice.owner?.surface === 'chats' ? '对话' : '工作区'}窗口中使用，请在该窗口中停止。</div>}<MakComposer connected={state.connected} sending={sending} onSend={send} /></section>
    <div className="voice-controls"><button className="voice-nose" title={active ? '停止语音对话' : '和 Mr. Mak 对话'} aria-label={active ? '停止语音' : '开始语音'} aria-pressed={active} onClick={toggle} disabled={!!otherVoice || !state.connected || live.status === 'closing'}><Nose size={35} /><span>{live.status === 'live' ? '正在聆听' : live.status === 'connecting' ? '正在连接' : live.status === 'closing' ? '正在结束' : '和 Mak 对话'}</span>{live.status === 'live' && <div className="voice-wave"><i /><i /><i /><i /></div>}</button><button className={`voice-caption-toggle ${panel ? 'selected' : ''}`} title={panel ? '隐藏对话' : '对话和动态'} onClick={() => setPanel(value => !value)} aria-label="切换对话面板"><Icon name="chats" size={17} />{state.notices.some(notice => state.sessions.find(item => item.id === notice.sessionId)?.attention) && <i />}</button></div>
  </div>
}
