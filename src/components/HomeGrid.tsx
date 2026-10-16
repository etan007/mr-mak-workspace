import type { WorkspaceEntity } from '../types'
import { categoryIcon, categoryLabel } from '../lib/categories'
import MakCard from './MakCard'
import MakLogo from './MakLogo'

interface HomeGridProps {
  entities: WorkspaceEntity[]
  pinned: WorkspaceEntity[]
  grouped: Map<string, WorkspaceEntity[]>
  offline: boolean
  searching: boolean
  query: string
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return '夜深了，还在忙？'
  if (h < 12) return '早上好。'
  if (h < 18) return '下午好。'
  return '晚上好。'
}

export default function HomeGrid({
  entities,
  pinned,
  grouped,
  offline,
  searching,
  query,
}: HomeGridProps) {
  const activeCount = entities.filter(e => e.status === 'active').length
  const categoryCount = new Set(entities.map(e => e.category || 'other')).size
  const shown = pinned.length + [...grouped.values()].reduce((n, list) => n + list.length, 0)

  return (
    <div className="home">
      <header className="home-hero">
        <MakLogo size={84} />
        <div>
          <h1 className="home-title">{greeting()}</h1>
          <p className="home-sub">
            <b>{activeCount}</b> 进行中 · <b>{entities.length}</b> 张卡片 ·{' '}
            <b>{categoryCount}</b> 个分类
            {offline && <span className="home-offline"> · 无法读取 workspace.json</span>}
          </p>
        </div>
      </header>

      {searching && (
        <p className="home-filter">
          {shown === 0 ? '没有匹配' : `${shown} 项匹配`}{' '}
          “{query.trim()}”（含归档）
        </p>
      )}

      {pinned.length > 0 && (
        <section className="home-section">
          <div className="section-head">
            <span className="section-title">{'\u{1F4CC}'} 已置顶</span>
            <span className="section-count">{pinned.length}</span>
          </div>
          <div className="card-grid">
            {pinned.map(e => (
              <MakCard key={e.id} entity={e} />
            ))}
          </div>
        </section>
      )}

      {[...grouped.entries()].map(([cat, list]) => (
        <section key={cat} className="home-section">
          <div className="section-head">
            <span className="section-title">
              {categoryIcon(cat)} {categoryLabel(cat)}
            </span>
            <span className="section-count">{list.length}</span>
          </div>
          <div className="card-grid">
            {list.map(e => (
              <MakCard key={e.id} entity={e} />
            ))}
          </div>
        </section>
      ))}

      {shown === 0 && !searching && (
        <div className="home-empty">
          {offline
            ? '无法加载 workspace.json — public/workspace 链接是否存在？请重新运行 npm run dev。'
            : '这里还没有内容。新的工作会以卡片形式出现。'}
        </div>
      )}
    </div>
  )
}
