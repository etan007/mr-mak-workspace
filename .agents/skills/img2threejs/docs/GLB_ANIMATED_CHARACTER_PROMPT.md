# GLB 动画角色提示词

> **检查清单权威说明（extract-animated-character，2026-09-03）：** `animated-character`
> profile 由已安装的 **plugin-character**（`img2 add img2threejs/plugin-character`）提供；
> 其 `domain.json` 掌管绑定步骤顺序，并调用插件的 `tools/` 移植版本。下文的
> `forge/stage5_rig/...` 命令仍可作为输出器所用的基础库运行，但检查清单运行的是插件中的副本——二者不一致时，以插件为准。

一份可直接复制粘贴的提示词，把主体从 GLB 参考一路带到**已绑定、有动画、通过门禁**的程序化 Three.js 角色，适用于 img2threejs 1.5.2 及以后版本。

它是 [`prompts/build.md`](standard-prompts/build.md) 的动画版姊妹篇。那一份止步于静态重建；这一份继续走完 Stage R——绑定、动画和 G1–G10 门禁——并遵循一条静态路线从来不需要的规则：

> **冻结网格之前先修复它。冻结之后，绑定只能新增（ADD）。**

## 为什么要有这份提示词

动画过去会破坏网格，原因是结构性的，而非偶然。

1. **门禁无法触达。** `forge/stage5_rig/` 下的每个模块都可调用，但工作流里从来没有任何地方叫人去调用它们。`next.py` 按检查清单逐项推进，所以不在清单上的门禁永远不会运行——而从不运行的门禁会永远报告干净的结论。`animated-character` profile 把 Stage R 放进了检查清单，于是这些门禁从"可用"变成了"不可跳过"。
2. **绑定是在 GLB 旁边另行编写的，而不是从 GLB 读出来的。** GLB 带有真实的蒙皮和真实的动画片段；它的动画通道指向它自己的节点索引，它的 `skinIndex` 值寻址它自己的关节数组。把任何一个喂给程序化编写的骨架，都会索引到完全不同的骨架，网格因此被撕碎。所以：从 GLB 读取绑定；在必须与程序化骨架共存的地方，建立显式的、经测量的对应关系，而不是假设索引能对上。
3. **没有任何东西证明网格完好。** `validate_rig_payload.py` 只证明结构载荷完整性——按它自己的范围说明，从不涉及姿态压力或相似度。绿色的载荷结果却被当成了"动画是安全的"。`mesh_parity.py` 补上了这一环：绑定前对几何做哈希，绑定后再哈希一次，只要有一个浮点数变了，就会指出是哪个网格、哪个属性、哪个顶点。

两种不同的症状有两种不同的成因，动手排查前值得先分清你看到的是哪一种：

| 你看到的 | 实际是什么 |
|---|---|
| 什么都不动；场景渲染正常 | 绑定没有作用到节点，或者 inverse bind 抵消了错误的姿态——**G1** |
| 部件四散飞开 / 人物被撕碎 | 绑定过程中几何被改写，或关节索引寻址到了另一个骨架——**mesh parity** 和 **correspondence** |

## 使用方法

1. 替换每一个 `<PLACEHOLDER>`。
2. 把整段作为一条提示词粘贴。它按一次完成来编写。
3. 遇到硬停止说明提示词在正常工作。回答它提出的问题，而不是让它继续。

## 提示词

````text
使用 img2threejs 1.5.2，从一个 GLB 参考构建一个已绑定、有动画的程序化 Three.js 角色。

## 输入
- GLB reference:  <ABSOLUTE_PATH_TO_GLB>
- Reference photo (optional): <PATH_OR_NONE>
- Subject name:   <SubjectName>
- Demo id:        <subject-id>
- Showcase root:  <PATH_TO_img2threejs-showcase>
- Real longest dimension: <e.g. 1.70 m>   # 用于检查尺度是否合理；绝不用来缩放

## 硬性契约——不得违反

1. **GLB 是测量仪器，绝不是资产。** 把它软链接到 `public/mesh/`
   （已 gitignore）。运行中的 demo 不得获取任何 `.glb`/`.bin`。它的拓扑和纹理只用于测量，绝不复制进工厂。
2. **绑定和动画都从 GLB 引用（REFERENCED FROM THE GLB）。** 骨架、蒙皮关节顺序、inverse bind
   矩阵和动画片段都来自 `forge/stage5_rig/glb_rig_reference.py`，而不是凭空编造。以蒙皮的关节顺序为准——绝不用遍历顺序，绝不用节点名称。
3. **冻结前修复；冻结后只能新增（ADD）。** 如果网格有损坏，在 `mesh-repair` 步骤修复，并说明修了什么。然后冻结。从那一刻起，顶点位置、法线、uv 和索引都是证据：绑定只能新增 `skeleton`、`skinIndex` 和 `skinWeight`，别的都不行。`mesh_parity.py verify` 必须通过。如果失败，说明绑定有错——绝不能为了让它通过而重新冻结。
4. **每一步都过状态门禁。** 开始时、恢复时以及每次修正之前运行 `python3 forge/next.py --state .img2threejs/state.json`。退出码 3 / `status=stopped` 是硬停止：报告并提问，绝不凭记忆继续。
5. **绝不根据名称给节点贴标签。** 基线资产把节点命名为 `root.0..root.N`，绑定把关节命名为 `node_17`。标签来自测得的世界空间包围盒；关节对应关系来自测得的位置。把每个标签都视为 `hypothesis-requires-render-confirmation`。
6. **未评估的门禁不算通过。** 如果某个门禁缺少输入，就生成该输入，或者把该门禁报告为未评估并说明原因。绝不因为门禁没运行就把它记为绿色。
7. **"有改善"时绝不宣称"完成"。** 指出哪些地方仍不匹配。

## 流程

### Stage 0——采集，使用 animated profile
```
python3 forge/state.py init --state .img2threejs/state.json --reference <glb> \
  --profile animated-character --spec object-sculpt-spec.json
python3 forge/stage1_intake/probe_glb.py <glb> --out glb-probe.json
python3 forge/stage1_intake/label_glb_nodes.py <glb> --out nodes.json --min-confidence 0.6
```
正是 `--profile animated-character` 把 Stage R 放进了检查清单。若用 `character`，绑定门禁不存在，构建会在从未运行它们的情况下完成。

在做任何事之前，先读 `glb-probe.json` 中的 `skinCount` 和 `animationCount`。`skinCount > 1` 表示你必须显式选择一个蒙皮并说明理由。`animationCount: 0` 表示走 Stage R4 编写，而不是 R3 识别——这是另一条路线，门禁也不同。

### Stages 1–3——重建
几何路线按 `docs/standard-prompts/build.md` 执行（cross-section loft；只在 loft 覆盖不到的地方用隐式曲面；TypeScript 编码；任何编码之前先跑 `verify_cells.mjs`）。这里对它没有任何改动。静态模型能渲染且其门禁全绿后再回来。

### Stage R——绑定与动画

先完整阅读 `grimoire/readiness/animation_contract.md` 和
`docs/pipelines/character-rigging-animation-1.5.2.md`。两份都很短，其中每条规则都可追溯到一次测得的失败。

**R-1. 从 GLB 读取绑定。**
```
python3 forge/stage5_rig/glb_rig_reference.py <glb> --out glb-rig.json
```
报告 `deformVsTechnical`：动画片段经常指向并非关节的技术节点，把它们建成骨骼会破坏骨架的索引空间。如果程序化骨架必须与 GLB 的骨架共存，建立对应关系并读取 `usable`——任一侧有未匹配的关节，就意味着不能用于重定向，而编造映射正是撕碎网格的原因。

**R-2. 修复，然后冻结。**
现在就检查网格并修复损坏之处。然后：
```
node runtime/scripts/export_mesh_buffers.mjs --url <preview> --out meshes.json
python3 forge/stage5_rig/mesh_parity.py freeze meshes.json --out mesh-manifest.json
```
此后的一切都以该 manifest 为基准测量。

**R-3. 绑定——只做加法。**
```
python3 forge/stage5_rig/validate_rig_payload.py <spec>
```
然后绑定。三条规则，每一条都曾导致过真实的失败：
- `mesh.bind(skeleton, new THREE.Matrix4())`——始终使用单位矩阵，采用 attached 绑定模式。attached 模式每帧从 `matrixWorld` 重新计算 `bindMatrixInverse`，所以 `matrixWorld` 会被完全抵消。用 armature 的矩阵绑定时渲染出一帧空白；把 armature 的平移加到显示偏移上，人物恰好被移动了这段平移。
- 显示偏移**只**来自网格包围盒：`(−centre.x, −min.y, −centre.z)`。
- 在 `new THREE.Skeleton(...)` 之前调用 `updateMatrixWorld(true)`。`calculateInverses()` 读取每根骨骼当前的世界矩阵；若先构造骨架，它捕获到的是单位矩阵，静止姿态永远不会被抵消，每个顶点都会被其骨骼的偏移量推开。这种失败能编译、能绑定、报告 `bound: true`，渲染出来却是一具尸体。

**R-4. 证明网格完好。**
```
node runtime/scripts/export_mesh_buffers.mjs --url <preview> --out meshes-after.json
python3 forge/stage5_rig/mesh_parity.py verify mesh-manifest.json meshes-after.json
```
出现 `skinIndex`/`skinWeight` 是预期的，会被报告为合法新增。位置、法线、uv 或索引有任何变化都是失败，并会指出网格和第一个不同的顶点。

用 `export_mesh_buffers.mjs`，不要用 `export_mesh_geometry.mjs`。后者把每个顶点乘以 `matrixWorld`——对自相交检测是对的，在这里则两个方向都错：摆姿态会改变 `matrixWorld` 而不触碰 buffer，因此正确绑定的网格会被报告为已改变；而被补偿变换抵消掉的真实 buffer 修改会被报告为未改变。

**R-5. 测量动画片段；绝不靠猜来命名。**
```
python3 forge/stage5_rig/glb_rig_reference.py <glb> --sample-clips --landmarks landmarks.json \
  --out sampled-clips.json
python3 forge/stage5_rig/clip_features.py sampled-clips.json
```
源动画片段以 `NlaTrack.001` 这样的名字进来，不携带任何信息。根据测量重新命名，并记录名字依据的是哪项测量。描述运动的名字是可证明的；暗示意图的名字则不是——没有任何运动学特征能区分一次出击和一次踉跄，所以这类名字要带 `inferred: true`。是否循环由 `poseReturn` 决定，绝不由位移决定：四处移动后又回到原处的动画片段是循环的，而停在半步、相差一厘米的则不是。

`scaleDelta ≠ 0` 是绊线，不是描述符。在其他任何事继续之前先把它暴露出来。

**R-6. 门禁。**
```
python3 forge/stage5_rig/rig_gates.py rig-gate-payload.json
```
G1 是捕获"静默死亡"的那个：把每个动画片段 seek 到五个时间点，将每个节点的实际变换与 `track.createInterpolant().evaluate(t)` 比较，要求 `maxSampledBindingDelta ≤ 2⁻²³`。它是唯一能区分"会播放的动画片段"和"存在、能加载、持有 action、报告时长却什么都不驱动的动画片段"的检查。覆盖不足是失败，不是通过：只对一个动画片段采样一次的 harness 不构成证据。

G10 是视觉门禁，需要真正的扫描。五个姿态不算覆盖——真正发现缺陷的扫描是 11 个动画片段 × 4 个时间点 × 2 侧 × 2 个方位角 = 176 帧。把破洞和褶皱报告为两个数字；单一的合并分数会掩盖 Stage R2 在二者之间此消彼长的事实。

### Stage 8——证明没有获取任何东西，然后亲眼看
把二进制目录移开，重新构建，重新渲染。仍能出现的渲染就是证明。
```
npx tsc --noEmit && npx vite build
```
然后真正观看动画，在 0°、40° 和一个掠射角度下。指标会掩盖结构性失败。渲染与指标不一致时，以渲染为准。

## 报告格式
每个阶段：**测得**了什么（数字以及打印它的命令），据此**决定**了什么，还有什么**未验证**。最后列出：
- 每个门禁及其状态，`unevaluated` 列为未评估，绝不列为通过；
- mesh-parity 结论，以及冻结前修复了什么；
- 哪些动画片段是按测量命名的，哪些带 `inferred: true`；
- 逐区域置信度，以及哪些地方仍与参考不匹配。

"无法在不破坏网格的前提下从这个参考为该绑定制作动画"是一个有效结果。直接说出来，而不是交付一个被撕碎的人物。
````

## 每条规则的来源

| 提示词中的规则 | 它防止什么 |
|---|---|
| `--profile animated-character` | Stage R 门禁存在但没有任何东西调用它们；从不运行的门禁会永远报告干净 |
| 从 GLB 读取绑定 | GLB 动画片段指向 GLB 节点索引；喂给程序化骨架时会索引到另一个绑定并撕碎网格 |
| 按测得位置建立对应关系 | 关节名是 `node_17`；按名称匹配的对应关系会自信地出错 |
| 冻结前修复 | 冻结一个已损坏的网格等于为损坏背书，而不是捕获它 |
| 绑定前冻结 | 先绑定就没有可比较的基准 |
| 绑定后验证 parity | 绑定是唯一能证伪"实现没有碰网格"的时刻 |
| attached 模式下用单位矩阵绑定 | 用 `armature.matrixWorld` 绑定渲染出一帧空白；`skinSpace` 包装器得到半身高、悬浮的人物 |
| 在 `Skeleton` 之前 `updateMatrixWorld` | inverse bind 捕获到单位矩阵，静止姿态永远不会被抵消，渲染出一具尸体却报告 `bound: true` |
| 由 `poseReturn` 判断循环 | 基于位移的规则与它自己的数据矛盾：`idle-gesture` 位移 0.121H 却能正确循环 |
| G1 覆盖计数 | 只对一个动画片段在一个时间点报告微小差值的 harness 不构成证据 |
| 176 帧扫描 | 五个姿态漏掉了真实扫描在 28 帧中就发现的缺陷 |

## 相关文档

- [`docs/pipelines/character-rigging-animation-1.5.2.md`](pipelines/character-rigging-animation-1.5.2.md)——推导过程和失败日志。
- [`grimoire/readiness/animation_contract.md`](../grimoire/readiness/animation_contract.md)——Stage R 阶段读取的路由文件。
- [`forge/stage5_rig/CONTRACT_1.5.2.md`](../forge/stage5_rig/CONTRACT_1.5.2.md)——模块地图和载荷结构。
- [`docs/standard-prompts/build.md`](standard-prompts/build.md)——本提示词所延续的静态重建路线。
- [`docs/standard-prompts/glb-force-measured.md`](standard-prompts/glb-force-measured.md)——当 GLB 测得的每个参数都应被强制使用而不是近似时。
