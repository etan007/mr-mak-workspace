import type { ChatSession } from './types'

export function chatActivityLabel(session: ChatSession) {
  const working = session.status === 'running' && session.activity === 'working'
  if (session.unread) return working ? '工作中 · 有未读结果' : '已完成 · 有未读结果'
  if (working) return '工作中'
  if (session.status !== 'running') return session.status === 'starting' ? '启动中' : '已停止'
  if (session.activity === 'waiting') return '需要处理 · 请查看终端'
  return ['codex', 'claude', 'opencode'].includes(session.agent) ? '就绪' : '终端已打开'
}
