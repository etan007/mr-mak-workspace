// Platform conventions for the desktop windows. Windows and Linux use Ctrl for
// app shortcuts and copy/paste; macOS uses Cmd and leaves Ctrl to the terminal.
const agent = typeof navigator === 'undefined' ? '' : `${navigator.platform} ${navigator.userAgent}`

export const isMac = /Mac/i.test(agent)
export const isWindows = /Win/i.test(agent)

/** The app-shortcut modifier: Cmd on macOS, Ctrl elsewhere. */
export const modKey = (event: { ctrlKey: boolean, metaKey: boolean }) => isMac ? event.metaKey : event.ctrlKey
export const modLabel = isMac ? '⌘' : 'Ctrl+'
export const shortcutLabel = (keys: string) => isMac ? `⌘${keys.replace(/Shift\+/g, '⇧')}` : `Ctrl+${keys}`

export const fileManager = isMac ? '访达' : isWindows ? '资源管理器' : '文件管理器'
export const trashName = isWindows ? '回收站' : '废纸篓'
export const shellName = isWindows ? 'PowerShell' : 'Shell'
