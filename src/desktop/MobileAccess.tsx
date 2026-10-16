import { useEffect, useState } from 'react'
import { api, onServiceEvent, useDesktop } from './client'
import { Icon } from './Icons'
import './mobile-access.css'
import DictationSettings from '../components/DictationSettings'
import { useDictation } from './useDictation'

interface MobileState {
  enabled: boolean; origin: string; error: string
  devices: { id: string; name: string; connected: boolean; lastSeen: string | null }[]
  pending: { id: string; name: string; code: string; expires: number }[]
}
interface Pairing { url: string; code: string; expires: number; qr: string }

export default function MobileAccess() {
  const desktop = useDesktop()
  const dictation = useDictation()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<MobileState | null>(null)
  const [pairing, setPairing] = useState<Pairing | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [probe, setProbe] = useState<{ ready: boolean; message: string } | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!desktop.connected) return
    const load = () => api<MobileState>('/mobile').then(setState).catch(() => {})
    void load()
    return onServiceEvent(event => { if (event.type === 'mobile-state') void load() })
  }, [desktop.connected])
  useEffect(() => {
    if (!open) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', escape)
    return () => { clearInterval(timer); window.removeEventListener('keydown', escape) }
  }, [open])
  async function action(route: string, data = {}) {
    setBusy(true); setError('')
    try { setState(await api<MobileState>(`/mobile/${route}`, data)); if (route === 'disable' || route === 'approve') setPairing(null) }
    catch (err) { setError(err instanceof Error ? err.message : String(err)) }
    finally { setBusy(false) }
  }
  async function pair() {
    setBusy(true); setError('')
    try {
      if (!state?.enabled) setState(await api<MobileState>('/mobile/enable', {}))
      setPairing(await api<Pairing>('/mobile/pair', {})); setNow(Date.now())
    } catch (err) { setError(err instanceof Error ? err.message : String(err)) }
    finally { setBusy(false) }
  }
  const connected = state?.devices.filter(device => device.connected).length || 0
  const waiting = (state?.pending || []).filter(item => item.expires > now)
  return <>
    <button className={`desk-icon mobile-access-button ${connected || waiting.length ? 'active' : ''}`} aria-label="手机访问" title={connected ? `手机设置 · 已连接 ${connected} 部手机` : waiting.length ? '手机设置 · 批准手机连接' : '手机设置 · 连接你的手机'} onClick={() => setOpen(true)}><Icon name="phone" size={18} />{(connected > 0 || waiting.length > 0) && <i className={waiting.length ? 'pending' : ''} />}</button>
    {open && <div className="desk-scrim" onClick={() => setOpen(false)}><section className="desk-dialog mobile-access-dialog" role="dialog" aria-modal="true" aria-label="手机访问" onClick={event => event.stopPropagation()}>
      <div className="desk-dialog-heading"><div><span className="desk-eyebrow">你的对话，随身携带</span><h2>手机设置</h2></div><button className="desk-icon" aria-label="关闭手机访问" onClick={() => setOpen(false)}><Icon name="close" /></button></div>
      <p className="mobile-access-intro">代理继续在这台电脑上运行。手机以自己的视图打开同样的对话。</p>
      <div className="mobile-access-status"><span className={state?.enabled ? 'online' : ''} />{connected ? `已连接 ${connected} 部手机` : state?.enabled ? '等待手机连接' : '手机访问已关闭'}</div>
      {waiting.map(item => <div className="mobile-pair-request" key={item.id}><strong>{item.name} 请求连接</strong><p>请确认此代码与手机上显示的一致。</p><code>{item.code}</code><div><button className="desk-primary" disabled={busy} onClick={() => action('approve', { id: item.id })}>连接手机</button><button disabled={busy} onClick={() => action('revoke', { id: item.id })}>拒绝</button></div></div>)}
      {pairing && pairing.expires > now && !waiting.length && <div className="mobile-qr"><img src={pairing.qr} alt="扫码将此手机连接到 Mr. Mak" width="224" height="224" /><strong>用手机相机扫码</strong><span>或在手机应用中输入代码 <b>{pairing.code}</b></span><p>{Math.ceil((pairing.expires - now) / 60000)} 分钟后过期。扫码后请在这里确认连接。</p><button onClick={() => navigator.clipboard.writeText(pairing.url).catch(() => setError('无法复制链接，请改为扫描二维码。'))}>复制连接链接</button></div>}
      {!waiting.length && <button className="desk-primary" onClick={pair} disabled={busy || !desktop.connected}><Icon name="phone" size={17} />{busy ? '正在准备连接…' : pairing && pairing.expires <= now ? '生成新的二维码' : state?.enabled ? '连接另一部手机' : '启用并显示二维码'}</button>}
      {(error || state?.error) && <div className="desk-error-inline" role="alert">{error || state?.error}<button aria-label="关闭手机访问错误提示" onClick={() => { setError(''); setState(current => current && { ...current, error: '' }) }}><Icon name="close" size={14} /></button></div>}
      {!!state?.devices.length && <div className="mobile-device-list"><h3>你的设备</h3>{state.devices.map(device => <div key={device.id}><Icon name="phone" /><span><strong>{device.name}</strong><small>{device.connected ? '当前已连接' : device.lastSeen ? `上次连接 ${new Date(device.lastSeen).toLocaleString('zh-CN')}` : '已配对 · 等待手机'}</small></span><button disabled={busy} onClick={() => action('revoke', { id: device.id })}>断开</button></div>)}</div>}
      <details className="mobile-setup" open={!state?.enabled}><summary>首次连接</summary><ol><li>在这台电脑和手机上安装 <a href="https://tailscale.com/download" target="_blank" rel="noreferrer">Tailscale</a>。</li><li>两台设备登录同一个 Tailscale 账号，并保持连接。</li><li>在这里启用手机访问，扫描二维码，然后确认代码一致。</li><li>在手机浏览器菜单中把 Mr. Mak 添加到主屏幕。</li></ol><p>如需启用 HTTPS，请按照 <a href="https://tailscale.com/docs/features/tailscale-serve" target="_blank" rel="noreferrer">Tailscale Serve 配置说明</a>操作。</p><button disabled={busy} onClick={async () => { setBusy(true); try { setProbe(await api('/mobile/check')) } catch { setError('无法检查 Tailscale。') } finally { setBusy(false) } }}>检查 Tailscale</button>{probe && <p role="status">{probe.ready ? 'Tailscale 已就绪，请在上方启用手机访问。' : probe.message}</p>}</details>
      <DictationSettings info={dictation.info} onChange={dictation.choose} disabled={!desktop.connected} />
      <footer className="mobile-access-footer"><span>请保持这台电脑唤醒且 Mr. Mak 运行。手机可以按对话现有的权限发送任务。</span>{state?.enabled && <button disabled={busy} onClick={() => action('disable')}>停用手机访问</button>}</footer>
    </section></div>}
  </>
}
