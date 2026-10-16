# 标准角色流水线契约——1.5 beta + 1.5 alpha

Beta 负责带质量门禁的雕塑/构建/评审流水线。Alpha 负责 Python manifest、浏览器截取证据，以及
UniRig 形态的绑定 payload 边界。外部的神经网络/GLB/VRM 系统是适配器，绝不是静默的替代品。

## 路线选择

```text
code-only:
  reference → spec → procedural TypeScript factory → authored/validated rig → Three.js

external-asset (opt-in):
  reference → CharacterGen/Tripo/etc. → GLB/VRM → UniRig/adapter → Three.js

glb-mediated-reference (opt-in, new):
  image (optional) → user/adapter-produced GLB → GLB probe → Three.js GLB baseline
  → procedural TypeScript factory → same Three.js camera batch → comparison
```

外部路线可用于证明角色生成能力，但其产物不得被报告为程序化工厂。GLB 中介路线只把导入的 GLB
用作结构参考和浏览器渲染的基线；它仍会另外生成一个程序化 TypeScript 工厂。两条路线共享相同的
浏览器截取、诊断和参考循环门禁。

## 必需产物

| 产物 | 负责方 | 必需内容 |
| --- | --- | --- |
| `reference-set.json` | intake | 采纳的视角、路径、哈希、尺寸、相机角色、隐藏区域置信度 |
| `glb-reference.json` | GLB intake | GLB 哈希、场景/网格/材质/蒙皮清单、包围盒、警告、来源 |
| `assessment.json` | intake/spec | 角色分类、复杂度、解剖结构、关键点、本地证据引用 |
| `character-sculpt-spec.json` | spec | 层级、拓扑类别、材质、特征目标、相机和质量契约 |
| `rig-payload.json` | rig | Y 轴向上/右手坐标、关节、父级、名称、局部矩阵、打包的蒙皮权重 |
| `render-manifest.json` | alpha bridge | 运行时 URL、视口/DPR、相机批次、参考/输出哈希、就绪证据 |
| `comparison-sheet.png` | review | 固定参考图与当前浏览器渲染并排 |
| `diagnose-render.json` | review | tier-1 和多角度确定性诊断，以及下一步动作 |

对于 GLB 中介参考，`render-manifest.json` 还会存储 `reference.kind` 为 `glb`，以及程序化批次中
每个相机对应的浏览器渲染基线截图。原始 GLB 绝不会被当作图像送入像素对比。

对于 1.5 alpha 的 GLB 中介 v2 路线，manifest 可声明 `fidelityTrack: "glb-mediated-v2"`，外加一个
经过校验、由两条路线共享的 `renderProfile`。此时每条相机记录拥有六个成对的浏览器 pass：`beauty`、
`alpha-silhouette`、`semantic-id`、`depth`、`normal` 和 `roughness-material-id`。在 semantic-ID
pass 可读且已声明区域颜色之前，分区域评分被阻断。合并为单一节点的 GLB 记为语义信息不足；区域
生长或曲率划分只是假设，不是标签。

## 角色场景契约

- 根节点是一个具名 `THREE.Group`，带有 `root.userData.sculptRuntime`。
- 每个决定身份的部件都有稳定的名称、材质 ID，以及可选的锚点/socket。
- 身体、头部、头发、服装、护甲、武器和配饰是彼此独立的语义模块。
- 面部几何尽可能是一个连续的头/脸体积。眼、鼻、嘴应使用受控的表面/颜色/材质区域，或由关键点
  推导出的挂接形体；避免随意悬空的基本体。
- 风格化头发使用一个整体发量加上带方向的发块，并检查根/梢、侧面/背面覆盖和重叠。平面广告牌
  （billboard）不是可接受的角色头发方案。

## 坐标、单位与绑定契约

- 内部程序化 payload 为 Y 轴向上、右手坐标系，且数值有限。
- 根关节索引为 `0`，`parent = null`；之后每个父级索引都小于子级索引。BFS/DFS 是制作时的选择，
  不是运行时不变量。
- WebGL 蒙皮每个顶点使用四个打包的影响槽位，权重为有限、非负且归一化为一。校验器会报告没有
  有效权重的关节。
- 导出外部 VRM 时，转换为米单位、右手 Y 轴向上、模型朝向 `-Z`、humanoid 映射和 T-pose。记录
  转换过程，而不是把它藏在加载器代码里。
- 结构性绑定校验不等于形变证明。中性、肩、肘、腕、膝、脚和配饰的压力姿势仍需要运行时证据。

## 浏览器截取契约

目标 showcase 路由必须暴露：

```js
window.__IMG2THREEJS_READY__ = true;
window.__IMG2THREEJS_CAPTURE__ = {
  setCamera(cameraSpec) { /* 应用相机、目标点、near/far、曝光 */ },
  setReferenceMode({ kind, url }) { /* 加载 GLB 参考并切换可见对象 */ },
  capturePass({ passId, mode }) { /* 选择 pass，并在像素就绪时 resolve */ }
};
```

对于 GLB 中介运行，路由还必须提供显式的参考模式，例如 `#/character-demo?reference=glb`，用
`GLTFLoader` 加载本地 GLB。截取 manifest 记录每张 PNG 是 `reference` 基线还是 `procedural` 渲染。
两者必须使用相同的相机、视口、DPR、色调映射、曝光和背景。
对于 v2，`capturePass` 必须返回 `{ok: true, selector?: "canvas"}` 或类似的目标选择器，以便适配器
保存实际的 pass canvas，而不是周围的 UI。

截取适配器等待就绪，拒绝致命的控制台错误和零尺寸 canvas，设置相机，等待帧稳定，把 PNG 保存在
工作区内，用支持图像的读取器重新打开它们，并在 manifest 中记录哈希。Python 绝不渲染替代场景。

对于成对的 GLB/模型批次，每条截取记录拥有一份由两条路线共享的完整相机规格：方位角、仰角、
目标点、距离、FOV、near 和 far。不要分别对 GLB 和程序化模型自动取景。若 GLB 异步加载，在就绪后
枚举其多部件网格并构建诊断用 ID 材质，然后将实际数量与 intake 探测结果比对。

## 必需的角色截取批次

```text
hero/reference-match
orbit +35°
orbit -35°
profile 90°
rear three-quarter 135°
rear 180°
head hero
head three-quarter
```

这是六个全身角度加两个头部对照视角。当重建契约要求六个完整角色视角时，头部裁切不能替代缺失的
全身方位角。

只有固定视角会与提供的参考图做像素/特征对齐。环绕视角用于评判体积、挂接、背面覆盖、头发连续性、
形变以及形体是否退化。

## 验收顺序

1. 参考图采纳以及图像/GLB 回读；
2. 对 GLB 中介运行，GLB 探测加上新鲜的浏览器基线截图；
3. 角色 spec 及严格质量校验；
4. 粗模轮廓与比例锁定；
5. 面部关键点与统一的头部体积；
6. 头发/服装/材质模块；
7. 绑定 payload 校验和运行时姿势压力测试；
8. 浏览器就绪与新鲜的截图批次；
9. tier-1 诊断、并排对比图以及语义/逐特征评审；
10. 多角度/挂接/自相交门禁；
11. 恰好一个下一步动作：`continue`、`refine-spec`、`refine-code`、`request-input` 或 `stop`。

v2 的修正顺序是每轮循环只改一组：相机、轮廓、面部、服装、配饰、材质，最后是光照。一轮循环中
修改多个组，会使对比结果无法归因。

9/10 以上的置信度是视觉验收目标，不能从测试、生成的代码、GLB 导出或运行时就绪标志中推断得出。

## 迁移对照表

| 领域 | Beta 贡献 | Alpha 贡献 | 合并后的标准 |
| --- | --- | --- | --- |
| intake/spec/build/review | 严格质量、几何/材质与评审门禁 | 角色/绑定研究参考 | beta 门禁仍具权威；alpha 研究成果用于填充 spec 字段 |
| 绑定 | 共享骨架与姿势/形变测试 | UniRig payload schema 与校验器 | 先校验 payload，再运行真实的 Three.js 压力姿势 |
| 渲染 | 浏览器/运行时冒烟测试基础设施 | Python manifest、相机批次、哈希与诊断桥接 | 浏览器负责渲染；Python 负责证据控制 |
| 外部生成 | 可选的资产交接 | CharacterGen/UniRig 研究边界 | 只能通过显式适配器，附带来源记录，且不得声称为纯代码 |
| 视觉验收 | 对比/评审门禁 | 截图回读与多角度 manifest | 所有截图与诊断门禁都是强制的 |
