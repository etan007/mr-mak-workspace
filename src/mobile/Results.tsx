import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Icon } from '../desktop/Icons'
import { mobileApi, onMobileEvent } from './client'
import { reportPosition, saveReportPosition, selectMobileWorkspace, useMobileWorkspace, validReportPosition } from './app-state'
import { rememberMobileReport, rememberMobileReports } from './workspace-context'
import { categoryLabel } from '../lib/categories'

interface Report { id: string; title: string; category: string; updated: string; steps: { name: string; index: number }[] }
interface Preview { title: string; step: string; kind: 'markdown' | 'html'; url: string; text?: string; statePersistence?: boolean }
function restoredReportUrl(preview: Preview, id: string, step: number) {
  const saved = reportPosition(id, step), url = new URL(preview.url, location.origin)
  const prefix = /^\/mobile\/view\/[^/]+\//.exec(url.pathname)?.[0]
  if (prefix && saved.path) url.pathname = prefix + saved.path
  url.hash = saved.hash || ''; return url.href
}

export default function Results({ header, active }: { header: HTMLElement | null; active: boolean }) {
  const selection = useMobileWorkspace(), { step } = selection
  const [reports, setReports] = useState<Report[]>([]), [opened, setOpened] = useState<{ id: string; step: number; value: Preview; url: string; at: number } | null>(null)
  const selected = reports.find(report => report.id === selection.id) || null
  const selectedId = selected?.id
  const preview = opened?.id === selection.id && opened.step === step ? opened.value : null
  const [query, setQuery] = useState(''), [error, setError] = useState('')
  const menu = useRef<HTMLDetailsElement>(null), frame = useRef<HTMLIFrameElement>(null), markdown = useRef<HTMLElement>(null)
  const loading = !!selected && !preview && !error
  useEffect(() => {
    function dismiss(event: PointerEvent) { if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape' && menu.current?.open) { menu.current.open = false; menu.current.querySelector('summary')?.focus() } }
    document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape) }
  }, [])
  useEffect(() => {
    let current = true
    const load = () => mobileApi<Report[]>('/reports').then(value => {
      if (!current) return
      rememberMobileReports(value)
      setReports(value)
      const saved = selection.id && value.find(item => item.id === selection.id)
      if (selection.id && !saved) selectMobileWorkspace(null)
      else if (saved && !saved.steps.some(item => item.index === step)) selectMobileWorkspace(saved.id, saved.steps[0]?.index || 0)
    }).catch(() => { if (current) setError('连接到电脑后才能加载报告。') })
    void load(); const off = onMobileEvent(event => { if (event.type === 'connected') void load() })
    return () => { current = false; off() }
  }, [selection.id, step])
  useEffect(() => {
    if (!selectedId) return
    let current = true
    mobileApi<Preview>('/reports/open', { entityId: selectedId, step }).then(value => { if (current) { rememberMobileReport(selectedId, step, value); setOpened({ id: selectedId, step, value, url: restoredReportUrl(value, selectedId, step), at: Date.now() }); setError('') } }).catch(err => { if (current) setError(err instanceof Error ? err.message : String(err)) })
    return () => { current = false }
  }, [selectedId, step]) // Registry refreshes preserve the active report document.
  useEffect(() => {
    if (!selectedId || !opened || !opened.value.statePersistence || opened.id !== selectedId || opened.step !== step) return
    let current = true, refreshing = false
    const refresh = async () => {
      if (!active || refreshing || Date.now() - opened.at < 25 * 60 * 1000) return
      refreshing = true
      try { const value = await mobileApi<Preview>('/reports/open', { entityId: selectedId, step }); if (current) { rememberMobileReport(selectedId, step, value); setOpened({ id: selectedId, step, value, url: value.url === opened.value.url ? opened.url : restoredReportUrl(value, selectedId, step), at: Date.now() }); setError('') } }
      catch { if (current) setError('重新连接后才能刷新此报告。已保存的页面和位置会保留。') }
      finally { refreshing = false }
    }
    void refresh(); const timer = window.setTimeout(() => void refresh(), Math.max(1000, 25 * 60 * 1000 - (Date.now() - opened.at))); const off = onMobileEvent(event => { if (event.type === 'connected') void refresh() })
    return () => { current = false; clearTimeout(timer); off() }
  }, [active, selectedId, step, opened])
  useLayoutEffect(() => { if (preview?.kind === 'markdown' && selectedId && markdown.current) { const saved = reportPosition(selectedId, step); markdown.current.scrollTop = saved.top; markdown.current.scrollLeft = saved.left } }, [preview, selectedId, step])
  useEffect(() => {
    if (!preview || preview.kind !== 'html' || !selectedId) return
    const id = selectedId, base = new URL(preview.url, location.origin), prefix = /^\/mobile\/view\/[^/]+\//.exec(base.pathname)?.[0]
    const message = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== 'null' || !prefix) return
      if (event.data?.type === 'mrmak:report-ready') { frame.current?.contentWindow?.postMessage({ type: 'mrmak:report-restore', state: reportPosition(id, step) }, '*'); return }
      if (event.data?.type !== 'mrmak:report-state') return
      const state = validReportPosition(event.data.state)
      if (state && state.path && state.path.startsWith(prefix.slice(1))) saveReportPosition(id, step, { ...state, path: state.path.slice(prefix.length - 1) })
    }
    window.addEventListener('message', message)
    frame.current?.contentWindow?.postMessage({ type: 'mrmak:report-active', active }, '*')
    frame.current?.contentWindow?.postMessage({ type: 'mrmak:report-capture' }, '*')
    return () => window.removeEventListener('message', message)
  }, [preview, selectedId, step, active])
  function close() { if (menu.current) menu.current.open = false; selectMobileWorkspace(null); setOpened(null); setError('') }
  function open(report: Report) { selectMobileWorkspace(report.id); setError('') }
  const relativeUrl = (url: string) => { const safe = defaultUrlTransform(url); return safe && preview ? new URL(safe, new URL(preview.url, location.origin)).href : safe }
  return <section className="mobile-results">{header && createPortal(<><h1 title={selected?.title}>{selected?.title || '工作区'}</h1>{selected && <details ref={menu} className="mobile-page-picker"><summary className="mobile-icon" aria-label="选择报告页面" title="选择报告页面"><Icon name="menu" size={19} /></summary><div className="mobile-page-menu" aria-label="报告页面">{selected.steps.map(item => <button key={item.index} aria-pressed={step === item.index} className={step === item.index ? 'active' : ''} onClick={() => { if (menu.current) menu.current.open = false; selectMobileWorkspace(selected.id, item.index); setError('') }}><span>{item.name}</span>{step === item.index && <span aria-hidden="true">✓</span>}</button>)}<button aria-label="关闭报告" onClick={close}><Icon name="back" size={16} /><span>全部工作区卡片</span></button></div></details>}</>, header)}{selected ? <>{loading && <p className="mobile-report-note">正在打开报告…</p>}{preview?.kind === 'html' && <iframe ref={frame} title={`${preview.title} · ${preview.step}`} src={opened?.url} onLoad={() => frame.current?.contentWindow?.postMessage({ type: 'mrmak:report-restore', state: reportPosition(selected.id, step) }, '*')} sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" />}{preview?.kind === 'markdown' && <article ref={markdown} className="mobile-message mobile-report-markdown" onScroll={() => { const node = markdown.current; if (active && node) saveReportPosition(selected.id, step, { top: node.scrollTop, left: node.scrollLeft }) }}><ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={relativeUrl} components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>, img: ({ src, alt }) => <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={alt || ''} loading="lazy" /></a> }}>{preview.text || ''}</ReactMarkdown></article>}</> : <div className="mobile-results-list"><label className="mobile-search"><Icon name="search" size={17} /><input aria-label="查找报告" value={query} onChange={event => setQuery(event.target.value)} placeholder="查找报告…" /></label>{reports.filter(item => `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase())).map(item => <button className="mobile-result-card" key={item.id} onClick={() => open(item)}><span><strong>{item.title}</strong><small>{categoryLabel(item.category)} · {item.steps.length} 个标签页</small></span><Icon name="arrow" size={16} /></button>)}</div>}{error && <p className="mobile-error" role="alert">{error}</p>}</section>
}
