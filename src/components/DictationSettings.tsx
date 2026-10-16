import { useState } from 'react'
import type { DictationInfo } from '../mobile/client'
import './dictation-settings.css'

export default function DictationSettings({ info, onChange, disabled = false }: { info?: DictationInfo; onChange: (provider: string) => Promise<DictationInfo>; disabled?: boolean }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function change(provider: string) {
    setBusy(true); setError('')
    try { await onChange(provider) } catch (error) { setError(error instanceof Error ? error.message : String(error)) }
    finally { setBusy(false) }
  }
  const selected = info?.providers?.find(item => item.id === info.provider)
  return <section className="dictation-settings" aria-label="语音转文字设置">
    <h3>语音转文字</h3>
    <label>听写服务<select aria-label="听写服务" value={info?.provider || 'local'} disabled={disabled || busy || !info} onChange={event => void change(event.target.value)}>
      {(info?.providers || [{ id: 'local', label: 'Local Whisper · 免费' }, { id: 'openai', label: 'OpenAI · 付费' }, { id: 'openrouter', label: 'OpenRouter · 付费' }, { id: 'off', label: '关闭' }]).map(provider => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
    </select></label>
    <p>{selected?.detail} 桌面端与所有已配对手机共用此设置。更改从下一次转写生效；文本仍为草稿。</p>
    {selected && !selected.available && <p role="status">{selected.id === 'local' ? 'Local Whisper 需要先在电脑上完成配置。' : `缺少 ${selected.id === 'openai' ? 'OPENAI_API_KEY' : 'OPENROUTER_API_KEY'}，请添加到电脑上工作区的 .env。`}不会自动切换到其他服务。</p>}
    {error && <p role="alert">{error}</p>}
  </section>
}
