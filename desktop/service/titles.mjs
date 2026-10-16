export function englishTitle(value, fallback = 'New conversation') {
  const title = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 100) || fallback;
  if (/[^\x20-\x7e\u2013\u2014\u00b7\u2018\u2019\u201c\u201d]/u.test(title)) {
    throw new Error('对话名称请使用英文。消息内容可使用任何语言。');
  }
  return title;
}

export function restoredTitle(value, index) {
  if (/^(codex|claude|antigravity|agy|opencode|kimi)$/i.test(value || '')) return `Conversation ${index + 1}`;
  try { return englishTitle(value, `Conversation ${index + 1}`); }
  catch { return /голос/i.test(value || '') ? 'Mr. Mak voice' : `Conversation ${index + 1}`; }
}

export function taskTitle(value) {
  const title = englishTitle(value, '');
  if (!title || !/[a-z]/i.test(title) || /^untitled(?:[\s#_-]*\d+)?$/i.test(title) || /^(?:(?:new|untitled)\s+)?(?:conversation|chat|session|task|codex|claude|antigravity|agy|opencode|kimi)(?:[\s#_-]*\d+)?$/i.test(title)) {
    throw new Error('打开对话前请选择描述性的英文任务标题，例如 "Dream Game Combat" 或 "Workspace Files"。协调器创建的对话不允许使用 "Conversation 1" 之类的通用标题。');
  }
  return title;
}
