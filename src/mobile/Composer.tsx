import { useEffect, useRef, useState } from 'react'
import { Icon } from '../desktop/Icons'
import { mobileApi, uploadMobileImage, useMobile } from './client'
import VoiceInput from './VoiceInput'
import { messageWithWorkspaceContext } from './workspace-context'

interface Draft { text: string; images: { id: string; name: string }[]; requestId?: string; voiceIds?: string[]; deliveryText?: string }
interface Receipt { status: 'delivered' | 'sending' | 'uncertain' | 'failed'; error?: string }
export default function Composer({ id, connected, running, active = true }: { id: string; connected: boolean; running: boolean; active?: boolean }) {
  const storage = `mrmak.mobile.draft.${id}`
  const [draft, setDraft] = useState<Draft>(() => { try { return JSON.parse(localStorage.getItem(storage) || '') } catch { return { text: '', images: [] } } })
  const [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [status, setStatus] = useState(''), [uncertain, setUncertain] = useState(false)
  const picker = useRef<HTMLInputElement>(null)
  const [voiceBusy, setVoiceBusy] = useState(false)
  const { dictation, sessions } = useMobile()
  useEffect(() => { localStorage.setItem(storage, JSON.stringify(draft)) }, [draft, storage])
  async function send() {
    if (busy || uploading || voiceBusy || !connected || !running || (!draft.text.trim() && !draft.images.length)) return
    const pending = draft.requestId ? draft : { ...draft, requestId: crypto.randomUUID(), deliveryText: messageWithWorkspaceContext(draft.text, sessions.find(session => session.id === id)?.agent) }
    setDraft(pending); localStorage.setItem(storage, JSON.stringify(pending)); setBusy(true); setStatus('正在发送…')
    try {
      const receipt = await mobileApi<Receipt>(`/sessions/${id}/send`, { requestId: pending.requestId, text: pending.deliveryText ?? pending.text, images: pending.images.map(image => image.id) })
      if (receipt.status === 'delivered') { setDraft({ text: '', images: [] }); setStatus('已送达终端'); setUncertain(false) }
      else { setStatus(receipt.error || '仍在确认是否送达。'); setUncertain(receipt.status === 'uncertain' || receipt.status === 'failed') }
    } catch (error) { setStatus(`${error instanceof Error ? error.message : String(error)} 草稿已保存。重试会检查同一次发送。`) }
    finally { setBusy(false) }
  }
  async function attach(files: File[]) {
    if (!files.length || uploading || draft.requestId) return
    if (draft.images.length + files.length > 12) { setStatus('每条消息最多附加 12 张图片。'); return }
    setUploading(true); setStatus('正在将图片保存到电脑…')
    try { for (const file of files) { const image = await uploadMobileImage(file); setDraft(current => ({ ...current, images: [...current.images, image] })) }; setStatus('图片已可发送') }
    catch (error) { setStatus(error instanceof Error ? error.message : String(error)) }
    finally { setUploading(false); if (picker.current) picker.current.value = '' }
  }
  function addVoice(text: string, recordingId: string) {
    if (draft.voiceIds?.includes(recordingId)) return
    const next = { ...draft, text: draft.text ? `${draft.text}${/\s$/.test(draft.text) ? '' : '\n'}${text}` : text, voiceIds: [...(draft.voiceIds || []), recordingId].slice(-20) }
    localStorage.setItem(storage, JSON.stringify(next))
    setDraft(next); setStatus('')
  }
  return <form className="mobile-composer" onSubmit={event => { event.preventDefault(); void send() }}>
    {!!draft.images.length && <div className="mobile-image-chips">{draft.images.map(image => <span key={image.id}><Icon name="attach" size={13} /><span>{image.name}</span><button type="button" aria-label={`移除 ${image.name}`} disabled={busy || !!draft.requestId} onClick={() => setDraft(current => ({ ...current, images: current.images.filter(item => item.id !== image.id) }))}>×</button></span>)}</div>}
    <textarea aria-label="向此对话发送消息" placeholder={running ? '发送一个想法或任务…' : '起草消息 · 恢复此对话后发送'} rows={2} value={draft.text} disabled={busy || !!draft.requestId} onChange={event => setDraft(current => ({ ...current, text: event.target.value }))} onPaste={event => { const files = Array.from(event.clipboardData.files).filter(file => file.type.startsWith('image/')); if (files.length) { event.preventDefault(); void attach(files) } }} />
    <div className="mobile-compose-actions"><input ref={picker} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={event => void attach(Array.from(event.target.files || []))} /><button type="button" className="mobile-icon" aria-label="附加图片" disabled={!connected || uploading || busy || !!draft.requestId} onClick={() => picker.current?.click()}><Icon name="attach" /></button>{active && <VoiceInput id={id} connected={connected} disabled={busy || !!draft.requestId} config={dictation} onText={addVoice} onBusy={setVoiceBusy} />}<button className="mobile-icon mobile-send" type="submit" aria-label={busy ? '发送中…' : draft.requestId ? '重试' : '发送'} title={busy ? '发送中…' : draft.requestId ? '重试' : '发送'} disabled={!connected || !running || uploading || busy || voiceBusy || uncertain || (!draft.text.trim() && !draft.images.length)}><Icon name="send" /></button><span>{connected ? running ? '草稿保存在这部手机上' : '对话已停止' : '离线 · 草稿已保存'}</span></div>
    {status && <div className="mobile-send-status" role="status">{status}{draft.requestId && !busy && <button type="button" onClick={() => { if (!window.confirm('请先查看终端：上一条消息可能已经送达。要用此草稿重新发送吗？')) return; setDraft(current => ({ text: current.text, images: current.images })); setUncertain(false); setStatus('草稿已解锁。再次发送前请先查看终端。') }}>编辑草稿</button>}</div>}
  </form>
}
