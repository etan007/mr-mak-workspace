# Python ↔ Three.js 渲染桥技能

当 Python 参与渲染、检查或批量截取程序化 Three.js 角色时（包括显式的经由 GLB 的参考路线），
使用本技能。

## 约定

Python 是确定性的控制器和证据生成者。浏览器托管的 Three.js 运行时是渲染的权威来源。Python 图像、
Blender 图像、notebook 预览或 GLB 导出，都不能替代目标 Three.js 路由的截图。

## 路由选择

1. 已有 Chrome DevTools MCP 可用：优先用它做运行时截取。
2. 项目已有 Playwright 依赖，或用户明确许可：把 Playwright 作为跨浏览器/无头模式的后备方案。
3. BlenderProc 或 Blender Python：仅用于可选的参考 pass、合成数据、预处理，或用户明确要求的外部
   资源路线。
4. pythreejs：用于 notebook 端的参数探索；除非目标本身就是 pythreejs 应用，否则绝不把它当作最终的
   保真度门禁。

## 经由 GLB 的参考路线

当用户提供一个由图像生成的 GLB 时，该 GLB 是中间参考网格，而不是程序化输出。要求的顺序是：

```text
image (optional provenance)
        -> user/adapter-produced GLB
        -> probe_glb.py + hash/provenance
        -> render the GLB through the target Three.js browser route
        -> reference baseline captures
        -> derive a procedural ObjectSculptSpec
        -> generate TypeScript geometry/material/rig
        -> render the procedural route with the same camera batch
        -> compare procedural captures against GLB baseline captures
```

用以下命令初始化该路线：

```bash
python3 forge/stage1_intake/probe_glb.py /path/to/reference.glb
python3 forge/stage4_review/render_bridge.py init \
  --reference-glb /path/to/reference.glb \
  --reference-browser-url /references/reference.glb \
  --runtime-url http://127.0.0.1:5173/#/character-demo \
  --out work/character/render-manifest.json

python3 scripts/capture_threejs_playwright.py \
  --manifest work/character/render-manifest.json --mode reference
```

浏览器路由必须暴露一个显式的参考模式：用 `GLTFLoader` 加载本地 GLB，应用同一套渲染器/相机/光照
约定，并截取 GLB 基线。可选的 Playwright 适配器使用 `setReferenceMode({kind: "glb", url})`，并按
`render_bridge.py record-reference` 的语义记录这些图像。Chrome DevTools MCP 集成必须提供同样的模式
切换，并写入同样的 manifest 字段。只有这样，`render_bridge.py diagnose` 才能把程序化主视图与基线
进行对比。

这条路线衡量的是与中间 GLB 的一致程度。如果没有保留原始图像，它并不能证明与生成该 GLB 的图像一致；
被遮挡的几何、材质以及生成伪影都必须记录为置信度/近似说明。

## 截取不变量

每一批都必须保留：

```text
reference hash + reference kind + runtime URL + viewport/DPR + camera transform + renderer settings
  + ready evidence + screenshot hash + diagnostics + visual decision
```

接受某次渲染之前，用支持图像的工具重新打开已保存的截图。拒绝只有背景、被裁切、过期、无法读取或
尺寸不正确的文件。当主体约定要求六个全身角度时，头部特写不计入这六个：截取固定视角、`±35°`、
侧面、后四分之三和后方全身视角，然后单独截取头部视角。

默认 manifest 以 `azimuthDegrees`、`elevationDegrees` 和 `target` 存储环绕相机。对于成对的
GLB/模型证据，还要显式指定共享的 `distance` 和 `fovDegrees`；若根据各自主体的自动取景独立推导距离，
即使方位角一致也会得到不同的相机。`near` 和 `far` 也视为共享的相机字段。禁止只对参考端覆盖相机：
同一份截取记录是两条路线共同的权威来源。

## 经由 GLB 的 v2 pass

向 `render_bridge.py init` 传入 `--render-profile docs/specs/render-profile.v2.example.json`，即可
选择启用 v2 保真度轨道。该 profile 只校验一次并将哈希写入 manifest；GLB 参考模式和程序化模式都必须
使用它。用以下命令记录每个由浏览器生成的 pass：

```bash
python3 forge/stage4_review/render_bridge.py record-pass \
  --manifest work/character/render-manifest.json \
  --capture-id hero --pass-id semantic-id --image work/character/hero/semantic-id.png
```

GLB 基线 pass 需加上 `--reference`。必需的 pass ID 为 `beauty`、`alpha-silhouette`、`semantic-id`、
`depth`、`normal` 和 `roughness-material-id`。所有成对 pass 都齐备后，运行：

```bash
python3 forge/stage4_review/compare_region_passes.py \
  --manifest work/character/render-manifest.json --capture-id hero \
  --out work/character/hero-pass-comparison.json
```

当缺少 semantic-ID pass 或区域颜色时，该对比会阻止逐区域的结论。它是一项确定性诊断，而不是 AI
相似度评分。

另见：`integrations/glb_character_pipeline/`，一条可选启用、以 GLB 为基线的重建流水线
（SDF 点云 splat + Surface Nets），它生成程序化的 TypeScript/three.js 角色，供本渲染桥从中截取
pass——与本文档自身的 manifest/pass 记录约定相互独立。

## 失败路由

- 无浏览器/MCP：`request-input`，并请求安装/认证；
- 运行时未就绪或有控制台错误：`refine-code`/修复运行时；
- 特写只有背景：修正 near/far、target、稳定帧数，然后重新截取；
- 环绕视角退化：`refine-code` 修几何，而不是调材质；
- 诊断通过但语义身份不符：`refine-code` 并列出失败的特征；
- 反复进入平台期：`refine-spec`，或 `request-input` 请求更多视角；
- 没有可读的头部/侧面证据时，绝不报告高于 9 的置信度。

## 最小 manifest 字段

`schemaVersion`、`reference.kind`、`reference.path`、`reference.sha256`、`runtime.url`、`runtime.viewport`、
`runtime.devicePixelRatio`、`runtime.renderer`、`captures[]`、每次截取的相机变换、`readySignal`、
截图路径/哈希、诊断文件路径，以及最终决定。

## 可执行的 alpha 路径

1.5-alpha 分支包含一个无依赖的 manifest 控制器和一个可选的 Playwright 适配器。在仓库根目录执行：

```bash
python3 forge/stage4_review/render_bridge.py init \
  --reference /path/to/reference.png \
  --runtime-url http://127.0.0.1:5173/#/character-demo \
  --out work/character/render-manifest.json

# 使用 Chrome DevTools MCP 或可选适配器生成实际的浏览器 PNG。
python3 scripts/capture_threejs_playwright.py \
  --manifest work/character/render-manifest.json

python3 forge/stage4_review/render_bridge.py validate \
  --manifest work/character/render-manifest.json --require-complete

python3 forge/stage4_review/render_bridge.py diagnose \
  --manifest work/character/render-manifest.json \
  --out work/character/diagnostics.json
```

Playwright 适配器有意设为可选。仅在需要时于标准库核心之外安装：`python3 -m pip install playwright`，
然后 `playwright install chromium`。目标路由必须暴露下面这个小型浏览器端约定：

```js
window.__IMG2THREEJS_READY__ = true;
window.__IMG2THREEJS_CAPTURE__ = {
  async setCamera({ azimuthDegrees, elevationDegrees, target, distance, fovDegrees, near, far }) {
    // 将相机和控制器应用到真实的 Three.js 场景，然后 resolve。
  },
  async capturePass({ passId, mode }) {
    // 选择 beauty/诊断渲染目标，等待稳定，并返回 { ok: true, selector: 'canvas' }。
  },
};
```

如果就绪信号、截取约定、canvas、截图或哈希检查任一失败，适配器即停止。它不会回退到 Python/Blender
图像，也不会声称发生了渲染。

对于异步加载的多部件 GLB，应立即安装截取 API，但只有在路由的 `ready` promise resolve 之后，才枚举其
网格并分配匿名 ID 材质。若就绪后的网格数量与探测得到的约定不一致，截取必须失败。否则，在渲染桥安装时
枚举到一个空组，就可能得到一张看似合理的 beauty 图像和空的 semantic-ID pass。匿名对象 ID 只能证明
物理边界；通用的 `model.*` 名称绝不会变成服装或解剖部位标签。

## 禁止的捷径

- 实际渲染的是 Blender 时，不要用 Python 声称渲染了 Three.js。
- 不要把 GLB/VRM 的拓扑、顶点或导入的材质复制到纯代码工厂函数中。
- 不要把程序化截图直接与未经渲染的 GLB 对比；GLB 必须先通过同一个 Three.js 运行时生成一张新的
  基线截图。
- 不要把环绕视角图像与从未提供过的参考角度进行对比。
- 不要从 TypeScript 编译通过、`__READY__` 或内联预览推断视觉成功。
- 未经明确授权范围，不要向零安装核心添加 Playwright/Chromium 依赖。
