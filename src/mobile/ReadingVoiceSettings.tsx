import { useEffect, useState } from 'react'
import { mobileApi } from './client'
import { readingVoices, readingVoiceChanged, saveReadingVoice, savedReadingVoice } from './readingVoices'
export default function ReadingVoiceSettings() {
  const [saved, setSaved] = useState(savedReadingVoice), [ready, setReady] = useState<boolean | null>(null)
  useEffect(() => { let active = true; void mobileApi<{ available: boolean }>('/read-aloud').then(info => { if (active) setReady(info.available) }).catch(() => { if (active) setReady(false) }); return () => { active = false } }, [])
  return <fieldset className="mobile-reading-settings"><legend>朗读</legend><label>英文语音<select aria-label="英文朗读语音" value={saved} onChange={event => { const value = event.target.value; setSaved(value); saveReadingVoice(value); window.dispatchEvent(new Event(readingVoiceChanged)) }}>{readingVoices.map(voice => <option key={voice.id} value={voice.id}>{voice.label}</option>)}</select></label>{ready === false && <p>请在电脑上配置本地朗读，以启用这些语音。</p>}</fieldset>
}
