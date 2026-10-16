import { useCallback, useEffect, useRef, useState } from 'react'
import type { Compare3DManifest, Compare3DTest } from '../types'
import { ModelViewer, type CameraState, type ShadingMode, type ViewerStats } from '../lib/three/viewer'

/**
 * Side-by-side 3D comparison card.
 *
 * One dropdown of tests, two panes per test, one shading toolbar driving both. Built
 * for filming: nothing on screen except the two models, the mode switcher and
 * the numbers. Low-poly tests open on the white wireframe, high-poly on the
 * textured PBR view — set per test in the manifest.
 */

interface ModeDef {
  id: ShadingMode
  label: string
  hint: string
}

const GEOMETRY_MODES: ModeDef[] = [
  { id: 'wire', label: '线框', hint: '网格本身 — 导出保留四边面时显示四边面' },
  { id: 'solid', label: '白模', hint: '无贴图白模 — 只看形体和轮廓' },
  { id: 'normals', label: '法线', hint: '几何法线 — 检查平滑和翻转面' },
]

// A channel the generator never baked shows as its flat fallback (blue for a
// missing normal map, grey for roughness). That is a finding worth filming, so
// these stay switchable even when the map is absent.
const TEXTURE_MODES: ModeDef[] = [
  { id: 'pbr', label: '贴图', hint: '原始材质，带环境光照' },
  { id: 'albedo', label: '基础色', hint: '基础色贴图，无光照' },
  { id: 'normalMap', label: '法线贴图', hint: '法线贴图本身 — 纯蓝表示没有烘焙' },
  { id: 'rough', label: '粗糙度', hint: '粗糙度贴图，或材质的固定值' },
  { id: 'metal', label: '金属度', hint: '金属度贴图，或材质的固定值' },
]

const ALL_MODES = [...GEOMETRY_MODES, ...TEXTURE_MODES]

const fmt = (n: number) => n.toLocaleString('en-US')

/** 8192 → "8K", 2048 → "2K", 1536 → "1536px". */
function texLabel(px: number): string | null {
  if (!px) return null
  return px % 1024 === 0 ? `${px / 1024}K 贴图` : `${px}px 贴图`
}

/** One canvas pane. Owns a ModelViewer for its lifetime. */
function Pane({
  url,
  rotationY,
  label,
  alias,
  redacted,
  onToggleReveal,
  logo,
  sublabel,
  accent,
  mode,
  syncRef,
  registerViewer,
}: {
  url: string
  rotationY?: number
  label: string
  alias?: string
  redacted?: boolean
  onToggleReveal?: () => void
  logo?: string
  sublabel?: string
  accent?: string
  mode: ShadingMode
  syncRef: React.MutableRefObject<((from: ModelViewer, s: CameraState) => void) | null>
  registerViewer: (v: ModelViewer | null) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<ModelViewer | null>(null)
  const [stats, setStats] = useState<ViewerStats | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false

    const viewer = new ModelViewer(host)
    viewerRef.current = viewer
    registerViewer(viewer)
    viewer.onStats = s => !cancelled && setStats(s)
    viewer.onCameraChange = s => syncRef.current?.(viewer, s)

    setStatus('loading')
    setStats(null)
    viewer
      .load(url, rotationY)
      .then(() => !cancelled && setStatus('ready'))
      .catch((e: unknown) => {
        if (cancelled) return
        setErrMsg(e instanceof Error ? e.message : String(e))
        setStatus('error')
      })

    return () => {
      cancelled = true
      registerViewer(null)
      viewerRef.current = null
      viewer.dispose()
    }
    // registerViewer/syncRef are stable refs from the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, rotationY])

  useEffect(() => {
    viewerRef.current?.setMode(mode)
  }, [mode])

  return (
    <div className="c3d-pane">
      <div className="c3d-pane-head">
        {logo && <img className="c3d-pane-logo" src={logo} alt="" />}
        {alias ? (
          // Blurred until the eye is clicked. The blurred glyphs are the ALIAS,
          // never the real name — a CSS blur is reversible and the DOM is
          // readable, so the real string must not be on the page while the card
          // is being filmed.
          <span className="c3d-pane-redact">
            <button
              type="button"
              className={`c3d-pane-name c3d-pane-name-btn${redacted ? ' redacted' : ''}`}
              style={accent && !redacted ? { color: accent } : undefined}
              onClick={onToggleReveal}
              title={redacted ? '点击显示名称' : '点击再次隐藏名称'}
            >
              {redacted ? alias : label}
            </button>
            <button
              type="button"
              className="c3d-eye"
              onClick={onToggleReveal}
              aria-label={redacted ? '显示模型名称' : '隐藏模型名称'}
              title={redacted ? '显示模型名称' : '隐藏模型名称'}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
                <path
                  d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.7" />
                {!redacted && (
                  <path d="M4 20 20 4" fill="none" stroke="currentColor" strokeWidth="1.7" />
                )}
              </svg>
            </button>
          </span>
        ) : (
          <span className="c3d-pane-name" style={accent ? { color: accent } : undefined}>
            {label}
          </span>
        )}
        {sublabel && <span className="c3d-pane-sub">{sublabel}</span>}
        {stats && (
          <span className="c3d-pane-stats">
            {fmt(stats.triangles)} 三角面 · {fmt(stats.vertices)} 顶点 · {stats.meshes} 个网格
            {texLabel(stats.textureSize) ? ` · ${texLabel(stats.textureSize)}` : ' · 无贴图'}
          </span>
        )}
      </div>

      <div className="c3d-stage">
        <div className="c3d-grid" aria-hidden />
        <div className="c3d-canvas" ref={hostRef} />
        {status === 'loading' && (
          <div className="c3d-overlay">
            <div className="c3d-spinner" />
            <span>加载中</span>
          </div>
        )}
        {status === 'error' && (
          <div className="c3d-overlay c3d-overlay-error">
            <strong>加载失败</strong>
            <span>{errMsg}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Compare3D({ manifestUrl, baseUrl }: { manifestUrl: string; baseUrl: string }) {
  const [manifest, setManifest] = useState<Compare3DManifest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [testIndex, setTestIndex] = useState(0)
  // Mode is remembered per test rather than globally: switching from a low-poly
  // wireframe tab to a textured tab should land on textured, and coming back
  // should land on whatever you were last looking at.
  const [modeByTest, setModeByTest] = useState<Record<string, ShadingMode>>({})
  const [sync, setSync] = useState(true)
  const [spin, setSpin] = useState(false)
  // Redact starts on so a card under embargo cannot be filmed name-up by
  // accident. `null` means "not decided yet" and resolves once the manifest lands.
  const [redact, setRedact] = useState<boolean | null>(null)
  const [showInput, setShowInput] = useState(false)

  const viewers = useRef<Set<ModelViewer>>(new Set())
  const syncRef = useRef<((from: ModelViewer, s: CameraState) => void) | null>(null)
  const syncOn = useRef(sync)

  useEffect(() => {
    let cancelled = false
    fetch(`${manifestUrl}${manifestUrl.includes('?') ? '&' : '?'}t=${Date.now()}`, {
      cache: 'no-store',
    })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((m: Compare3DManifest) => !cancelled && setManifest(m))
      .catch((e: unknown) => !cancelled && setLoadError(e instanceof Error ? e.message : String(e)))
    return () => {
      cancelled = true
    }
  }, [manifestUrl])

  const test: Compare3DTest | undefined = manifest?.tests[testIndex]
  const hasAlias = !!manifest?.tests.some(t => t.models.some(m => m.alias))
  const redacted = redact ?? hasAlias

  // Each test declares how it opens — low-poly on the wireframe, textured work
  // on PBR — so switching tabs lands on the right view without a click.
  const mode: ShadingMode = test
    ? modeByTest[test.id] ?? test.defaultMode ?? (test.kind === 'lowpoly' ? 'wire' : 'pbr')
    : 'solid'

  const setMode = useCallback(
    (m: ShadingMode) => {
      if (!test) return
      setModeByTest(prev => ({ ...prev, [test.id]: m }))
    },
    [test],
  )

  useEffect(() => {
    syncOn.current = sync
  }, [sync])

  useEffect(() => {
    syncRef.current = (from, state) => {
      if (!syncOn.current) return
      for (const v of viewers.current) if (v !== from) v.applyCamera(state)
    }
    return () => {
      syncRef.current = null
    }
  }, [])

  useEffect(() => {
    for (const v of viewers.current) v.setAutoRotate(spin)
  }, [spin, testIndex, mode])

  const resetCameras = useCallback(() => {
    for (const v of viewers.current) v.frame()
  }, [])

  // Keys that survive a screen recording: 1-8 modes, arrows step tests,
  // S sync, R reset, Space spin.
  const testCount = manifest?.tests.length ?? 0
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null
      // SELECT is in here because the dropdown handles arrows natively; without
      // this the test would advance twice on one keypress.
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable))
        return
      const n = Number(ev.key)
      if (n >= 1 && n <= ALL_MODES.length) {
        setMode(ALL_MODES[n - 1].id)
      } else if (ev.key === 'ArrowLeft' && testCount) {
        setTestIndex(i => (i - 1 + testCount) % testCount)
      } else if (ev.key === 'ArrowRight' && testCount) {
        setTestIndex(i => (i + 1) % testCount)
      } else if (ev.key === 'i' || ev.key === 'I') {
        setShowInput(v => !v)
      } else if (ev.key === 's' || ev.key === 'S') {
        setSync(v => !v)
      } else if (ev.key === 'r' || ev.key === 'R') {
        resetCameras()
      } else if (ev.code === 'Space') {
        ev.preventDefault()
        setSpin(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [resetCameras, setMode, testCount])

  // Every mode stays available on every test — a low-poly export that ships
  // textures anyway (Tripo does) is exactly the kind of thing worth showing.
  // The per-test `defaultMode` is what keeps low-poly opening on the wireframe.
  const modes = ALL_MODES

  if (loadError) {
    return (
      <div className="c3d-boot c3d-boot-error">
        <strong>无法读取对比清单</strong>
        <code>{manifestUrl}</code>
        <span>{loadError}</span>
      </div>
    )
  }
  if (!manifest || !test) {
    return (
      <div className="c3d-boot">
        <div className="c3d-spinner" />
      </div>
    )
  }

  return (
    <div className="c3d">
      {/* Everything sits in a centred column with side gutters — full-bleed panes
          are wider than the area the user actually shows on camera. */}
      <div className="c3d-inner">
      <div className="c3d-bar">
        {/* A dropdown, not a tab strip: past a handful of tests the strip wraps
            onto a second row and pushes the panes down mid-recording. The
            arrows are here so tests can be stepped on camera without opening
            the list at all. */}
        <div className="c3d-tests">
          <button
            className="c3d-step"
            onClick={() => setTestIndex(i => (i - 1 + manifest.tests.length) % manifest.tests.length)}
            title="上一个测试（←）"
            aria-label="上一个测试"
          >
            ‹
          </button>
          <select
            className="c3d-select"
            value={testIndex}
            onChange={e => setTestIndex(Number(e.target.value))}
            title={test.note ?? test.name}
            aria-label="测试"
          >
            {manifest.tests.map((t, i) => (
              <option key={t.id} value={i}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            className="c3d-step"
            onClick={() => setTestIndex(i => (i + 1) % manifest.tests.length)}
            title="下一个测试（→）"
            aria-label="下一个测试"
          >
            ›
          </button>
          <span className="c3d-count">
            {testIndex + 1}/{manifest.tests.length}
          </span>
        </div>

        <div className="c3d-modes" role="group" aria-label="着色模式">
          {modes.map((m, i) => (
            <button
              key={m.id}
              className={`c3d-mode${mode === m.id ? ' active' : ''}`}
              onClick={() => setMode(m.id)}
              title={`${m.hint}  ·  ${i + 1}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="c3d-tools">
          <button
            className={`c3d-toggle${sync ? ' on' : ''}`}
            onClick={() => setSync(v => !v)}
            title="锁定两侧相机同步（S）"
          >
            同步
          </button>
          <button
            className={`c3d-toggle${spin ? ' on' : ''}`}
            onClick={() => setSpin(v => !v)}
            title="两个模型自动旋转（空格）"
          >
            旋转
          </button>
          <button className="c3d-toggle" onClick={resetCameras} title="重新取景两个模型（R）">
            重置
          </button>
          {test?.input && (
            <button
              className={`c3d-toggle${showInput ? ' on' : ''}`}
              onClick={() => setShowInput(v => !v)}
              title="显示此测试的生成参考图（I）"
            >
              参考图
            </button>
          )}

        </div>
      </div>

      <div className="c3d-panes">
        {test.models.map(m => (
          <PaneSlot
            key={`${test.id}:${m.file}`}
            url={`${baseUrl}/${m.file}`}
            rotationY={m.rotationY}
            label={m.label}
            alias={m.alias}
            redacted={redacted}
            onToggleReveal={() => setRedact(!redacted)}
            logo={m.logo ? `${baseUrl}/${m.logo}` : undefined}
            sublabel={m.note}
            accent={m.accent}
            mode={mode}
            syncRef={syncRef}
            viewers={viewers}
          />
        ))}
      </div>

        {test.input && showInput && (
          <div className="c3d-input" onClick={() => setShowInput(false)} role="presentation">
            <img src={`${baseUrl}/${test.input}`} alt={`${test.name} 的参考图`} />
            <span className="c3d-input-cap">参考图 — 点击或按 I 关闭</span>
          </div>
        )}

      </div>
    </div>
  )
}

/** Thin wrapper so a pane can deregister the exact viewer instance it added. */
function PaneSlot(props: {
  url: string
  rotationY?: number
  label: string
  alias?: string
  redacted?: boolean
  onToggleReveal?: () => void
  logo?: string
  sublabel?: string
  accent?: string
  mode: ShadingMode
  syncRef: React.MutableRefObject<((from: ModelViewer, s: CameraState) => void) | null>
  viewers: React.MutableRefObject<Set<ModelViewer>>
}) {
  const mine = useRef<ModelViewer | null>(null)
  const register = useCallback(
    (v: ModelViewer | null) => {
      if (v) {
        mine.current = v
        props.viewers.current.add(v)
      } else if (mine.current) {
        props.viewers.current.delete(mine.current)
        mine.current = null
      }
    },
    [props.viewers],
  )
  return (
    <Pane
      url={props.url}
      rotationY={props.rotationY}
      label={props.label}
      alias={props.alias}
      redacted={props.redacted}
      onToggleReveal={props.onToggleReveal}
      logo={props.logo}
      sublabel={props.sublabel}
      accent={props.accent}
      mode={props.mode}
      syncRef={props.syncRef}
      registerViewer={register}
    />
  )
}
