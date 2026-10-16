import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './client'
import { AgentLogo, Icon } from './Icons'
import type { AgentId } from './types'
import './mcp.css'
import { fileManager } from './platform'

type Check = { status: 'available' | 'agent-auth' | 'timeout' | 'unavailable'; toolCount: number | null; moreTools?: boolean; checkedAt: string; stale?: boolean }
type Server = {
  id: string; name: string; client: 'codex' | 'claude' | 'antigravity' | 'kimi' | 'cursor'; scope: string; enabled: boolean
  readiness: string; transport: string; endpoint: string; executable: string | null; plugin: string | null
  sources: { scope: string; path: string; effective: boolean }[]; missingEnv: string[]; credentialNames: string[]; canCheck: boolean; connection: Check | null
}
type Inventory = { scannedAt: string; servers: Server[]; sources: { client: string; scope: string; path: string }[]; problems: { path: string; message: string }[] }
const clients = { codex: 'Codex', claude: 'Claude', antigravity: 'Antigravity', kimi: 'Kimi', cursor: 'Cursor' }
const scopes: Record<string, string> = { project: '项目', local: '项目 · 本机', global: '全局', plugin: '插件', managed: '托管' }
const stateLabel: Record<string, string> = { configured: '已启用', disabled: '已禁用', managed: '由宿主管理', 'missing-env': '需要配置', 'missing-command': '未安装', approval: '需要批准' }
const checkLabel: Record<string, string> = { available: '可用', 'agent-auth': '请在代理中检查登录', timeout: '超时', unavailable: '无法连接' }

export default function McpPanel({ onClose }: { onClose: () => void }) {
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [client, setClient] = useState('all')
  const [scope, setScope] = useState('all')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const generation = useRef(0)
  const invalidate = useCallback(() => { generation.current++ }, [])
  const refresh = useCallback(async () => {
    const request = ++generation.current
    try { const result = await api<Inventory>('/mcp'); if (request === generation.current) { setInventory(result); setError('') } }
    catch (error) { if (request === generation.current) setError(error instanceof Error ? error.message : String(error)) }
  }, [])
  useEffect(() => {
    void Promise.resolve().then(refresh); const onFocus = () => { void refresh() }; window.addEventListener('focus', onFocus)
    const timer = window.setInterval(onFocus, 30000)
    return () => { invalidate(); window.removeEventListener('focus', onFocus); clearInterval(timer) }
  }, [refresh, invalidate])
  const check = async (server: Server) => {
    setBusy(value => new Set([...value, server.id])); setError('')
    try { await api('/mcp/check', { id: server.id }); await refresh() }
    catch (error) { setError(error instanceof Error ? error.message : String(error)) }
    finally { setBusy(value => { const next = new Set(value); next.delete(server.id); return next }) }
  }
  const visible = (inventory?.servers || []).filter(server => (client === 'all' || server.client === client)
    && (scope === 'all' || (scope === 'project' ? ['project', 'local'].includes(server.scope) : server.scope === scope))
    && `${server.name} ${server.endpoint} ${server.plugin || ''}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="files-panel mcp-panel"><header><h2>MCP</h2><div>
    <button className="desk-icon" onClick={() => void refresh()} title="刷新 MCP 配置" aria-label="刷新 MCP 配置"><Icon name="refresh" size={15} /></button>
    <button className="desk-icon" onClick={onClose} aria-label="关闭 MCP"><Icon name="close" size={17} /></button>
  </div></header>
    <div className="mcp-summary"><strong>{inventory ? `${inventory.servers.filter(server => server.enabled).length} 个已启用的连接` : '正在读取配置…'}</strong><p>代理可用的工具。检查某个服务器可查看它当前是否响应。</p></div>
    <div className="mcp-filters"><label>代理<select aria-label="按代理筛选 MCP" value={client} onChange={event => setClient(event.target.value)}><option value="all">全部代理</option>{Object.entries(clients).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>存储位置<select aria-label="按范围筛选 MCP" value={scope} onChange={event => setScope(event.target.value)}><option value="all">全部位置</option><option value="project">此项目</option><option value="global">全局</option><option value="plugin">插件</option></select></label></div>
    <div className="file-filter"><Icon name="search" size={14} /><input aria-label="查找 MCP" placeholder="查找服务器…" value={query} onChange={event => setQuery(event.target.value)} /></div>
    <div className="mcp-scroll">
      {error && <p className="desk-error-inline" role="alert">{error}</p>}
      {inventory?.problems.map(problem => <p key={problem.path} className="mcp-problem">{problem.message}<small>{problem.path}</small></p>)}
      {visible.map(server => <article className="mcp-server" key={server.id} data-mcp-id={server.id}>
        <div className="mcp-server-title"><span className="mcp-provider">{server.client === 'cursor' ? <Icon name="terminal" size={16} /> : <AgentLogo agent={server.client as AgentId} size={16} />}</span><h3>{server.name}</h3><span className={`mcp-state ${server.readiness}`}>{stateLabel[server.readiness] || server.readiness}</span></div>
        <p className="mcp-subtitle">{clients[server.client]}<span>·</span>{scopes[server.scope] || server.scope}<span>·</span>{server.transport === 'stdio' ? '本地进程' : server.transport.toUpperCase()}</p>
        <p className="mcp-endpoint" title={server.endpoint || server.executable || ''}>{server.endpoint || server.executable}</p>
        {server.missingEnv.length > 0 && <p className="mcp-note">添加到 .env：{server.missingEnv.join(', ')}</p>}
        {server.readiness === 'missing-command' && <p className="mcp-note">请在这台电脑上安装此服务器。</p>}
        {server.readiness === 'approval' && <p className="mcp-note">请在 Claude 中批准此项目服务器。</p>}
        {server.plugin && <p className="mcp-note">由 {server.plugin} 提供。</p>}
        <div className="mcp-check"><span className={server.connection?.status === 'available' && !server.connection.stale ? 'available' : ''}>{busy.has(server.id) ? '检查中…' : server.connection ? `${server.connection.stale ? '上次检查：' : ''}${checkLabel[server.connection.status]}` : '尚未检查连接'}{!busy.has(server.id) && server.connection?.toolCount != null && <small>{server.connection.toolCount}{server.connection.moreTools ? '+' : ''} 个工具</small>}</span>
          {server.canCheck && <button onClick={() => void check(server)} disabled={busy.has(server.id) || busy.size >= 2} aria-label={`为 ${clients[server.client]} 检查 ${server.name}`}>检查</button>}
        </div>
        {server.connection && <p className="mcp-check-time">检查于 {new Date(server.connection.checkedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
        {server.connection?.status === 'agent-auth' && <p className="mcp-note">此检查无法复用代理的私有登录。请在该代理中使用 /mcp 查看其已认证的连接。</p>}
        {server.connection?.status === 'unavailable' && <p className="mcp-note">服务器未完成 MCP 握手。可能需要先运行本地配套应用。</p>}
        <details className="mcp-sources"><summary>配置{server.sources.length > 1 ? ` · ${server.sources.length} 个位置` : ''}</summary>{server.sources.map(source => <div key={source.path}><span>{scopes[source.scope] || source.scope}{source.effective ? ' · 生效来源' : ' · 较低优先级'}</span><code>{source.path}</code><button onClick={() => api('/reveal', { path: source.path }).catch(error => setError(String(error.message || error)))}>在{fileManager}中显示 <Icon name="external" size={12} /></button></div>)}{server.credentialNames.length > 0 && <p>凭据已隐藏。</p>}</details>
      </article>)}
      {inventory && !visible.length && <p className="mcp-empty">没有符合筛选条件的 MCP 服务器。</p>}
    </div>
    <footer className="mcp-footer"><p>“已启用”表示已配置。检查会建立临时连接；每个对话保留自己的 MCP 会话。桌面应用的连接器由其宿主管理。</p><button onClick={() => { navigator.clipboard.writeText('/mcp').then(() => setCopied(true)).catch(error => setError(String(error.message || error))) }}>{copied ? '已复制 /mcp' : '复制 /mcp 以查看对话状态'}</button></footer>
  </div>
}
