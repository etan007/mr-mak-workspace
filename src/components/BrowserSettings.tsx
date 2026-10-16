import ThemePicker from './ThemePicker'

export default function BrowserSettings() {
  return <details className="browser-settings" onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus() } }}>
    <summary role="button" aria-label="工作区设置">设置</summary>
    <div className="browser-settings-panel"><h2>外观</h2><ThemePicker /></div>
  </details>
}
