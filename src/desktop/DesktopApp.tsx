import { lazy, Suspense, useEffect } from 'react'
import App from '../App'
import { dismissError, sendEvent, startDesktop, surface, useDesktop } from './client'
import FilesRail, { FilePreview } from './FilesRail'
import VoiceDock from './VoiceDock'
import { Icon, Nose } from './Icons'
import './desktop.css'

const Chats = lazy(() => import('./Chats'))

export default function DesktopApp() {
  const state = useDesktop()
  useEffect(() => { startDesktop() }, [])
  useEffect(() => {
    if (surface !== 'workspace') return
    const route = () => sendEvent({ type: 'workspace-route', route: location.hash })
    window.addEventListener('hashchange', route)
    return () => window.removeEventListener('hashchange', route)
  }, [])
  if (!state.ready) return <div className="desktop-boot"><Nose size={70} /><h1>Mr. Mak</h1><p>{state.error || '正在打开工作区…'}</p>{state.error && <button className="desk-secondary" onClick={() => startDesktop()}>重新连接</button>}</div>
  return <div className={`desktop-root ${surface}-root`}>
    {surface === 'chats' ? <Suspense fallback={<div className="desktop-boot"><Nose size={50} /></div>}><Chats /></Suspense> : <><div className="workspace-surface"><App />{state.preview && <FilePreview file={state.preview} />}</div><FilesRail /></>}
    {state.error && <div className="desktop-error" role="alert"><span>{state.error}</span><button onClick={dismissError} aria-label="关闭错误提示"><Icon name="close" size={16} /></button></div>}
    {!state.connected && <div className="desktop-offline">正在重新连接本地服务…</div>}
    <VoiceDock />
  </div>
}
