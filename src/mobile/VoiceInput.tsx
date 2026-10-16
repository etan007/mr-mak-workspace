import { useCallback, useEffect, useRef, useState } from 'react'
import { Icon } from '../desktop/Icons'
import { transcribeMobileAudio, type DictationInfo } from './client'
import { deleteVoiceDraft, readVoiceDraft, saveVoiceDraft, type VoiceDraft } from './voice-drafts'

type Phase = 'idle' | 'permission' | 'recording' | 'transcribing' | 'saved'
export default function VoiceInput({ id, connected, disabled, config, onText, onBusy, transcriber = transcribeMobileAudio }: {
  id: string; connected: boolean; disabled: boolean; config?: DictationInfo
  transcriber?: typeof transcribeMobileAudio
  onText: (text: string, recordingId: string) => void | Promise<void>; onBusy: (busy: boolean) => void
}) {
  const [phase, setPhase] = useState<Phase>('idle'), [seconds, setSeconds] = useState(0), [error, setError] = useState('')
  const [recording, setRecording] = useState<VoiceDraft | null>(null), [recovered, setRecovered] = useState(false)
  const alive = useRef(true), stream = useRef<MediaStream | null>(null), recorder = useRef<MediaRecorder | null>(null)
  const timer = useRef(0), controller = useRef<AbortController | null>(null), discard = useRef(false), serial = useRef(0)
  const textHandler = useRef(onText), busyHandler = useRef(onBusy)
  useEffect(() => { textHandler.current = onText; busyHandler.current = onBusy }, [onText, onBusy])
  const supported = !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
  const release = useCallback(() => { clearInterval(timer.current); stream.current?.getTracks().forEach(track => track.stop()); stream.current = null }, [])
  const stop = useCallback((cancel = false) => {
    if (cancel) discard.current = true
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop()
    release()
  }, [release])
  useEffect(() => {
    alive.current = true
    void readVoiceDraft(id).then(saved => {
      if (!alive.current) return
      if (saved) { setRecording(saved); setSeconds(saved.seconds); setPhase('saved') }
      setRecovered(true)
    }).catch(() => { if (alive.current) { setRecovered(true); setError('无法恢复录音。听写时请保持此页面打开。') } })
    const hidden = () => { if (document.visibilityState === 'hidden') stop() }
    document.addEventListener('visibilitychange', hidden)
    return () => { alive.current = false; controller.current?.abort(); stop(); document.removeEventListener('visibilitychange', hidden) }
  }, [id, stop])
  useEffect(() => { onBusy(phase === 'permission' || phase === 'recording' || phase === 'transcribing') }, [phase, onBusy])
  async function transcribe(saved: VoiceDraft) {
    const request = ++serial.current
    setPhase('transcribing'); setError(''); busyHandler.current(true)
    const abort = new AbortController(); controller.current = abort
    try {
      const result = await transcriber(saved, abort.signal)
      if (!alive.current || request !== serial.current) return
      // The parent persists the text before removing the recoverable recording.
      await textHandler.current(result.text, saved.id)
      await deleteVoiceDraft(id)
      if (!alive.current || request !== serial.current) return
      setRecording(null); setPhase('idle'); setError('')
    } catch (err) {
      if (!alive.current || request !== serial.current) return
      setPhase('saved'); setError(err instanceof Error ? err.message : '转写失败。录音已保存，请重试。')
    } finally { if (controller.current === abort) controller.current = null; if (alive.current && request === serial.current) busyHandler.current(false) }
  }
  async function start() {
    if (disabled || !connected || !recovered || phase !== 'idle') return
    if (!config?.available) { setError(config?.provider === 'off' ? '语音听写已关闭。请在手机设置或桌面端设置中选择听写服务。' : config?.provider === 'openai' || config?.provider === 'openrouter' ? '所选付费服务需要在电脑上配置 API key。如需免费听写，请选择 Local Whisper。' : '请在电脑上配置 Local Whisper 以启用免费语音输入。'); return }
    if (!supported) { setError('此浏览器不支持麦克风录音。请在 Chrome 或 Safari 中打开 HTTPS 页面，或使用键盘自带的语音输入。'); return }
    setPhase('permission'); setError(''); busyHandler.current(true); discard.current = false
    const request = ++serial.current
    try {
      const captured = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      if (!alive.current || request !== serial.current) { captured.getTracks().forEach(track => track.stop()); return }
      if (document.visibilityState === 'hidden') { captured.getTracks().forEach(track => track.stop()); setPhase('idle'); busyHandler.current(false); return }
      stream.current = captured
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type))
      if (!mimeType) throw new Error('此浏览器无法录制受支持的音频格式。请使用键盘自带的语音输入。')
      const active = new MediaRecorder(captured, { mimeType, audioBitsPerSecond: 64000 })
      recorder.current = active
      const chunks: Blob[] = [], started = Date.now(); let size = 0
      active.ondataavailable = event => {
        if (!event.data.size) return
        chunks.push(event.data); size += event.data.size
        if (size > config.maxBytes) { discard.current = true; stop(true); if (alive.current) setError('录音过大，请录制更短的消息。') }
      }
      active.onerror = () => { stop(true); if (alive.current) setError('录音被中断，请重试。') }
      active.onstop = () => {
        release(); recorder.current = null
        if (discard.current || !size) { if (alive.current) { setPhase('idle'); busyHandler.current(false) }; return }
        const saved: VoiceDraft = { id: crypto.randomUUID(), audio: new Blob(chunks, { type: active.mimeType }), seconds: Math.round((Date.now() - started) / 1000), createdAt: Date.now() }
        void (async () => {
          let durable = true
          try { await saveVoiceDraft(id, saved) } catch { durable = false }
          if (!alive.current) return
          setRecording(saved); setSeconds(saved.seconds); setPhase('saved'); busyHandler.current(false)
          if (!durable) setError('请保持此页面打开：手机未能保存录音。你仍可转写或下载它。')
          if (durable && document.visibilityState === 'visible') await transcribe(saved)
        })()
      }
      active.start(500); setSeconds(0); setPhase('recording')
      timer.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000); setSeconds(elapsed)
        if (elapsed >= config.maxSeconds) stop()
      }, 250)
    } catch (err) {
      release()
      if (!alive.current || request !== serial.current) return
      setPhase('idle'); busyHandler.current(false)
      setError(err instanceof DOMException && err.name === 'NotAllowedError' ? '请在浏览器中允许麦克风访问，然后重试。已输入的草稿不受影响。' : err instanceof Error ? err.message : '无法启动麦克风。')
    }
  }
  async function remove() {
    serial.current++; controller.current?.abort(); stop(true)
    try { await deleteVoiceDraft(id) } catch { setError('无法删除已保存的录音，请重试。'); return }
    setRecording(null); setPhase('idle'); setError(''); busyHandler.current(false)
  }
  function download() {
    if (!recording) return
    const url = URL.createObjectURL(recording.audio), link = document.createElement('a')
    const type = recording.audio.type
    link.href = url; link.download = `voice-note-${new Date(recording.createdAt).toISOString().replace(/[:.]/g, '-')}.${type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'}`
    link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 10000)
  }
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  return <div className={`mobile-voice ${phase}`}>
    <button type="button" className="mobile-icon mobile-mic" aria-label={phase === 'recording' ? '停止录音并转写' : '听写消息'} title="听写消息" disabled={phase !== 'recording' && (disabled || !connected || !recovered || phase !== 'idle')} onClick={() => phase === 'recording' ? stop() : void start()}><Icon name={phase === 'recording' ? 'stop' : 'mic'} /></button>
    {phase !== 'idle' && <div className="mobile-voice-panel" role="status">
      <span>{phase === 'permission' ? '请允许麦克风访问…' : phase === 'recording' ? `录音中 ${clock} · 完成后点击停止` : phase === 'transcribing' ? '正在转写… 消息将保留为草稿。' : `已保存录音 · ${clock}`}</span>
      {phase === 'recording' && <button type="button" onClick={() => stop(true)}>取消录音</button>}
      {phase === 'saved' && <div><button type="button" disabled={!connected || disabled} onClick={() => recording && void transcribe(recording)}>转写录音</button><button type="button" onClick={download}>下载音频</button><button type="button" onClick={() => void remove()}>放弃录音</button></div>}
      {phase === 'recording' && <small>最长 {config?.maxSeconds || 120} 秒。转写使用{config?.provider === 'local' ? '电脑上的本地 Whisper，不消耗 API 额度' : config?.provider === 'openrouter' ? ' OpenRouter API 额度' : ' OpenAI API 额度'}。</small>}
    </div>}
    {error && <div className="mobile-voice-error" role="alert">{error}<button type="button" aria-label="关闭语音输入错误提示" onClick={() => setError('')}><Icon name="close" size={14} /></button></div>}
  </div>
}
