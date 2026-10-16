export const CATEGORY_ICONS: Record<string, string> = {
  'image-gen': '\u{1F3A8}',
  'analytics': '\u{1F4CA}',
  'research': '\u{1F50D}',
  'lead-magnet': '\u{1F9F2}',
  'game': '\u{1F3AE}',
  'dev': '\u{1F6E0}\u{FE0F}',
}

const CATEGORY_LABELS: Record<string, string> = {
  'image-gen': '图像生成',
  'analytics': '数据分析',
  'research': '调研',
  'lead-magnet': '引流内容',
  'game': '游戏',
  'dev': '开发',
  'project': '项目',
  'tools': '工具',
  'other': '其他',
  'by date': '按日期',
}

/** Display name for a category value; unknown categories keep their own name. */
export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/-/g, ' ')
}

export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? '\u{1F4C1}'
}
