# TRELLIS.2 → img2threejs：哪些可以迁移，哪些不能

研究笔记，2026-07-30。所问问题：*img2threejs 如何在输出保持为语义化、可编辑、可动画的 `THREE.Group` 的同时，
更接近 TRELLIS.2 这类图像转 3D 生成系统的保真度？*

TRELLIS.2 阅读的来源：仓库 README、项目页面、论文（arXiv 2512.14692，
*Native and Compact Structured Latents for 3D Generation*），以及
`trellis2/pipelines/trellis2_image_to_3d.py`。我**没有**克隆或运行 CUDA 源码
（FlexGEMM / CuMesh / o-voxel）；下文关于内部实现的论断来自论文和该流水线文件，凡属推断而非引用之处均已标注。

img2threejs 阅读的来源：本 checkout——`SKILL.md`、`docs/ARCHITECTURE.md`、`ROADMAP.md`、
`forge/stage1_intake/*`、`forge/stage2_spec/validate_sculpt_spec.py`（真实 schema）、
`forge/stage3_build/*`、`forge/stage4_review/*`、`forge/_shared/*`，以及相邻 `img2threejs-showcase`
checkout 中实际运行的评审工具。

---

## 0. 论点

两个系统朝相反方向失败。

- **TRELLIS.2 表达能力最大，语义为零。** 它的输出是一个 `MeshWithVoxel`。没有部件、没有 pivot、没有 socket、
  没有骨架。任何形状都可表达；没有任何东西可编辑。
- **img2threejs 语义最大，表达能力最小。** 它的输出是一个 `THREE.Group`，由取自 **14 种基本体类型**
  （`validate_sculpt_spec.py:38` 中的 `VALID_PRIMITIVES`）的命名部件组成。一切都可编辑；但很大一类形状无法表达
  ——而且关键在于，**流水线中没有任何东西能检测"无法表达"**。它只能检测"这次渲染得分低"，而这是另一回事。

所以保真度差距主要不是评审循环的问题。它是：

1. 一个**表示表达力**问题（§2.1、§4），以及
2. 一个**修正粒度**问题——循环在整个物体的保真度层面重新决策，并重新生成整个工厂函数（§6）。

三项迁移能在不放弃 Group 的前提下弥合大部分差距：

- **双层表示。** 增加一个稠密的逐部件场层，它是*拟合与测量的目标*，而绝不是输出。语义层在层级上保持权威；
  稠密层在形状上成为权威。这正是 O-Voxel 的角色，只是限定在每个部件内，分辨率为 32³–128³ 而非 1536³
  ——便宜到标准库 Python 就能处理。
- **TRELLIS 的条件化阶段顺序。** 结构 → 几何 → 外观，其中外观*以最终几何为条件*，绝不允许用来弥补几何。
- **局部化修正。** 把循环的决策单位从物体移到 `(view, component, feature)` 单元格，只重新生成失败部件的模块。

这一切都不需要运行 TRELLIS.2 或 O-Voxel。

---

## 1. TRELLIS.2 实际做了什么

### 1.1 几何——O-Voxel（"omni-voxel"）

一个稀疏体素网格，每个被占据的体素携带一个元组：**几何特征**（对偶顶点位置、边相交标记、分割权重）+
**材质特征**（基础色、金属度、粗糙度、不透明度）+ N³ 网格上的整数坐标。

关键属性在摘要中写明：O-Voxel *"can robustly model arbitrary topology, including open, non-manifold, and
fully-enclosed surfaces"*（能稳健地建模任意拓扑，包括开放、非流形和完全封闭的表面）。它是**无场的**——没有 SDF，
没有 Flexicubes，没有等值面。这就是它能处理布料和树叶的原因。

**这是与 img2threejs 最相关的一条论断。** SDF 无法表示零厚度薄膜；它必须将其加厚。img2threejs 的 `implicit`
topologyClass 和 `_shared/sdf_primitives.py` 正好继承了这一限制，而这恰恰是在龙翼膜、披风、树叶或鳍上出问题的限制。

*Flexible Dual Grid*——"每个原始单元一个顶点，每条原始边一个四边形面"——正是它在 marching cubes 会把锐边变圆的地方
保留锐边的原因。

网格↔O-Voxel 的转换被描述为即时的，"完全无需渲染、无需优化"。

### 1.2 压缩——Sparse Compression VAE

16 倍空间降采样、稀疏残差自编码（八个子节点聚合到通道维度）、提前剪枝的上采样。一个 1024³ 的带贴图资产变成约
9.6K 个潜在 token。

可迁移的要点不是 VAE。而是**阶段间消息紧凑，且其有损方式是被刻画过的**。img2threejs 的阶段间消息是 spec JSON，
它很紧凑——但其形状信息的损失是*未被刻画的*。没人能说出 spec 无法表达主体的多少部分。

### 1.3 阶段分解——来自源码，而非 README

`trellis2/pipelines/trellis2_image_to_3d.py`：

```
preprocess_image  →  get_cond
  → sample_sparse_structure(cond, resolution)              # occupancy layout only
  → sample_shape_slat / sample_shape_slat_cascade(cond, coords)
  → decode_shape_slat                                      # mesh + substructures
  → sample_tex_slat(cond, shape_slat as concat_cond)        # PBR, conditioned on geometry
  → decode_tex_slat → decode_latent
```

三个值得直接借鉴的事实：

- **(a) 结构先于形状求解。** 一个独立的廉价模型先决定*物质在哪里*，然后才有东西决定*它是什么形状*。
- **(b) 外观以最终几何为条件**，作为 `concat_cond` 传入。材质从不与几何同时采样。
- **(c) `_cascade` 变体只存在于 1024/1536。** 高分辨率是通过*细化已收敛的低分辨率结果*达到的，而从不直接在
  目标分辨率下生成。

### 1.4 PBR

`baseColor`、`metallic`、`roughness`、`alpha` 作为**逐体素表面属性**，而不是 UV 贴图——天然可重新打光。注意其
README 中坦诚的说明：导出的 `.glb` 默认是 `OPAQUE`，即使 alpha 保留在贴图中。连 TRELLIS 也把透明度当作下游的
编写决策，而不是已解决的输出属性。

### 1.5 不能迁移的东西

4B 参数、H100 级 GPU、≥24 GB 显存、CUDA 12.4、Linux、FlexGEMM/CuMesh/nvdiffrast。更重要的是*输出的形态*：
一个网格。在 img2threejs 内部运行 TRELLIS.2，会交给 img2threejs 一个它存在的意义就是要避免的产物。它唯一合理的
角色是作为**可选的、用于拟合对照的稠密证据层**（§10 中的 MA4）。

---

## 2. 可迁移的思路及其落点

| TRELLIS.2 机制 | 为什么有效 | img2threejs 迁移方式 | 涉及 |
|---|---|---|---|
| 无场表示 | 开放 / 非流形 / 封闭表面都是原生的 | 新增 `open-shell` 拓扑类 + 带显式双面零厚度模式的**部件壳场**；SDF 只保留给实体 | 新增 `_shared/part_shell.py`；`validate_sculpt_spec.py:58`（`VALID_TOPOLOGY_CLASSES`） |
| 稀疏结构阶段先运行 | 比例和布局在细节之前确定 | 把 `visual_hull.py` 从可选的 `geometryDescriptor` 提升为**必需的 Stage-S1 占据产物**，并用作包围盒/比例的判定依据 | `stage3_build/visual_hull.py` → 新增 `forge/stage2_structure/` |
| 对偶网格保留锐边 | 没有 marching cubes 的圆化 | 绝不把网格提取作为主路径：保留参数化轮廓并将其*拟合*到场上 | `_shared/subdivision.py`，新拟合器 |
| `_cascade` 细化 | 细化已收敛的部分，而不是全部 | **逐部件细化预算**：只重新生成单元格失败的部件 | `stage3_build/orchestrate_passes.py`、`stage3_build/module_cache.py` |
| 外观以几何为条件 | 材质无法掩盖形状错误 | **硬性顺序门禁**：几何单元格未收敛的部件不得进入 `material-pass` | `orchestrate_passes.py:387-420` |
| 紧凑结构化潜变量作为唯一阶段间消息 | 阶段无法绕过彼此 | S3S（§3）成为阶段之间*唯一*的通道，逐阶段做哈希 | `stage2_spec/*`，新的来源记录块 |
| PBR 作为逐点属性 | 可重新打光，通道相互独立 | 逐部件属性贴图（顶点色 / 小 `DataTexture`），每通道带 `source` + `confidence` | `stage1_intake/extract_pbr_evidence.py`、`analyze_texture.py` |

---

## 3. 结构化 3D Spec（S3S）

把它设计为 **`ObjectSculptSpec` 的严格超集**，`schemaVersion: 2`，使每个 v1.5 spec 都能通过增补完成迁移。
从同一个真相来源输出两个产物：用于运行时/代码生成约定的 TypeScript 接口，以及用于 Python 校验器的 JSON Schema。

```ts
export interface StructuredSpec {
  schemaVersion: 2;
  provenance: Provenance;
  subject: Subject;                 // 类别、复杂度档位、qualityContract（不变）
  frame: Frame;                     // 新增——显式的世界约定
  structure: Structure;             // 新增——S1 占据求解
  parts: Part[];                    // 替代 componentTree（通过 parentId 构成树）
  materials: MaterialSpec[];
  articulation: Articulation;       // 新增——原先分散在 actionProfile/attachment 中
  evidence: EvidenceBundle;         // detailInventory、referencePbr、localSpecSearch、cs2Intake
  review: ReviewBlock;              // featureReviewTargets + reviewHistory（不变）
}

export interface Provenance {
  referenceHashes: Record<string, string>;   // path → sha256
  specHash: string;
  stageStamps: Array<{ stage: StageId; inputHash: string; outputHash: string }>;
  /** 一个阶段只能读取上一阶段 outputHash 对应的产物 + 证据。 */
  sealed: true;
}

export interface Frame {
  unit: 'meter' | 'model-height-1';
  up: [number, number, number];
  forward: [number, number, number];
  worldBounds: { min: Vec3; max: Vec3 };
  referenceCameras: ReferenceCamera[];        // 来自 solve_camera_pose.py
}

export interface ReferenceCamera {
  viewId: string;                             // 'front-primary', 'side', ...
  azimuthDeg: number; elevationDeg: number;
  fovDeg: number | null;                      // null ⇒ 未求解（UNSOLVED），不得伪造
  /** 用于区分包围盒膨胀与透视不匹配这一歧义——见 §6.4 */
  fovEvidence: 'solved' | 'assumed' | 'ambiguous-with-part-inflation';
}

export interface Structure {
  /** 粗略的"物质在哪里"求解。刻意使用低分辨率。 */
  occupancy: {
    resolution: number;                       // 32 → 128
    boundsSpace: 'model' | 'world';
    views: Array<{ axis: 'front' | 'side' | 'top'; maskRef: string; confidence: number }>;
    hiddenRegions: Array<{ region: string; confidence: number }>;
  };
  proportionAnchors: Array<{ id: string; position: Vec3; source: 'landmark' | 'occupancy' | 'assumed' }>;
  symmetryPlanes: Array<{ normal: Vec3; origin: Vec3; enforced: boolean }>;
}

export interface Part {
  id: string;
  parentId: string | null;
  semanticRole: string;                       // 'wing-left', 'horn-r', 'tail-dart'
  level: 'macro' | 'meso' | 'micro';
  transform: { position: Vec3; rotation: Vec3; scale: Vec3 };

  topologyClass: TopologyClass;               // + 'open-shell'
  topologyRationale: string;
  geometry: GeometryRepr;                     // §4——可辨识联合类型

  materialIds: string[];
  pivot?: Vec3;
  sockets?: Socket[];
  collider?: Collider;
  attachment?: Attachment;                    // 约定不变
  articulationBinding?: { boneId?: string; jointId?: string; skinWeightHint?: string };

  confidence: PartConfidence;
  editability: {
    tier: GeometryRepr['kind'];
    /** 对烘焙档位：如何重新生成。绝不输出不透明的顶点数据。 */
    refitCommand?: string;
  };
}

export interface PartConfidence {
  /** 按轴分别给出，因为单一视角对 x/y 的约束远强于 z。 */
  shape: { x: number; y: number; z: number };
  material: number;
  occluded: boolean;
  /** 当参考图根本无法分辨某个已声明特征时设置。 */
  insufficientReferenceResolution?: { featureId: string; referencePx: number; requiredPx: number };
}

export interface MaterialSpec {
  id: string;
  /** 每个通道相互独立，各有来源。一次提取器调用 ⇒ 一个通道。 */
  channels: {
    baseColor?: Channel; roughness?: Channel; metalness?: Channel;
    normal?: Channel;    opacity?: Channel;   transmission?: Channel;
    ao?: Channel;        emissive?: Channel;
  };
  /** 参考图光照未求解时为 true ⇒ roughness/metalness 仅报告（REPORT-ONLY），绝不作为门禁。 */
  lightingUnknown: boolean;
  doubleSided?: boolean;                      // open-shell 部件必需
}

export interface Channel {
  source: 'delit-reference-projection' | 'reference-inference' | 'procedural' | 'authored-map' | 'assumed';
  value?: number | [number, number, number];
  mapRef?: string;
  colorSpace?: 'srgb' | 'linear';
  confidence: number;                          // < 0.7 ⇒ refine-input，不算通过
  gating: 'hard' | 'soft' | 'report-only';
}

export interface Articulation {
  skeleton?: { bones: Bone[]; bindMode: 'attached' | 'detached' };
  joints: Joint[];                             // hinge/ball/slider + 限位
  blendshapes?: Array<{ id: string; targetPartIds: string[]; driver: string }>;
  deformationStack?: DeformationOp[];
  rootMotionNode?: string;
}
```

关于两个承载最多分量的字段：

- **`Channel.gating`** 让置信度*可付诸行动*。在 showcase 构建中付出代价才确立的规则是：**绝不对无法测量的信号
  设硬门禁**——凹面部件上的暗像素比例测的是凹陷阴影，而不是材质；从光照未知的照片中得到的粗糙度测的是摄影师，
  而不是表面。`lightingUnknown: true` 必须机械地把 roughness/metalness 降级为 `report-only`。
- **`editability.refitCommand`** 让理念在 T5 逃生口（§4）处保持完整。烘焙的 `BufferGeometry` *只有*在可重新生成、
  并且仍带有名称、pivot、socket 和材质时才可接受。

---

## 4. 混合几何系统

一个阶梯，最便宜、最可编辑的在前。每个部件只声明一个档位。

| 档位 | Kind | 是什么 | 编辑方式 | 示例 |
|---|---|---|---|---|
| T0 | `primitive` | box、sphere、ellipsoid、cylinder、cone、capsule、torus | 改一个标量 | 金戒指、螺栓 |
| T1 | `parametric` | lathe / extrude+bevel / ground-blade / tube | profile2D、bevel、spine | 刀刃、角 |
| T2 | `sweep` | 沿脊线扫掠的站点列表（位置 + 半径） | 编辑一个站点 | 尾巴、翼骨 |
| T3 | `proceduralSurface` | 叠加在 T1/T2 上的确定性生成器（置换、噪声、撕裂缺口） | 生成器参数 + 种子 | 翼膜破洞、滚花、鳞片 |
| T4 | `field` | SDF 并集/差集**或** open-shell 场 | 基本体 + 运算列表 | 连续的有机躯干；一张**薄膜** |
| T5 | `fittedBuffer` | 拟合到场/遮罩的烘焙顶点数据 | `refitCommand` 重新推导 | 以上任何档位都无法表达的形状 |

按现有 `topologyClass` 路由（扩展 `validate_sculpt_spec.py:71` 中的 `DISALLOWED_TOPOLOGY_PRIMITIVE_PAIRS`）：

| topologyClass | 允许的档位 | 禁止 |
|---|---|---|
| `assembled-solid` | T0、T1 | T4（装配体不是一个场） |
| `continuous-sculpt` | T2、T4 | T0 box/cylinder/cone（已有），细直挤出（已有） |
| `conforming-shell` | T4 open-shell | 封闭 SDF |
| `open-shell` *（新增）* | 仅 T4 open-shell | **SDF**——它无法表达零厚度 |
| `surface-relief` | 父部件表面上的 T3 | 独立的 T0 |
| `fiber-strand` | T1 tube、T0 instanced-cluster | box、plane-card（已有） |
| `material-only` | 无 | 任何几何 |

两条规则比阶梯本身更重要：

**升级（向 T5）需要两个一致的测量工具。** 只有当部件的单元格**在已收敛的测量上失败两次**，且失败是*形状*失败
而非测量假象时，才允许升级其表示。在 showcase 构建中，有三次几何改动被轮廓棘轮回退，其中至少一次（把翼骨变细
×0.72）是在追逐测量误差——单独渲染显示出了参考图看不到的翼根。仅凭一个工具的结论就升级表示，会把这个误差烘焙进
几何，而在那里要撤回就难得多。

**降级是必需步骤，而非愿景。** 在 `optimization-pass` 中，尝试把每个 T5 降回 T4/T2，若单元格没有退步就接受。
没有这一步，模型会在整个生命周期中不断累积烘焙几何，悄无声息地不再可编辑——这正是会让 img2threejs 变成它力图
避免的那种东西的失败模式。

---

## 5. 阶段分离

| 阶段 | 负责 | 读取 | 输出 | 位置 |
|---|---|---|---|---|
| **S0 Intake** | 准入、相机求解、去光照、细节清单、**参考图分辨率预算** | 图像 | `evidence.json` | `forge/stage1_intake/`（已存在） |
| **S1 Structure** | 占据、比例锚点、对称、部件清单 + 置信度 | S0 | `structure.json` | **新增** `forge/stage2_structure/`（提升 `visual_hull.py`） |
| **S2 Geometry** | 逐部件档位选择 + 对占据场和轮廓的参数拟合 | S1 | `parts[].geometry` | `stage2_spec/derive_geometry.py` + **新**拟合器 |
| **S3 Material** | PBR 通道、逐通道置信度和门禁 | S2（**以逐部件几何收敛为门禁**） | `materials[]` | `stage1_intake/extract_pbr_evidence.py`、`analyze_texture.py` |
| **S4 Articulation** | pivot、socket、碰撞体、关节、骨架、蒙皮权重、blendshape 桩 | S2/S3 | `articulation` | **新增** `forge/stage5_rig/` |
| **S5 Optimization** | 合并/实例化/LOD + **T5→T4 降级尝试** | S4 | 最终 spec + 工厂函数 | `stage3_build/` |

让这件事值得做的纪律，正是 showcase 工具所证明的那一条：每个阶段**只**读取上一阶段的产物加证据包，并且每个阶段
都标记输入和输出哈希。能绕过前一阶段的阶段无法做回归测试，而产物没有哈希链接的流水线会静默地测量一个过期的渲染
——showcase 构建中发现并封堵了五条独立的过期产物路径，全部出自同一个根因。

注意这暴露出的缺口：**S4 目前并不存在。** `actionProfile`、`attachment`、`sockets`、`joints` 和 `deformationStack`
都在 schema 中，`docs/PLAN_1.5_ANIMATION_READY_RIGS.md` 描述了意图，"action-ready" 门禁会检查
`root.userData.sculptRuntime` 是否已填充——但没有任何东西测量绑定是否*正确*。这是 v1.5/v1.8 的主题，也是
"可动画（animation-ready）"承诺中防护最薄弱的部分。

---

## 6. 局部化修正循环

### 6.1 现状

`stage4_review/correction_loop.py::decide(history, target_fidelity=0.85, max_iter=6, min_delta=0.02)` 接收一份
**整体物体保真度标量加标签**的历史。它是一个合理的有界循环——硬门禁路由到 `refine-code`，振荡路由到 `refine-spec`，
停滞和触顶路由到 `request-input`——但它在结构上*无法说出该修哪个部件*，所以每次修正都会重新生成整个工厂函数。

`divine_eye.py` 在 64×64 亮度网格和 96×96 边缘网格（`LUMA_SIZE`/`EDGE_SIZE`，第 73-74 行）上测量整张图像。
`per_feature.py` 能正确地逐特征设门禁，但它消费的是一个评分字典，从不打开图像。所以分级机制本身是健全的，却缺乏
输入——正如 `grimoire/review/divine_eye_microscope.md` 已经记录的那样。

### 6.2 要构建的循环

```
for each planned view:
    capture beauty pass
    capture object-ID pass          # flat unique emissive colour per component,
                                    # lights and environment OFF, depth testing ON
    for each declared component:
        footprint = pixels where this component's ID is frontmost   # occlusion-correct
        for each declared feature:
            patch   = setViewOffset crop, ≥128 px, projection UNCHANGED
            metrics = { sdf, directionalChamfer, curvatureExtrema, deltaE00 }

aggregate:  worst patch → worst component → worst view → verdict     # never average
route:      failing cells NAME the parts to edit
regenerate: only those parts' factory modules
```

`module_cache.py` 已经实现了带邻居失效的逐模块代码生成缓存，所以最后一行的改动比看上去小：让一个失败的单元格恰好
使一个模块失效。

### 6.3 已有可用的实现——提升它

相邻的 `img2threejs-showcase` checkout 包含这个循环唯一可用的构建。这些都经过生产验证，应当迁入技能，而不是重写：

| Showcase 文件 | 作用 | 建议位置 |
|---|---|---|
| `scripts/capture-views.mjs` | 按计划驱动截图、逐部件 object-ID 通道、白色背景硬失败 | `forge/runtime/capture/` |
| `scripts/multiview_gate.py` | 逐视角轮廓 IoU，带由粗到细对齐 + **收敛状态** | `forge/stage4_review/microscope/` |
| `scripts/component_report.py` | 由 ID 通道得出逐部件覆盖区域，双向失败即关闭 | `forge/stage4_review/microscope/` |
| `scripts/correction_loop.mjs` | 有界运行器，7 条已验证的退出路径，通过 `renderSetHash` 检测停滞 | 合并进 `correction_loop.py` |
| `scripts/provenance.mjs` | 由内容派生的 `runId`、`planHash` / `modelHash` / `shadingHash` | `forge/_shared/provenance.py` |
| `scripts/gate_record.py` | 自描述的门禁 JSON；不变式 `verdict == 'pass'` 当且仅当 `blockers == []` | `forge/_shared/gate_record.py` |

### 6.4 付出高昂代价学到的四条规则

这些应该进入技能，因为每一条在被理解之前都产生过*自信的错误发现*，而且每一条都不只适用于这条龙。

1. **通过 object-ID 通道测量可见覆盖区域——不要用单独渲染，也不要用"完整减去隐藏"。** 单独渲染会显示参考图看不到的
   几何：龙翼测得暗部占比 0.4362，而参考为 0.2240（"翼骨粗了一倍"）；在*原始*半径下正确测量，结果为 0.1891 对
   0.2240——在容差之内。翼骨从来就不粗。显而易见的修法——整帧减去隐藏该部件后的帧——同样是错的：那部分像素差异的
   71% 来自间接光照变化，而非遮挡。只有带深度测试的纯色 ID 通道才能给出真实的最前覆盖区域。
2. **稳健地归一化——前景质量的第 2–98 百分位——两侧完全相同。** 最小/最大包围盒归一化让每个视角都损失约 0.10 IoU，
   并产生了一个宽度结论，它不仅幅度错误，而且**方向相反**："过宽" 5.34× 实际上是窄 0.85×。线索在于自洽性：五个
   视角的最小/最大比例读数为 5.34 / 1.39 / 2.70 / 2.56 / 0.26（不一致），而稳健比例读数为 0.85 / 0.50 / 0.59 /
   0.59 / 0.60。
3. **拒绝在未收敛或被截断的对齐上做决定。** showcase 中每个锁定的逐视角下限都来自一次被截断的搜索。那个"最差视角"
   在锁定值 0.4838 上被追了约 50 轮，收敛后读数为 0.5002，在稳健归一化下为 0.6112——**完全没有任何几何改动。**
   锚定在搜索边界上的棘轮，锚定的是边界，而不是最优解。
4. **两个工具意见不一致本身就是信息，而且较新的那个不一定对。** 把翼骨变细改善了新的特征指标，却让受信任的轮廓棘轮
   在一个视角上损失 0.0075 IoU——是其容差的两倍。棘轮是对的。调查分歧；绝不让刚写好的指标推翻一个已受信任指标上的
   退步。

还有一个值得编码进相机求解的开放判别项，因为它对任何图像匹配流水线都通用：**部件包围盒膨胀和截图 FOV 透视不匹配
预测出相同的特征**（"下移并放大"）。它们靠局部性区分——部件膨胀是局部的（LOCAL），所以排除可疑部件后 `dy` 应趋近于
零而 `scale` 不变；透视不匹配是全局的（GLOBAL），所以 `dy` 随视角变化，并且在包含所有部件时依然存在。这应归入
`ReferenceCamera.fovEvidence`。

---

## 7. PBR：从 TRELLIS.2 借鉴什么

- **不透明度作为一等通道。** TRELLIS 逐体素携带 `alpha`。img2threejs 通过 `analyze_texture.py` 有
  `transmission`/`ior`，但无法把"薄、半透明、双面表面"*声明*为拓扑 + 材质的组合。翼膜、树叶、披风和灯罩都需要它。
  这与新的 `open-shell` 拓扑类和 `MaterialSpec.doubleSided` 配套。
- **强制外观以几何为条件。** TRELLIS 把形状潜变量作为 `concat_cond` 传入 `sample_tex_slat`。这里可强制执行的版本是：
  若某部件的几何单元格失败，路由器必须**拒绝**对该部件材质的 `refine-code`。材质改动不得被当作形状错误的修复——
  而在整图门禁下，它经常看起来就像修复。
- **在结构上保持通道独立。** 这条规则已存在于 `grimoire/feedback/shading_realism.md`（"绝不把 albedo 混叠进
  roughness/normal/AO"）。让它机械化：一次提取器调用写一个通道，各自带 `source` 和 `confidence`。
- **从单张光照未知照片得出的粗糙度和金属度保持仅报告。** 这已经是规则；`lightingUnknown` 使其自动化，而不再依赖自律。
- **优先使用生成的表面细节，而不是由照片得出的法线贴图。** 从参考图烘焙的法线贴图与参考图的光照纠缠在一起。在无法
  避免时，要求以去光照的 albedo（`delight_albedo.py`）为来源，绝不用原始裁剪图。
- **增加重新打光自检。** 在两个不同环境下渲染同一部件；若两者相对参考图的 ΔE00 评分相差超过阈值，说明材质在*补偿
  光照*而不是描述表面。这很便宜，直接受 TRELLIS 可重新打光论断的启发，并能捕捉最常见的 PBR 作弊。

---

## 8. 具体的文件级改动清单

### 新增

| 路径 | 用途 |
|---|---|
| `forge/stage2_structure/solve_occupancy.py` | S1：把 `visual_hull.py` 提升为必需的占据产物；提高 32³ 上限 |
| `forge/stage2_structure/proportion_anchors.py` | 比例 + 对称求解，包围盒判定依据 |
| `forge/_shared/part_shell.py` | open-shell / 双面零厚度场；与 `sdf_primitives.py` 并列 |
| `forge/_shared/geometry_tiers.py` | T0–T5 阶梯、路由表、升级/降级规则 |
| `forge/_shared/provenance.py` | 由内容派生的运行 ID 和阶段哈希（从 showcase 移植） |
| `forge/_shared/gate_record.py` | 带 pass/blockers 不变式的自描述门禁 JSON |
| `forge/stage4_review/microscope/` | 特征级切片、SDF + 方向 Chamfer + 曲率 + ΔE00、最差切片聚合 |
| `forge/stage4_review/microscope/id_pass.py` | object-ID 覆盖区域提取 |
| `forge/stage5_rig/` | S4：骨架、蒙皮权重、关节限位、blendshape 桩及其门禁 |
| `forge/runtime/capture/` | 按计划驱动的多视角截图，带 ID 通道和背景硬失败 |

### 修改

| 路径 | 改动 |
|---|---|
| `forge/stage2_spec/validate_sculpt_spec.py` | `schemaVersion: 2`；在 `VALID_TOPOLOGY_CLASSES:58` 中加入 `open-shell`；用档位路由表扩展 `DISALLOWED_TOPOLOGY_PRIMITIVE_PAIRS:71`；校验 `Part.confidence`、`Channel.gating`、`editability.refitCommand` |
| `forge/stage2_spec/new_sculpt_spec.py` | 编写 S3S；逐部件置信度；逐通道材质来源 |
| `forge/stage2_spec/derive_geometry.py` | 档位选择 + 对照占据场做参数拟合 |
| `forge/stage3_build/orchestrate_passes.py` | **逐部件**轮次状态；先几何后材质的顺序门禁（`:387-420`） |
| `forge/stage3_build/module_cache.py` | 一个失败单元格恰好使一个模块失效 |
| `forge/stage3_build/generate_threejs_factory.py` | 输出 T4 场网格化和 T5 `refitCommand`；让每个档位都保持为带 pivot/socket/材质的命名部件 |
| `forge/stage3_build/visual_hull.py` | 移入 S1；把 `MAX_VISUAL_HULL_RESOLUTION:7` 从 32 调高 |
| `forge/stage4_review/divine_eye.py` | 稳健的前景质量归一化；输出对齐收敛状态；`LUMA_SIZE`/`EDGE_SIZE` 只保留为*宏观*档 |
| `forge/stage4_review/per_feature.py` | 消费显微检查指标，而不只是预先计算好的评分字典（`:59`） |
| `forge/stage4_review/correction_loop.py` | 单元格级历史；拒绝在未收敛对齐上做决定；按命名部件路由 |
| `forge/stage4_review/make_comparison_sheet.py` | 在整图对比图旁加入逐特征放大面板（`:216`） |
| `forge/stage1_intake/build_detail_inventory.py` | 以命名 ROI 编写作为默认路径，而不是 `DEFAULT_COMPONENT_ZONES:38`（在 `:198` 使用）的上/中/下三等分 |
| `forge/stage1_intake/solve_camera_pose.py` | 输出 `fovEvidence`；运行 §6.4 中的局部性判别 |
| `forge/stage1_intake/extract_pbr_evidence.py` | 一次调用 ⇒ 一个通道，各带 `source`/`confidence`/`gating` |
| `forge/stage4_review/fit_params.py` | 扩展 `fit_against_divine_eye()`，使其对照占据场拟合 T1/T2 参数，而不只是对照门禁标量 |

---

## 9. 按优先级排序的路线图

### 速赢——数天，不改架构

1. **逐个已声明特征输出 `insufficient-reference-resolution`。** 它在 `grimoire/review/divine_eye_microscope.md` 中
   已有规定但尚未实现。它能阻止一整类错误门禁：参考图无法分辨的特征目前会得低分，而不是被排除。
2. **object-ID 截图通道 + 逐部件覆盖区域。** 移植 `capture-views.mjs` 和 `component_report.py`。这是价值最高的
   单项移植——正是它把整图评分变成逐部件评分。
3. **在所有归一化轮廓的地方使用稳健的前景质量归一化**（`divine_eye.py`、`diagnose_render.py`），并提升指标版本号，
   使缓存的对比失效。
4. 在 `correction_loop.py` 中**拒绝在未收敛对齐上做决定**，并在记录中暴露收敛状态。
5. **逐通道 `source`/`confidence`/`gating` + `lightingUnknown`**，在光照未求解时机械地把 roughness/metalness 降级为
   仅报告。

### 中期

6. **S3S schema v2**——增补式超集，并用迁移测试证明每个 v1.5 spec 仍能通过校验。
7. **S1 Structure 阶段**——把占据作为必需产物和比例判定依据。
8. **逐部件轮次状态 + 先几何后材质的顺序门禁。**
9. **局部化重新生成**——一个失败单元格使一个模块失效。
10. **T0–T5 档位阶梯**，带路由和双工具升级规则。
11. **特征级显微检查**——`setViewOffset` 切片、SDF/方向 Chamfer/曲率/ΔE00、最差切片聚合、不做平均。

### 重大架构改动

12. **部件壳场层**（`open-shell` + 场拟合）。这是真正为有机和薄膜类主体提高保真度上限的改动，因为它去掉了 SDF 的
    零厚度限制——正是 TRELLIS.2 用 O-Voxel 去掉的那个限制。
13. **规模化的合成分析拟合**——对照占据场和轮廓，对 T1/T2 参数做有限差分拟合。`fit_params.py` 和
    `grimoire/build/analysis_by_synthesis_fitting.md` 是起点。
14. **带绑定正确性门禁的 S4 Articulation 阶段。** "可动画"承诺目前只做结构检查（`sculptRuntime` 已填充），从未
    检查正确性。
15. **可选的稠密证据适配器。** 如果离线可获得 TRELLIS 级的输出，就把它作为**用于拟合语义部件的稠密证据层**导入——
    绝不作为输出，绝不作为依赖。没有它时，流水线必须产出相同的产物。

### 按影响排序的前 10 项

| # | 改动 | 影响 | 成本 |
|---|---|---|---|
| 1 | object-ID 通道 + 逐部件覆盖区域 | 让每个评分都细化到部件；为局部化修正扫清障碍 | S |
| 2 | 稳健归一化 + 收敛报告 | 消除约 +0.10 IoU 的纯测量误差；阻止错误发现 | S |
| 3 | 按命名部件路由的单元格级修正循环 | 修正不再是整个物体的重写 | M |
| 4 | 带最差切片聚合的特征级显微检查 | 小的身份特征终于变得可测量 | M |
| 5 | 部件壳场 / `open-shell` 拓扑 | 去掉零厚度限制——真正的上限 | L |
| 6 | S1 Structure 阶段作为比例判定依据 | 在任何细节工作之前修正比例/包围盒错误 | M |
| 7 | 先几何后材质的顺序门禁 | 阻止材质掩盖形状错误 | S |
| 8 | 带可执行置信度和逐通道门禁的 S3S v2 | 让"不对无法测量的东西设门禁"机械化 | M |
| 9 | 带双工具升级的 T0–T5 阶梯 | 表达力增长而不丧失可编辑性 | M |
| 10 | S4 articulation 阶段 + 绑定门禁 | 让"可动画"成为经过测量的论断 | L |

---

## 10. 对问题的回答

**img2threejs 通过借鉴 TRELLIS.2 的*表示策略*和*条件化阶段顺序*来弥合保真度差距，同时保持语义树作为输出，并把稠密
表示降级为测量和拟合的目标。**

具体来说，是对当前设计的三处反转：

1. **测量处稠密，输出处语义。** TRELLIS 端到端稠密；img2threejs 端到端语义。两者都不对。为每个主体求解一个廉价的稠密
   占据场、为每个部件求解一个壳场，然后把命名的参数化部件*拟合*到它上面。场永远不发布。发布的是 Group。正是这一点让翼膜
   可以存在而无需 SDF 去加厚它，也是真正抬高上限的改动。

2. **按条件关系而非便利性排列阶段。** TRELLIS 的流水线先确定占据再确定形状，先确定形状再确定外观，并把形状潜变量作为
   显式条件向前传递。img2threejs 的八个轮次按固定顺序运行，但并不*互为条件*：材质轮次可以在视觉上补偿几何错误，而整图
   门禁会接受它。把顺序变成门禁，而不是惯例。

3. **细化单元格，而不是物体。** TRELLIS 的级联只细化需要细化的 token。img2threejs 重新生成整个工厂函数，并基于一个标量
   重新决策。把决策单位移到 `(view, component, feature)`，保持最差优先、不做平均的聚合方式，并只重新生成一个模块。可用的
   实现已存在于 showcase checkout 中——剩下的工作是提升，而不是发明。

不能拿来交换的东西，上述任何一项也都没有拿来交换：每个部件都保留名称、变换、pivot、socket 和碰撞体、材质引用以及
动作绑定。T5 逃生口烘焙的是*顶点数据*，绝不是*层级*，并且它携带重新生成它的命令。可编辑性只在叶子处降级，绝不在树上降级。

诚实的限度，在本研究所支撑的任何报告中都应写明：**由一张照片拟合出的稠密场，仍然只有一张照片的信息量。** 更高分辨率的
测量不会创造参考图中从未包含的证据。这就是为什么速赢中的第 1 项是 `insufficient-reference-resolution`——在给流水线更锐利
的工具让它说得更自信之前，它需要先能说出"这张图无法分辨这一点"。

---

## 来源

- [microsoft/TRELLIS.2](https://github.com/microsoft/TRELLIS.2)
- [TRELLIS.2 项目页面](https://microsoft.github.io/TRELLIS.2/)
- [Native and Compact Structured Latents for 3D Generation (arXiv 2512.14692)](https://huggingface.co/papers/2512.14692)
- [Hugging Face 上的 microsoft/TRELLIS.2-4B](https://huggingface.co/microsoft/TRELLIS.2-4B)
- [img2threejs](https://github.com/img2threejs/img2threejs)——以及本地 checkout，它是上文所引文件路径和 schema 行号的权威来源。
