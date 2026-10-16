import type { ChatSession } from './types'

export function orderedChats(sessions: ChatSession[]) {
  return sessions.filter(item => item.open).sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.tabOrder || 0) - (b.tabOrder || 0))
}

export const tabColors = [
  { name: '玫瑰', value: '#dba3bb' }, { name: '蜜桃', value: '#dfa48b' },
  { name: '金色', value: '#d7bd80' }, { name: '鼠尾草', value: '#a5bd91' },
  { name: '薄荷', value: '#8cc8b4' }, { name: '天蓝', value: '#91b6da' },
  { name: '丁香', value: '#b8a2d4' }, { name: '石板灰', value: '#a6afbc' },
]
