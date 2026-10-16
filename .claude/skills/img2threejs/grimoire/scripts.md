# 脚本速查表

所有脚本均为纯 Python 3.10+ **标准库**实现——无需 pip install，不用 PIL/numpy，不用
Playwright/Chromium。PNG 读写通过 `struct`/`zlib` 完成。请在技能根目录运行，使路径解析为
`forge/<name>.py`。退出码非零 = 某个门禁失败；阅读打印出的原因。

分工：**脚本负责强制结构和打包证据；脚本从不给视觉效果打分。**
验收分数始终来自代理自身视觉对对比图的检查。

## 输入与证据加固

- PNG 和 baseline 8-bit JPEG 参考图由 stdlib 核心在进程内解码。不受支持的
  progressive/12-bit/CMYK JPEG 必须走显式的外部转换器回退路径；绝不猜测像素。
- `diagnose_render.py` 和 `divine_eye.py` 将过小/反转的前景遮罩以及空并集视为不可用证据。
  重新截取参考图/渲染图，让主体填满画面。
- `vlm_gate.py --samples` 要求一个非空 JSON 列表，且其条目均为对象。`analyze_texture.py`
  要求 `--spec` 与 `--material-id` 同时提供，`--in-place` 需要两者都有。
## state.py 与 next.py

- `state.py init --state .img2threejs/state.json --reference IMG [--profile generic|<installed-domain>]`
  创建本地强制检查清单。拒绝覆盖已有状态。
- `state.py status --state .img2threejs/state.json [--json]` 报告当前步骤和循环上限。
- `state.py mark STEP... --state .img2threejs/state.json --evidence PATH` 记录已完成的证据。
  仅当某一步确实不适用时才使用 `--status skipped --reason "..."`。
- `next.py --state .img2threejs/state.json [spec.json]` 是强制的启动/恢复门禁。它从
  `reviewHistory` 推导修正次数，并在达到单轮或总计硬上限时以退出码 3 退出。

默认每轮最多 3 次 `refine-spec`/`refine-code` 决策，总计 6 次。这些是安全上限，
不是目标；成功、缺陷重复、来回振荡或进入平台期时应提前停止。

每轮检查清单按依赖顺序可执行：generate、render、Tier 1、多角度、
`orchestrate_passes.py check`、profile 专属评审、AI 评审，然后 sync。领域插件会在 AI 评审之前插入自己的评审；检查清单会列出其名称。

领域插件的评审工具，连同其 manifest、指标和场景夹具（插件的评审检查清单步骤携带已解析的路径）

character profile 要求在编写 pre-spec 之前具备 reconstruction/likeness 契约、关键点证据，以及
明确的"风格化 vs 投影"路线决策。
每个 profile 还会记录参考图适用性结论、投影路线决策，以及
材质/PBR 证据决策。不适用的条件门禁必须附带原因跳过。

## stage1_intake/probe_image.py
`stage1_intake/probe_image.py <image>` —— 图像类型、尺寸、宽高比、明显的技术问题。
仅为元数据；不能替代视觉检查。

## stage2_spec/new_pre_spec_assessment.py
`stage2_spec/new_pre_spec_assessment.py "Name" [--image IMG] [--complexity simple|moderate|complex|ultra-complex] --out assessment.json [--force]`
输出 pre-spec 评估 + `qualityContract` 骨架。查看图像后再修正 `--complexity`。
评分维度和契约检查清单见 `intake/quality_contract.md`。

## stage2_spec/new_sculpt_spec.py
`stage2_spec/new_sculpt_spec.py "Name" [--image IMG] [--assessment assessment.json] --out object-sculpt-spec.json [--force]`
初始 `ObjectSculptSpec`（schema 2.0）。带 `--assessment` 时，从已完成的门禁播种。
务必把通用的初始 `featureReviewTargets` 替换为真正决定身份辨识的系统。

## stage2_spec/validate_sculpt_spec.py
`stage2_spec/validate_sculpt_spec.py spec.json [--json] [--strict-quality]`
普通模式：检查必填字段、分数范围、材质引用、组件 ID、父级链接、
变换、基本体名称（允许警告）。`--strict-quality`：把质量警告提升为
错误——当 spec 相对其契约过浅时阻止代码生成（macro/meso/micro 最少数量、
材质层、重复系统、评审视角、非通用特征目标、
material-pass 局部性、lighting-pass 真实光源）。按 `intake/quality_contract.md` 修复。

## stage3_build/orchestrate_passes.py
- `status spec.json` —— 当前已解锁的轮次 + 所需证据。
- `check spec.json --pass-id <pass>` —— 除非该轮已解锁或已完成，否则退出码非零。
- `sync spec.json --in-place` —— 从 `reviewHistory` 重新计算 `sculptPipeline`。

轮次顺序：`blockout → structural-pass → form-refinement → material-pass → lighting-pass →
interaction-pass → optimization-pass`。只有当前一轮有一条
`action=continue` 的评审，且该评审有渲染截图、对比图、全局 AI 视觉分数 ≥
阈值（默认 0.7）以及每个关键特征 ≥ 其自身阈值作为支撑时，下一轮才会解锁。

## stage3_build/generate_threejs_factory.py
`stage3_build/generate_threejs_factory.py spec.json --out src/createObjectModel.ts [--pass-id PASS] [--force]`
先强制执行 `strict-quality`；若该门禁失败，则打印机器可读的 `BLOCKED` 报告，
可选用 `--blocked-report` 写入文件，且不创建、不覆盖工厂函数。它输出
一个 TypeScript Three.js `Group` 工厂函数，**仅针对当前已解锁的轮次**。传入
未来的 `--pass-id` 会失败，直到更早的轮次评审为 `continue`。输出暴露
`root.userData.sculptRuntime`（nodes/meshes/sockets/colliders/destructionGroups）——请手工精修。
`--allow-nonstrict` 保留给旧版测试夹具，不得用于生产输出。

### 浏览器截取前执行的几何门禁

生成之后，不经渲染器执行工厂函数并检查
`root.userData.sculptRuntime`；在打开浏览器之前完成此步。对于多部件角色，
浏览器前报告必须覆盖每个具名 spec 组件，并在适用时测量：

- 基于世界空间包围盒的左右镜像，以及手部的拇指/食指手性；
- 有序的服装外壳区间，确保腰部层不会陷入其下方的层；
- 每个 `geometry.userData.standProud.unresolved` 计数（为零才是精确的通过条件）；
- 引擎可见的 `material.userData.referenceMaterialId`，而不是被忽略的编写字段；
- 服装边界相对于相关关节的位置，而不是相对于所有无关骨骼。

全局宽/高/深比例可以对照 GLB 基线记录，但仅作诊断用途，
在成对的多角度轮廓对照建立起验收阈值之前，必须声明自身未校准。
不要把任意的比例容差变成门禁。为 showcase 新增的每个精确门禁
都需要一个通过的夹具，以及一个使其失败的变异（缺失网格、同侧
镜像、下陷的层、对调的拇指、未解决的凸出顶点、缺失的材质 ID，或
被移到关节上的边界）。TypeScript 编译通过不等于几何执行证据。

普通基本体保持在其编写的几何路径上：生成的工厂函数不会为它们凭空创建
attachment 变量，共享的端点分支保留声明的
`AttachmentEndpoint | null` 辅助函数返回类型，而不是一个会被 strict TypeScript
收窄为 `never` 的字面量 null。在接受 showcase 构建之前，用一个不含任何由 attachment 派生的
基本体的 spec 验证这条负对照路径。

## Forge 细分运行时验证
运行时细分测试会针对 `img2threejs-showcase` 编译生成的 TypeScript。将
`IMG2THREEJS_SHOWCASE_ROOT` 设为该 checkout。未设置时，仅运行时的用例会在本地跳过并给出
可操作的提示，静态契约照常执行；在 CI 中设置 `IMG2THREEJS_REQUIRE_SHOWCASE=1`，使
checkout 不可用时失败。Forge showcase 测试共享这一解析器，包括 visual-hull
运行时和冒烟覆盖。

```bash
IMG2THREEJS_SHOWCASE_ROOT=/path/to/img2threejs-showcase python3 forge/tests/test_subdivision.py
IMG2THREEJS_SHOWCASE_ROOT=/path/to/img2threejs-showcase python3 -m unittest discover -s forge/tests
IMG2THREEJS_SHOWCASE_ROOT=/path/to/img2threejs-showcase python3 forge/tests/test_showcase_tsc_smoke.py
```

## 三角形预算：曲面细分档位与减面

`performanceBudget.targetTriangles` 为每个带分段数的基本体选择曲面细分档位，
并限制隐式曲面采样网格的上限：

| targetTriangles | 档位 | sphere | cylinder | SDF 网格上限 |
|---|---|---|---|---|
| ≤ 6,000 | `low` | 16×10 | 10×4 | 24 |
| ≤ 60,000 | `standard` | 32×20 | 24×8 | 40 |
| 其他 / 未设置 | `hero` | 64×40 | 48×16 | 64 |

`hero` 就是引入档位之前的常量，因此没有预算的 spec 生成的输出逐字节相同。
高度分段数绝不低于 4，cone 的高度分段固定为 1——前者
是因为跨关节只有一个四边形时，枢轴处没有顶点，关节会塌陷
（`emit_rig.py:399` 推导出相同的下限），后者是因为渐细的 cone 只有在 1 段时才能
干净焊接。`validate_tier()` 会直接报错，而不是放任某个档位违反其中任一条。

当档位不够精确时——SDF 的网格是量化的，只能接近某个
数值——对该组件做减面：

```json
"geometryDescriptor": { "decimate": { "targetRatio": 0.4 } }
```

在生成的工厂函数中输出 Garland-Heckbert 二次误差塌缩，拒绝会
翻转面或侵蚀边界边的塌缩。它在蒙皮绑定**之前**运行：绑定阶段
从 `position` 重新计算权重，因此权重落在保留下来的顶点上，不会有
skinIndex/skinWeight 跨顶点合并被插值。它只保留 `position` 并
重新计算法线，因此对已编写/已展开的 `uvStrategy` 会拒绝执行。

在隐式夹具上实测：0.4 时 856 → 342 个三角形。在已绑定的人形上 0.5 时：
828 → 414 个三角形，49 根骨骼和 5 个 SkinnedMesh 完好，每个顶点的四个蒙皮权重
之和仍为 1.0。

如需从导出网格制作离线 LOD 档位，使用同一算法：

```bash
python3 forge/stage3_build/decimate.py meshes.json --ratio 0.5 --json
```

## Visual-hull 描述符

`geometryDescriptor.visualHull` 是一条可选启用的确定性正交雕刻路径。它要求
`boundsSpace: "component-local"`；有界的 `min`/`max` 局部范围在现有
组件枢轴应用其 `transform` 之前创建，另需 4 到 32 的体素 `resolution`、三角形预算，以及
至少两个不同的 `front`、`side` 或 `top` 二值轮廓。每个视图携带一个 0 到 1 的
置信度；生成的几何体把每个未观测到的区域记录为低置信度元数据。一个
有效描述符若其轮廓相交后没有任何体素，会在运行时抛出 `VisualHullOccupancyError`，
而不是静默返回空几何体。

```json
{
  "visualHull": {
    "projection": "orthographic",
    "boundsSpace": "component-local",
    "bounds": { "min": [-1, -1, -1], "max": [1, 1, 1] },
    "resolution": 16,
    "triangleBudget": 50000,
    "views": [
      { "axis": "front", "confidence": 0.94, "mask": ["0110", "1111", "1111", "0110"] },
      { "axis": "side", "confidence": 0.91, "mask": ["0110", "1111", "1111", "0110"] }
    ]
  }
}
```

```bash
IMG2THREEJS_SHOWCASE_ROOT=/path/to/img2threejs-showcase python3 forge/tests/test_visual_hull.py
```
只有在把有效的手工精修保留进 spec 之后，才能在下一轮使用 `--force`。
`refine-code` 之后不要重新生成；直接编辑现有产物。在
`refine-spec` 之后或推进到新一轮时，用 `--force` 重新生成。

## stage4_review/make_comparison_sheet.py
`stage4_review/make_comparison_sheet.py --reference IMG --render SHOT --out cmp.png [--panel-width N] [--panel-height N] [--gutter N] [--json]`
对齐并打包一张并排对比图。它**不**计算验收分数——用代理视觉检查
`cmp.png`，再通过 `stage4_review/append_review.py` 写回分数。

## stage4_review/append_review.py
`stage4_review/append_review.py spec.json --pass-id PASS --fidelity 0-1 --action continue|refine-spec|refine-code|request-input|stop --summary "..." [evidence flags] --in-place`
证据参数：`--matched --mismatches --spec-fixes --code-fixes --evidence --reference-screenshot
--render-screenshot --comparison-image --ai-vision-score 0-1 --layer-scores-json '{...}'
--feature-reviews-json f.json --ai-vision-notes "..." --visual-threshold 0-1 --camera-view NAME
--require-screenshot-files`。层级键：`silhouetteProportion, componentStructure, formDetail,
materialSurface, lightingCamera`。向 `reviewHistory` 记录一条自我修正条目。

## GLB 中介的 v2 渲染 profile

`stage4_review/validate_render_profile.py docs/specs/render-profile.v2.example.json`
校验共享的浏览器渲染器/相机/环境契约。初始化 GLB 中介路线时使用。
`regions` 必须列出实际的主体区域；把必需的子集列在
`extensions.requiredSemanticRegions` 下。校验器会拒绝缺失的已声明区域，且不会
把示例主体的名称强加给另一个重建：

`stage4_review/render_bridge.py init --reference-glb GLB --render-profile PROFILE --runtime-url URL --out render-manifest.json`

用 `stage4_review/render_bridge.py record-pass --manifest MANIFEST
--capture-id hero --pass-id semantic-id --image semantic-id.png [--reference]` 记录每个渲染通道。必需的通道
为 `beauty`、`alpha-silhouette`、`semantic-id`、`depth`、`normal` 和
`roughness-material-id`。用
`stage4_review/compare_region_passes.py --manifest MANIFEST --capture-id hero --out comparison.json` 对比成对的浏览器证据。

## stage1_intake/extract_pbr_evidence.py
`stage1_intake/extract_pbr_evidence.py <crop> --out-dir DIR --material-id ID [--target-threshold 0.7] [--size N]
[--palette-size N] [--spec spec.json --in-place | --out-spec p.json] [--report r.json]
[--allow-low-confidence] [--multi-view-reference]`
提取源自参考图的证据：albedo 调色板、去光照 albedo、粗糙度估计、高度、
法线、AO。**是推断，不是逆向渲染**——像素中包含烘焙的光照。当置信度 < `--target-threshold`
（默认 0.7）时以非零码退出并拒绝修补 spec，除非指定
`--allow-low-confidence`。低于阈值应视为 `request-input`/`refine-spec`，而非通过。

## _shared/feature_acceptance_policy.py
被编排器/校验器导入的内部辅助模块（`feature_gate_failures`、
`feature_review_policy`）。强制执行 ≤5 个 critical / ≤3 个 important 的特征分级策略。不是 CLI。

## 角色几何流水线

全部是解析式的——没有训练模型，没有权重。每一项要么替代了流水线曾经提到却从未
实现的能力，要么补上了它从未有过的能力。

### stage3_build/visual_hull.py
`stage3_build/visual_hull.py descriptor.json [--out mesh.json] [--json]`
`carve_visual_hull()` 在体素网格上对轮廓锥求交，只输出实心与空体素之间的面，
因此结果是封闭曲面，而不是带内壁的一堆盒子。信任网格之前先读
`occupiedVoxelCount`：体素要保留，必须在每一个视图中都是前景，因此一张坏
遮罩会抹掉整个模型，而不是让它降级。`unconstrainedAxes` 指出双视图
外壳沿哪个方向挤出；外壳永远无法包含任何已提供视图都不视为背景的凹陷。

### stage3_build/uv_unwrap.py
`stage3_build/uv_unwrap.py mesh.json [--angle DEG] [--out uv.json] [--json]`
按法线相似度做图表（chart）分割（生长时与 SEED 比较，因此图表无法以每步都可容忍的幅度
沿圆柱一点点蔓延一圈），用共轭梯度求解 LSCM，天际线装箱。
**读 `areaDistortionMedian` 和 `areaDistortionP95`，而不是最大值**——在一个真实
头骨上扫描阈值得到 2299 / 93609 / 6595 / 378 / 15.85，这是某个细条图表主导了最大值，而不是
趋势。非圆盘拓扑的图表会被切开，而不仅仅是报告：保留七个不处理时，畸变升到 171300，
并有十二个反转三角形。`seamVertices` 中的顶点带有不止一个 UV，烘焙前必须
复制拆分。

### stage5_rig/geodesic_skinning.py
`stage5_rig/geodesic_skinning.py mesh.json --bones bones.json [--resolution N] [--json]`
距离是**穿过**实体测量的，不是直线距离。在"手臂贴着躯干"的夹具上，距离场
正确读出到脊柱 1.37 单位、到手臂 4.45 单位；此后残留的串扰由
`DEFAULT_FALLOFF_POWER` 决定（幂 2 残留 8.6%，幂 3 残留 2.8%，幂 4 残留 0.9%），而不是由
距离场决定。保留 `euclidean_bind` 是为了能测量出差异，而不是仅凭断言。

### stage4_review/joint_loops.py
`stage4_review/joint_loops.py meshes.json --bones bones.json [--min-loops N] [--json]`
统计每个关节附近沿骨骼轴向的不同顶点**带**数。统计带而不是顶点：一万个
顶点排成两圈仍然无法弯曲，而顶点计数会把这种网格判定为密集。窗口是沿轴向的，
不是球形，因为肢体粗细与其关节能否弯曲毫无关系。

### stage4_review/pairwise_penetration.py
`stage4_review/pairwise_penetration.py meshes.json [--allow nameA,nameB]... [--json]`
跨网格的射线奇偶性检测。采样顶点、边中点和面质心——只采样顶点会漏掉
一根穿过方块的杆，因为二者的每个角都在对方之外。它仍是采样，而非精确
求交；`samplingLimitation` 会如实说明。对本就应该接触的部件使用 `--allow`。

### stage3_build/morph_targets.py 与 stage3_build/decimate.py
`morph_targets.py base.json --target pose.json [--out morphs.json]`
`decimate.py mesh.json --ratio 0.5 [--out lod.json]`
Morph target 是**相对**增量；在 Three.js 中设置 `morphTargetsRelative = true`，否则每个目标都会
被当作绝对位置读取，网格会向原点塌缩。顶点数不匹配的目标会被拒绝，
而不是被 zip 截断成一个看似合理却毫无意义的形变。
减面会拒绝任何会翻转面或侵蚀边界的塌缩，并报告
`collapsesRefusedForFlip`——没达到目标数不算失败，但靠折叠的曲面凑到那个数
才是失败。

## 离轴与放置门禁

这三项检查之所以存在，是因为一次只从参考相机截取、只按
边数计分的评审，放过了一个头骨有洞穿、帽子装在臀部高度、挂饰
脱离并漂浮在地面以下的模型。每一项都回答一个此前没有门禁问过的问题。三者都以
`0` 干净 / `1` 门禁失败 / `2` 错误 退出，因此可以在脚本中组合使用。

### stage4_review/self_intersection.py
`stage4_review/self_intersection.py meshes.json [--max-samples N] [--epsilon E] [--json]`
射线奇偶性测试，检测穿过自身体积折叠的曲面。`geometry_integrity.py` 只统计
`boundaryEdges` 和 `nonManifoldEdges`，它们是**拓扑**层面的——把现有顶点推
穿网格另一侧不会改变任何连接关系，因此一个被戳穿的模型报告 0 和 0 并
通过。这是能发现它的几何检查。报告 `sampledVertexCount` /
`totalVertexCount` / `samplingStride`：务必阅读，因为基于跨步采样得出的干净结论，比基于
整个网格得出的干净结论更弱。`undecided` 样本（掠射射线）单独计数，
绝不并入任一结论。

输入与 `geometry_integrity.py` 接受的网格结构相同。可从运行中的场景用
`runtime/scripts/export_mesh_geometry.mjs`（见下文）生成。

`measure_geometry_integrity` 会对每个提供了 `vertices` 和
`indices` 的网格自动调用它，为每个网格报告一个 `selfIntersection` 块，并抛出 `self-intersection` 失败。
这个调用点是刻意设置的：作为独立 CLI，这项检查只有在有人记得运行时才会运行，
而它要捕获的缺陷之所以撑过了八轮评审，恰恰是因为没人运行它。

### stage4_review/turntable_gate.py
`stage4_review/turntable_gate.py --capture 0=front.png --capture 90=right.png ... [--required N]... [--collapse-ratio R] [--allow-holes] [--json]`
做了 `diagnose_render_multi_angle.py` 不做的两件事。第一，**覆盖是强制的**：缺少
必需的方位角（默认 0/90/180/270）会让门禁失败，而不是被忽略，这正是
全部意义所在——只在离轴视角存在的缺陷，无论做多少轮仅正面评审都能存活下来。
第二，**内部孔洞检测**：从边框对背景做泛洪填充，任何未被触及的背景
区域都被物体包围。穿透模型的孔洞几乎不改变轮廓
**面积**，因此塌缩检查看不到它；这项检查可以。对于在该角度确实
有贯穿孔的主体，使用 `--allow-holes`——孔洞仍会被报告，只是结论改变。

### stage4_review/attachment_anchor.py
`stage4_review/attachment_anchor.py spec.json [--measured measured.json] [--json]`
把穿戴或手持的物品与其所穿戴/手持的对象关联起来。`ANCHOR_DECLARED`、
`ANCHOR_RESOLVES`、`ANCHOR_NOT_ROOT`（就是那个共性 bug——挂到 root 下会让物品的
变换与其身体部位毫无关联）、`ANCHOR_NOT_CYCLIC`，以及在提供 `--measured` 世界坐标时，
对照 `attachment.maxOffset` 的 `ANCHOR_PROXIMITY`。`measured` 中缺失的 attachment 会
列在 `unmeasuredAttachments` 下，而不是算作通过——因为检查
从未运行而得出的"0 违规"，正是本仓库反复重新踩到的失败。没有 attachment 元数据的 spec
会干净通过，因此现有 spec 不受影响。

### runtime/scripts/export_mesh_geometry.mjs
`node runtime/scripts/export_mesh_geometry.mjs --url URL --out meshes.json [--include RE] [--exclude RE] [--max-triangles N] [--ready-flag F] [--viewer-handle H]`
把运行中模型的网格导出为 `self_intersection.py` 读取的 JSON。顶点刻意以
**世界**空间输出：即使局部几何没问题，父级的非均匀缩放也可能让网格穿过自身折叠，
而局部空间恰好会掩盖这一点。法线经过
逆转置变换。每个它拒绝输出的网格——instanced、超过三角形上限、被过滤掉的——
都会连同原因列出，因此不会把一个偏短的网格列表误认为是干净的列表。

### stage4_review/vertex_region_gate.py
`stage4_review/vertex_region_gate.py --geometry meshes.json --palette palette.json [--expect expect.json] [--azimuth 0] [--color-tolerance T] [--max-unclassified N] [--out report.json] [--json]`
在任何浏览器渲染之前，基于执行后的几何对颜色区域**边界**做门禁。当主体的
身份辨识由硬边纯色区域承载时——燕尾服猫的面部白斑、围兜和白袜；
涂装条纹；喷涂标记——这些边界的位置就是身份特征，因此要
测量而不是目测。`--palette` 为 `{regionId: '#rrggbb'}`，覆盖每个需测量的区域；
没有 `--expect` 时，门禁只报告测量值，不判定通过或失败。阅读
`--max-unclassified`：不匹配任何调色板条目的顶点会被列出，因此对一个大部分
未分类的网格得出的干净结论，不会被误认为一致。它与
校验器及生成的 TypeScript 共享的形状谓词位于 `_shared/vertex_paint.py`（无 CLI）。

### stage4_review/swept_arc_gate.py
`stage4_review/swept_arc_gate.py --geometry meshes.json --component ID [--expect expect.json] [--out report.json] [--json]`
基于执行后的几何对扫掠组件的**形状**——弯曲半径、角度跨度和渐细——做门禁。
"向上卷成钩状；一条弯曲的脊，而不是直锥"是关于曲线的论断，没有
其他门禁能约束它：轮廓 IoU 会放过一个恰好大致占据正确格子的直锥，
而 `self_intersection.py` 问的是网格是否自交，而不是它是什么形状。
`--component` 接受网格 id 或名称。

## 参考对比与基线

### stage4_review/interior_difference.py
`stage4_review/interior_difference.py BASELINE.png RENDER.png [--from 0] [--to 0.19] [--json]`
轮廓**内部**的外观差异，按高度分带。每个视觉轮次都必须提供的证据，
因为轮廓 IoU 只由约 11% 的人物格子——轮廓线上的那些——计算得出，
对其余 89% 视而不见。实测证据：一个删除了脸部的模型得分 0.8803，
而完成脸部的版本也是 0.8803，四位小数完全相同；添加一整张嘴使
该指标变化 −0.0002。两张渲染图都按前景包围盒对齐，与
IoU 打分器使用相同的归一化，并且只比较在**两张**图中都属于人物的格子，以免轮廓一致性
混进来。当任一前景遮罩回退为整帧覆盖时拒绝打分——与
`divine_eye` 的硬门禁相同，理由也相同。报告 `cellsCompared`，因此仅在少数格子上
测得的差异不能冒充证据。对站立人物而言，头部大致是
`--from 0 --to 0.19`。

## 头发

完整契约、其背后的每项测量以及每个明确的非目标：`docs/HAIR_PIPELINE.md`。
仅当主体有头发时才运行这些——`orchestrate_passes.py` 通过
`spec_has_hair()` 要求它们，该函数读取 `hairProfile` 块或任何 role 为 `hair` 的组件，因此
椅子和刀永远不会被要求提供头发证据。

### stage1_intake/extract_hair_evidence.py
`stage1_intake/extract_hair_evidence.py front=ref.front.png rear=ref.rear.png [--out evidence.json]`
测量参考图对头发实际表达了什么：头发/皮肤分割、头顶/中部/下颌各带的深色覆盖率、
发际线（写入自 v1.2 起一直存在但未填充的 `faceLandmarks.hairline` 槽位）、
高光带位置，以及发根到发梢的亮度差。未提供的视图
报告为 `notObserved`，因此下游不会把后颈当作已观察到的部位来编写。分割使用
Otsu 类间方差，而不是百分位数：固定百分位数会让报告出的头发占比
在构造上必然成立，对同一主体的三个不同视图读出 0.380 / 0.384 / 0.382，
看似一致，实为算术巧合。现在同样三个视图读出 0.387 / 0.592 / 0.747。

### stage4_review/scalp_exposure.py —— 硬性（HARD）
`stage4_review/scalp_exposure.py --rings skull.json --hair-points hair.json [--v-low 0] [--v-high 1] [--hard-max 0.05] [--out report.json]`
在任何渲染之前，基于点以几何方式找出秃斑——因此不需要浏览器、
GPU 或截图，适用于任何头发表示形式。它只统计头骨**外部**的头发：
最近邻测试会放过失败的构建，因为那些顶点仍在附近，只是
陷到了表面以下。暴露度超过 `--hard-max` 即为硬性失败，绝不只是软信号。
`--hard-max` 刻意设得宽松且未校准，报告中也会如实说明。

### stage4_review/hair_gate.py —— 软性（soft）
`stage4_review/hair_gate.py --reference front=ref.png --render front=out.png [--scalp-exposure report.json] [--out gate.json]`
对照参考图比较分带覆盖率、发际线偏移和高光带位置，并
按类型对每个差异分类。传入 `--scalp-exposure` 时以其结论为准：秃斑
永远是错的，而覆盖不足往往是在给定三角形预算下最好的折中。
把二者混为一谈曾在一次会话中导致四次错误修复——覆盖不足被理解为
"加更多头发"，发块被加宽，而加宽把它们推离了头骨，使
闭合度从 42.2% 降到 40.9%，六个视图全部变差，最差视图的头顶暴露增加 14.9 个百分点。
**覆盖不足本身绝不构成加宽发块的理由。**

### 头发库（无 CLI）
- `_shared/scalp_field.py` —— 到头骨的有符号距离，头骨由一叠椭圆环构建，派生
  自头部组件，因此绝不重复编写。符号是精确的；数值是一阶
  估计 `f / |grad f|`，因此以符号为准，数值视为近似。
- `stage2_spec/hair_profile.py` —— 发型 schema 及其校验规则。发根是头皮上的 `(u, v)`；
  绝对坐标的发根是硬错误。头发不接受 `plane-card`、`tube` 和 `box`。
  默认表示档位为 `shell`。**本模块校验 profile，并不会把它
  编译成组件**——目前还没有 profile 到 `componentTree` 的编译器。

## 左与右（Left and right）

### _shared/chirality.py（无 CLI）
同一个人物上可能同时出现两种手性缺陷，需要**不同的**测试，这就是两者都存在的原因：
- `check_pair()` —— 在 spec 阶段由 `validate_sculpt_spec.py` 强制执行。同时对 x
  *和* z 取反构建的一对，等于 180° 旋转，而旋转保持手性，因此两侧肢体会变成同一只
  手。它会指出关系类型（`rotation` / `translation` / `unrelated`），而不是只说
  "不匹配"，因为两者极易混淆，并且在对称部件上完全一致。
  在人形上实测：这一对的拇指尖位于 z ±0.288，而镜像不应改变 z；
  修正后，正面视图中手部区域与参考图的差距**缩小 46%**。
- `medial_lateral_bias()` + `compare_bias()` —— 需要参考图。捕获配对测试在
  结构上无法发现的问题：两侧以*相同*方式出错的一对，仍然是自身的完美镜像。
  只判定偏置的**符号**；数值差异是比例问题，由
  其他门禁负责。在人形上实测：在一个索引 0
  为内侧的条带上把脚趾按从小到大排列，使*两只*脚的大脚趾都在外侧——脚趾带质量参考图为内侧 529 /
  外侧 488，我们的为 350 / 443——而大脚趾在外侧的脚就是另一只脚。低于 `MIN_REFERENCE_BIAS`（0.025）时，参考图被视为过于对称，
  无法据此判断手性。

`CHARACTER_LEFT_SIGN` 是以代码表达的约定：在 `forward: +Z`、Y 向上的右手坐标系中，
角色自身的左侧是 `+X`。镜像还会反转三角形绕序——在镜像侧把它翻转回来，
否则 `flatShading` 会根据反转的绕序推导每条法线，肢体的光照会像
从背后打光一样。

### stage4_review/mesh_reference_compare.py
`stage4_review/mesh_reference_compare.py REFERENCE.glb CANDIDATE.glb [--bands N] [--json]`
逐带指出候选模型**哪里**有错，而不是返回一个总分。两个
网格都从**脚底**归一化（最低点为 0，高度为 1），因为地面是两个主体共享的
标志，而包围盒顶部则是任何最高的凸起——此前
三次尝试都从 bbox 顶部向下分带，结果测到的是它们自身的错位。每个带报告
第 5–95 百分位宽度而不是极值，这样一根细长的法杖不会主导该
数值；同时报告横向/深度**质心**和宽度，后者正是用来捕获尺寸正确
却在错误一侧的肢体。仅用标准库读取未压缩的 `.glb`。

### scripts/character_audit.sh
`scripts/character_audit.sh <page-url> <output-dir> [mesh-name-regex] [--allow a,b]...`
对运行中的模型执行所有几何门禁，并写出一份基线供日后对比，使"之前
和之后"成为一个数字而不是印象。正则之后的参数会转发给
穿插门禁，`--allow` 就属于那里：*本应*共享空间的部件（耳根插在
头骨中、手握法杖）是接触，不是缺陷；没有豁免列表的门禁会一直标记它们，
直到有人把门禁整个关掉。

### integrations/mesh3d/generate_reference_mesh.py —— 可选，外部
`integrations/mesh3d/generate_reference_mesh.py <image>... --out-dir <dir> [--space S] [--hf-token T]`
通过托管的 Space 从参考图生成参考网格，一次生成、一次变换即输出 GLB **和** OBJ。
GLB 是传输格式，使参考网格能用与候选模型相同的相机和着色器渲染——拿 PBR 渲染图与照片
对比正是让 `ssim` 卡在 0 的原因。OBJ 是打分格式，因为按仓库规矩 `forge/` 门禁只用纯标准库，
而 OBJ 是短小解析器就能读取的 ASCII。与本速查表中的其他所有内容不同，它需要网络访问
和第三方端点，因此绝不在必需路径上：它的输出是评审的输入，而不是
门禁通过的证据。
