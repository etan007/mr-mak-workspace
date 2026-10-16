# 参考图保真工具

本集成层在不改变核心约定的前提下加强图像匹配：输出仍然是程序化、可评审的 Three.js 代码。
外部工具可以产出证据和诊断信息；但不得静默提供网格、决定被遮挡的几何、修改已接受的源码，
也不得批准一轮通过。

## 默认路由

| 需求 | 主要工具 | 输出 | 权限边界 |
| --- | --- | --- | --- |
| 浏览器渲染、控制台、网络与性能追踪 | Chrome DevTools MCP | 截图、trace、控制台/网络证据 | diagnostic only（仅用于诊断） |
| Three.js 场景/材质/渲染器检查 | threejs-devtools MCP | 场景树、材质/贴图状态、渲染器指标 | 只读发现，反映到代码之前不生效 |
| 跨浏览器复现 | Playwright MCP | Chrome/Firefox/WebKit 截图与 trace | 兜底手段；不要重复默认的 Chrome 循环 |
| 区分版本的 Three.js 文档 | Context7 | 带引用、特定版本的 API 上下文 | 本地安装的 Three.js 与 typecheck 仍是权威 |
| 细薄/复杂的前景或部件遮罩 | SAM2 adapter | 二值 PNG 遮罩 + 来源 JSON | 由代理确认目标主体/部件 |
| 角色面部或身体证据 | MediaPipe adapter | 归一化关键点 JSON | 需要解剖/spec 评审 |
| 微弱的前后深度线索 | Depth Anything V2 adapter | 16 位相对深度 PNG + 来源 JSON | relative prior only（仅作相对先验），绝不作为度量尺寸或被遮挡几何 |

## Codex MCP 配置

预期的用户级服务器均已锁定版本：

```text
chrome-devtools  chrome-devtools-mcp@1.6.0
threejs-devtools threejs-devtools-mcp@0.4.1
playwright          @playwright/mcp@0.0.78 (Chromium)
playwright-firefox  @playwright/mcp@0.0.78
playwright-webkit   @playwright/mcp@0.0.78
context7         @upstash/context7-mcp@3.2.5
```

参考循环中，使用隔离的 headless Chrome DevTools 配置，并关闭使用统计和 CrUX URL 查询。
除非参考约定指定了其他尺寸，否则使用 1600x900 视口。仓库自带的截图工具仍是证据的产出方；
MCP 截图仅用于诊断或作为宿主兜底。

三条 Playwright 路由使用隔离的 headless 1600x900 配置，并阻止 service worker。
默认复现使用 Chromium，只有在验证跨浏览器差异时才调用 Firefox/WebKit 服务器。

### Chrome DevTools MCP

在渲染和优化阶段使用：

1. 导航到准确的本地预览 URL。
2. 等待 `window.__IMG2THREEJS_READY__ === true`。
3. 确认贴图/资源已就绪，收集控制台/网络错误。
4. 禁用控制器，设置指定的评审相机。
5. 按参考视口截取 PNG。
6. 读取 `window.__IMG2THREEJS_VIEWER__.renderer.info`，记录 draw call、三角形、
   几何体、贴图和着色程序数量。
7. 只有在视觉检查通过后才运行性能追踪。

Never accept an MCP-only scene edit（绝不接受仅在 MCP 中做的场景修改）。把验证过的参数改动复制到
spec 或生成的 TypeScript 中，重新构建并重新截图。

### threejs-devtools MCP

先用只读工具：场景树、对象/几何体详情、材质与贴图详情、相机、渲染器信息、性能快照和内存诊断。
修改类工具只用于草稿实验。变换、材质、灯光、相机或渲染器设置的改动，在源码/spec 包含它
且确定性截图循环能复现之前，都不算数。

### Playwright MCP

常规 Chromium 兜底使用 `playwright` 服务器。已经失败的用例再用 `playwright-firefox` 或
`playwright-webkit` 复现；不要在每轮细化中都跑三个浏览器。跨浏览器截图用于诊断运行时可移植性，
不能替代指定相机的保真门禁。

### Context7

明确询问已安装的 Three.js 版本。目前由配套 showcase 控制运行时版本；其 `package-lock.json`、
本地 `.d.ts`、typecheck 和运行时冒烟测试优先于在线文档。没有明确的版本迁移时，
不得把 WebGPU/TSL 的建议用于 WebGL/r169 路径。

## 本地视觉环境

安装：

```bash
uv sync --project integrations/vision --python 3.11
python3 forge/stage1_intake/run_vision_adapter.py prefetch
python3 forge/stage1_intake/run_vision_adapter.py health
```

### SAM2 部件遮罩

在可见主体或部件内部取一个正向点：

```bash
python3 forge/stage1_intake/run_vision_adapter.py \
  segment reference.png --point 512 320 --out evidence/body-mask.png
```

记录前先检查 PNG。把 JSON 附属文件作为证据记录保存。对身体、翅膀、刀刃、手柄、头发或面部等
身份系统分别使用独立遮罩；不要把一张全局前景遮罩当作部件拆分。

### Depth Anything V2

```bash
python3 forge/stage1_intake/run_vision_adapter.py \
  depth reference.png --out evidence/relative-depth.png
```

用结果提出前后顺序、厚度候选和相机假设。不要把它的数值当作度量尺寸，也不要臆造看不见的背面。

### MediaPipe

```bash
python3 forge/stage1_intake/run_vision_adapter.py \
  landmarks face reference.png --out evidence/face-landmarks.json

python3 forge/stage1_intake/run_vision_adapter.py \
  landmarks pose reference.png --out evidence/pose-landmarks.json
```

将已接受的关键点归一化并映射到 `preSpecAssessment.anatomy`；在证据引用中保留源图和模型哈希。
在 macOS 上，即使推理委托为 CPU，MediaPipe Tasks 也会创建 Metal 图形上下文，因此受限/headless
沙箱必须授予图形访问权限。

## 在循环中的位置

```text
reference admission
  -> optional SAM2 / MediaPipe / relative-depth evidence
  -> pre-spec assessment and local spec search
  -> camera solve, de-light and projection bake
  -> strict ObjectSculptSpec
  -> pass-gated Three.js generation
  -> deterministic repository capture
  -> MCP diagnosis when needed
  -> Divine Eye + feature microscope
  -> refine-spec / refine-code / request-input / continue
  -> performance trace after fidelity acceptance
```

参考视角与有意义的环绕视角仍是彼此独立的门禁。投影能让参考相机下的结果非常接近，但不能替代
厚度、连接关系、部件覆盖或多角度的 3D 真实性。
