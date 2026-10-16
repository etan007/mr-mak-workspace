# 更新日志

**img2threejs** 的所有重要变更都记录在此。

格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)，
本项目遵循[语义化版本](https://semver.org/spec/v2.0.0.html)。

## [Unreleased]

**The Character Split——目标 v2.1。** 基础层的 `character` 领域并入 `plugin-character`，使基础层
不指名任何领域，v2.0 的插件拆分就此收尾。

- 移除仓内的 `character` 领域；`plugin-character`（已在提供 `animated-character`）承载完整的角色
  工作流——解剖、头发、材质、Stage R 绑定与动画。
- 接缝得到加固：在校验处强制 pass-id，切断基础层到插件的入向导入，契约新增一条禁止基础层导入插件
  代码的条款。
- 验收规则：迁移前后，角色构建对相同输入持续输出相同的 Three.js 结果。每一行以 character/rig 命名
  的代码属于基础机制还是领域内容，要在移动任何文件*之前*写下划分。

## [2.0.0] — 2026-09-05

**The Plugin Update。** 插件生态——领域注册表、img2 harness、由插件提供的领域——作为独立的大版本
发布，从原先的 Procedural World 版本提前。

### Changed — BREAKING

- **`cs2` 由已安装的 `plugin-cs2` 提供**（`img2 add img2threejs/plugin-cs2`，需要 harness >= 0.2.1）。
  仓内的领域模块被移除；没有插件时该 profile 会响亮地失败并列出可用项，进行中的工作区在提供方缺失
  期间被拒绝，重新安装后原样恢复。领域一致性仍由基础层的 `validate_cs2_contract` 强制执行；插件自带
  阻断性的 `cs2-review` 门禁。

- **`animated-character` 由已安装的 plugin-character 提供**（`img2 add
  img2threejs/plugin-character`，需要 harness >= 0.2.3）。仓内的领域模块被移除；没有插件时该 profile
  会响亮地失败并列出可用项，进行中的工作区在提供方缺失期间被拒绝，重新安装后原样恢复。已持久化的
  检查清单**不会**迁移：切换前初始化的工作区保留基础层的 `forge/stage5_rig/...` 命令并运行基础库的
  副本——重新 init 才能采用插件的步骤。门禁参与现在感知绑定：声明了 `rigSteps` 的领域在其绑定路线
  开始之前不会到期，因此 plugin-gates 扫描不再提前一个阶段触发绑定门禁。注册表本身损坏时，
  `state.py` 会降级为只提供 generic profile，而不是对每个 profile 都崩溃。

- **不再根据目标名称推断领域。** `detect_cs2_intent` 及其 17 个关键词的表（包括裸的 `"fade"` 和
  `"karambit"`）被移除，因此名为 `"AK-47 | Redline"` 或 `"Karambit Doppler"` 的目标不再自认为是
  CS2——它会像其他任何物体一样解析到通用的 `core_3d` 证据集合。请改为声明领域；`--cs2` 和
  `--profile cs2` 不变。名称相似不是合法的解析输入（`PLUGIN_CONTRACT.md` §13），而旧的启发式会把
  CS2 的质量下限和证据集合静默套用到任何名字里恰好含有这些词的东西上。
- 本地 spec 检索集合现在默认为 `core_3d` 而不是 `cs2`。该步骤在每个 profile 上都会运行，所以之前
  每次通用运行默认都在检索一个领域语料库。
- `objectClass.cs2: true` 被 `objectClass.domain: "<id>"` 取代。在此变更之前编写的 spec 带有旧字段。
- `weapon-v1.4` 不再要求 CS2 标记才能通过严格校验。它是武器*形状*模板，按分类出的类型键控，而 CS2
  是搭在通用硬表面路径上的表面处理/材质领域——所以要求该标记意味着一把普通的剑只有被标成 CS2
  皮肤才能通过。领域一致性仍由 `validate_cs2_contract` 强制执行。

### Added

- `forge/_shared/domains/`——领域注册表。每个模块声明一个 `DOMAIN` 映射，贡献检查清单步骤、拼接
  锚点和证据集合；注册以存在与否为准，因此基础流水线不持有任何领域名称列表。`--profile` 的可选项
  由它派生，未注册的 profile 会响亮地失败并列出可用项，而不是悄悄以 generic 运行。
  `workflow_state.py` 和 `forge/state.py` 现在完全不包含任何领域名称。

**主题：绑定只能做加法。** 1.5.2 的模块已经存在，却从来没有任何东西运行它们；动画会破坏网格，
因为工作流中没有任何步骤禁止这样做，也没有任何门禁能区分已绑定的网格和被损坏的网格。本次变更闭合了
门禁与本应强制执行它们的流水线之间的回路。

### Added（绑定与动画工作流，从 main 合并）

- **`animated-character` 工作流 profile**（现为 `forge/_shared/domains/animated_character.py`——在本
  分支合并 v1.5.2 时，从硬编码的 `RIG_STEPS` 移植进领域注册表；注册表新增了 `rigSteps` 键，追加在
  FINAL 步骤之后）。九个 Stage R 步骤加入检查清单：阅读契约、从 GLB 读取绑定、修复网格、冻结网格、
  校验载荷、绑定、验证一致性、测量动画片段、运行门禁。此前每个 `forge/stage5_rig/` 模块都可以调用，
  但工作流中从来没有任何东西告诉任何人去调用——`next.py` 按检查清单行进，所以不在清单中的门禁永远
  不会运行，而从不运行的门禁会永远报告干净的结论。
- Stage R 的顺序由 `forge/tests/test_rig_workflow_steps.py` 强制执行，而不是靠约定。修复先于冻结；
  冻结先于每个绑定步骤；一致性在绑定之后验证。把冻结挪后会让绑定改写顶点后再为改写过的缓冲区背书，
  于是 manifest 会为损坏作证而不是捕获它。
- **`forge/stage5_rig/mesh_parity.py`**——冻结几何，然后证明它完好无损。哈希基于打包后的字节而不是
  JSON 文本计算，因此格式化器改变主意不会被报告为变更，而数值的改变也无法被格式化成碰撞。
  `position`、`normal`、`uv` 和 `index` 被冻结；`skinIndex` 和 `skinWeight` 刻意不冻结，因为添加它们
  正是绑定的全部合法目的——冻结它们会让每次成功的绑定都失败，这个门禁不出一天就会被关掉。哪怕只有
  一个浮点数被轻微改动也会被捕获，并定位到网格、属性、元素以及前后两个值。
- **`forge/stage5_rig/glb_rig_reference.py`**——从 GLB 中读取骨架、蒙皮的关节顺序、逆绑定矩阵和动画
  片段，并把它自己的动画通道采样为 `clip_features` 所消费的载荷。与程序化骨架的关节对应按测量位置
  匹配，绝不按名称，且任一侧有任何关节未匹配时报告 `usable: false`。GLB 的通道指向其节点索引，其
  `skinIndex` 值寻址其关节数组；把它们喂给程序化编写的骨架，索引到的就是完全不同的另一套绑定。
- **`runtime/scripts/export_mesh_buffers.mjs`**——原始几何缓冲区，不含 `matrixWorld`。
  `export_mesh_geometry.mjs` 输出世界空间，这对自相交检测是正确的，但对一致性检查在两个方向上都是
  错的：摆姿势会改变 `matrixWorld` 而不动缓冲区的任何字节，而被补偿变换抵消掉的真实缓冲区编辑会
  被读成没有变化。
- **`docs/GLB_ANIMATED_CHARACTER_PROMPT.md`**——一份可直接复制的提示词，一次性把对象从 GLB 带到
  已绑定、有动画、通过门禁的角色。

### Fixed

- `forge/stage5_rig/emit_rig.py` 在 `updateMatrixWorld` 之前构造 `THREE.Skeleton`，导致
  `calculateInverses()` 捕获到单位矩阵，静止姿态从未被抵消，每个顶点都偏移了其骨骼的偏移量。这种
  失败能编译、能绑定、报告 `bound: true`，渲染出来却是一具尸体。主 factory 发射器早已按正确顺序
  处理；只有 Milestone-0 发射器没有。
- `forge/stage3_build/generate_threejs_factory.py` 现在拒绝对同一几何烘焙两次。`applyMatrix4` 原地
  修改且不幂等，所以第二次会应用世界矩阵的平方，把部件打散。它选择抛出异常而不是跳过，因为静默
  跳过会让网格留在错误的空间里，之后以更隐蔽的错位重新出现。

### Changed

- `docs/pipelines/character-rigging-animation-1.5.2.md` §R0.1 中有一条无法复现的说法。它引用 Lee Sin
  绑定来说明"clips target technical nodes that are not joints"；在该资产上重新测量后，**全部 11 个
  动画片段的全部 1,353 个通道都指向形变关节，指向技术节点的为零。**规则仍然成立——正是它保持了蒙皮
  索引空间的完整——但现在被表述为它所防范的风险，而不是一条观察结论，并且 `deformVsTechnical` 会按
  资产报告真实数量。

### 本版本的已知限制

- 基础技能仍然指名 `character` 领域（`forge/_shared/domains/character.py`）。完整提取——解剖、头发、
  材质——在 v2.1 落地，届时 v2.0 的拆分收尾。

## [1.5.2] — 2026-08-25

**主题：存在的动画片段不等于能播放的动画片段。** 1.5.1 中的绑定失败并不是"动画看起来有点不对"——
它们是彻底且无声的：十一个动画片段持有 action，mixer 持有状态，按钮触发了，却什么都没动。两个独立
的 bug 各自产生了一个看似合理但完全静止的场景，而且两者在代码评审中都不可见。本版本把从那次构建中
提炼出的流水线变成可执行的模块和门禁。

### Added

**动画流水线——`forge/stage5_rig/`**
- `clip_features.py`：§1 测量词汇（duration、travel、rise、speed、handRange、footRange、headRise、
  scaleDelta、poseReturn），以 N = 25 采样；§2 分类器；§3 命名及 `inferred` 诚实标志；以及 §4 循环
  规则。`scaleDelta` 是绊线而不是描述符：非零值意味着源绑定会缩放关节，这会改变 R2 对蒙皮权重能
  合法做什么，因此它会在任何其他步骤继续之前被暴露出来。
- **循环规则已修正，旧规则被固定为回归测试。** 1.5.1 使用"既不位移也不升高的动画片段可以无缝重复"，
  这与它自己的数据相矛盾——`idle-gesture` 位移 0.121H，是待机阈值的六倍，却能正确循环。现在循环的
  判定是 `poseReturn ≤ 0.5°` **且** `‖hip(T) − hip(0)‖ ≤ 0.01H`。无法测量 `poseReturn` 的宿主得到
  `loop = None`，绝不是默认的 `false`——"测量过，不循环"和"没人看过"是不同的答案。
- `skin_conditioning.py`：用于由重叠部件构成的角色的邻近权重混合。混合前先做稠密累加，缓冲写入使
  结果与顺序无关，每个半径一个单元格的均匀网格哈希（每次查询 ≤ 27 个桶），内部顶点保持逐位不变。
  重合焊接作为已执行的负面结果保留：它闭合了一条裂缝，却留下 28 帧仍有裂缝，因为相邻部件是重叠的，
  而不是共享边缘。
- R2 的取舍在其运行的每个地方都明确写出而不是埋起来：混合能闭合孔洞（30 个斑块中的 974 px → 15 个
  中的 287 px），但会让褶皱恶化约 16%（31,316 px → 36,470 px）。孔洞露出的是背景，褶皱露出的是
  皮肤。后续阶段不得通过禁用它来"修复"褶皱计数。
- `action_design.py`：§R4 目标区间、拓扑驱动的骨链解析（手臂、腿和脊柱的解析不读取任何一个关节
  名称）、能捕获镜像绑定的内侧/外侧门禁、带真实支撑/摆动区间的步态相位机，以及 `foot_slide`——这个
  门禁能捕获看起来"飘"或"滑冰"、但肉眼难以说清的步态。
- `rig_gates.py`：G1–G10 运行器。**输入缺失的门禁报告 `unevaluated`，绝不是通过**，任何未评估的
  门禁都会使整份报告为 not-ok。
- `emit_animation_runtime.py`：把 R1/R5 运行时输出为 TypeScript——附着模式下的单位绑定、只根据网格
  包围盒得出的显示偏移、为延迟构建的角色提供的 `refreshTickers()`、tick 循环前后的爆炸偏移顺序，
  以及控制器契约。循环从未被测量过的动画片段会输出 `LoopOnce` 并附注释说明，绝不静默输出
  `LoopRepeat`。
- `docs/pipelines/character-rigging-animation-1.5.2.md`（推导过程与失败日志）、
  `forge/stage5_rig/CONTRACT_1.5.2.md`（模块地图与载荷结构）以及
  `grimoire/readiness/animation_contract.md`（Stage R 阶段读取的路由文件）。

### Fixed

- **§R4 的肢体区间按原文是无法满足的，实现证明了这一点。** §1 把 `handRange`/`footRange` 定义为世界
  空间范围；按此定义，向前行进的步态会得到 `footRange ≈ travel` 和 `handRange ≈ travel + swing`，
  因此任何速度都落不进所述的 `0.15H–0.25H` / `≈ travel/2` 区间。肢体区间是相对于髋部的，现在已明确
  写出；全局特征保持世界空间，这是 §2 分类器唯一有意义的参考系。
- `footRange ≈ travel / 2` 比较的是两个不同的量：`travel / 2` 是交替落脚之间的步长，`footRange` 是
  位置范围。`≈` 按 ±30% 理解。

## [1.5.1] — 2026-08-22

### Added

- 新增纯代码的皮肤与布料材质 profile，并校验引擎钳制、折叠 uniform 和 sheen 配置。
- 根据测量包围盒为多部件 GLB 节点打标签，同时在渲染确认之前明确将语义分配保持为临时状态。
- 新增针对平涂色顶点区域以及扫掠弧弯曲、跨度和锥度的已执行几何门禁，并在 render-profile v2 中
  要求声明语义区域。

### Fixed

- 对 `SKILL.md` 去重，合并为一个连续的重建循环，使每个宿主加载同一套权威的门禁序列。
- 在 SDF 四边形 pass 中约束全部三个轴，防止在采样网格边界处出现越界和混叠的单元格读取。

## [1.5.0] — 2026-08-12

**主题：The Character Update。** 角色不再是风格化的近似。骨架从组件树推导并绑定到真实的
`SkinnedMesh` 几何，头发获得贯穿全部五个阶段的独立子系统，左/右成为可导入的常量而不再是一条注释。
这里新增的每个门禁都可追溯到一次被测量到的（而不是想象出来的）回归。

本版本取代了未发布的 `1.4.4-beta.1`/`1.4.4-beta.2` 系列以及 `v1.5-beta` 标签。
`1.4.4` 从未作为稳定版本发布。

### Added

**可直接用于动画的绑定——新增 `forge/stage5_rig/`**
- 从组件树推导出经过校验的 `RigSpec`，而不是在其旁另行编写骨架，使骨骼不会偏离它们驱动的几何。
  一个生成的人形有 61 个组件和 49 根骨骼（骨盆、3 节脊柱、2 根锁骨、8 根手臂骨、6 根腿骨、头、颈、
  30 节指骨）。
- 按父级优先输出骨骼层级、一个共享的 `THREE.Skeleton`、唯一一个顶点权重辅助函数，并把每个蒙皮组件
  绑定为 `THREE.SkinnedMesh`。`root.userData.rig` 如实报告 `bound`，而不是直接断言。强制要求：
  `|Σw − 1| < 1e-5`、每个 `skinIndex` 都在范围内、没有权重和为零的顶点、通过 `Map` 查找骨骼。
- 在构造 `Skeleton` 之前调用 `root.updateMatrixWorld(true)`，因为 `calculateInverses()` 读取的是每根
  骨骼当前的世界矩阵，而这些逆矩阵正是抵消静止姿态的东西。顺序错误时它会捕获单位矩阵，每个顶点在
  静止时都会偏移其骨骼的偏移量——这是测量所得，不是假设。
- 新增 `forge/stage5_rig/geodesic_skinning.py`：权重来自*穿过实体*测量的距离，基于 26 连通的体素网格
  和真实步长，使衰减不会沿网格轴偏置。任何骨骼都无法到达的顶点会被报告，绝不悄悄钉到空间上最近的
  骨骼。
- 新增 `forge/stage5_rig/validate_rig_payload.py`，它只证明结构性载荷完整性。姿态压力、动态包围盒和
  视觉相似度仍是独立的门禁，这一点被明确写出而非暗示。
- 新增标准人形比例（`forge/stage2_spec/humanoid_proportions.py`）以及可达的角色子路线。

**头发——贯穿全部五个阶段的子系统**
- 替换掉原先构成全部头发生成的那一个 `ellipsoid`。完整契约、其背后的每项测量以及每个明确的非目标：
  `docs/HAIR_PIPELINE.md`。
- 新增 `forge/_shared/scalp_field.py`：到由一叠椭圆环构成的头骨的有符号距离，从头部组件推导而不是
  重复编写。符号是精确的；幅值是一阶估计，误差偏向推得更远，这是安全的方向。
- 新增 `forge/stage1_intake/extract_hair_evidence.py`，终于写入了自 v1.2 起就存在但一直未填的
  `faceLandmarks.hairline` 槽位，并测量分带覆盖、高光带位置以及发根到发梢的亮度差。从未见过的视角
  报告为 `notObserved`，而不是像测量过一样编写。
- 新增 `forge/stage2_spec/hair_profile.py`：发型 schema 及其校验。发根以 `(u, v)` 绑定到头皮；绝对
  发根位置是硬性错误，这让有记录的"发团从头骨上滑落"失败在结构上不可能发生，而不是靠小心。
- 新增组件属性 `standProud`，由输出的逐顶点间隙推进（`applyStandProud`）强制执行。这把 `hug` 从手写的
  showcase 演示中泛化到技能里。`maxPush` 是必需的而非可选：不设上限的推进会把内侧顶点推穿目标、
  从另一侧穿出。
- 新增 `forge/stage4_review/scalp_exposure.py`，一个**硬**门禁，在渲染任何东西之前从几何上找出秃斑。
  轮廓 IoU 看不到它们（只有约 11% 的人物单元格位于轮廓线上），内部差异也无法把它们与颜色偏移区分开。
  它只统计位于头骨*外部*的头发——最近邻测试会放过失败的构建，因为那些顶点仍在附近，只是沉到了表面
  以下。
- 新增 `forge/stage4_review/hair_gate.py`，把硬失败（秃斑，永远是错的）与软信号（覆盖不足，往往是
  正确的折中）分开，使两者不再以同一种方式应对。覆盖不足本身绝不能成为加宽发团的理由。
- 新增无需任何贴图的 `hair.human.code-only` 材质 profile，以及沿发团自身轴线（而不是世界 Y 轴）
  渐变的 `rootTipGradient` 顶点色渐变。

**左与右**
- 新增 `forge/_shared/chirality.py`。`CHARACTER_LEFT_SIGN` 是推导出来的，不是选定的：在
  `forward: +Z`、Y 轴向上的右手坐标系中，角色自身的左侧是 `+X`。它之所以是常量，是因为注释无法被
  导入，而两份 checkout 已经在这一点上产生了分歧。
- `validate_chirality` 是 spec 阶段的硬门禁，会指出一对之间的实际关系（`rotation` / `translation` /
  `unrelated`），而不是只报告"不匹配"。通过同时对 x *和* z 取反构建的一对是 180° 旋转，而旋转保持
  手性，所以两条肢体会变成同一侧的手。修正后，人形的手部区域在正面视角下与参考的距离缩小了 46%。
- `chirality.medial_lateral_bias` 能捕获成对测试在结构上无法捕获的问题：两侧以*同样*方式出错的一对
  仍是彼此完美的镜像。阈值 `0.025` 依据实测的参考脚部（`+0.0403`、`+0.0579`）校准——最初猜测的
  `0.05` 会让该门禁对其本应捕获的缺陷视而不见。

**评审门禁**
- 新增 `forge/stage4_review/interior_difference.py`：轮廓*内部*的外观差异，按高度分带，每个视觉 pass
  都必须运行。轮廓 IoU 只读取约 11% 的人物单元格，所以一张完成的脸和删掉脸的同一模型都得到了
  `0.8803`，而加上一整张嘴让分数变化了 `-0.0002`——方向还是错的。轮廓指标绝不能成为修正循环优化
  内部工作所依据的信号。
- 新增 Divine Eye 拟合循环（`forge/stage4_review/fit_params.py`），把确定性的参数到渲染回调连接到
  有界、感知门禁、带明确来源记录的优化。
- 新增逐特征修正、自相交、转台、附着锚点、关节环、两两穿插以及几何完整性门禁。
- 新增 Python ↔ Three.js 渲染桥和 render profile v2，并带截图读回校验。
- 新增 `forge/stage4_review/compare_region_passes.py`，它会阻止成对浏览器诊断 pass 不支持的分区域
  声明。

**材质流水线**
- 新增区域裁切准入、PBR 提取和注册表解析（`material_region_analysis.py`、
  `forge/materials/reference.py`），spec 交接（`apply_material_analysis.py`），确定性的相机/裁切/
  显微计划（`material_views.py`），分区域比较器、有界材质反馈、跨 pass 兼容性，以及阻断性的
  `material_gate.py`。注册表从不单凭颜色做决定；含糊或低置信度的区域保持 `probe`/`request-input`。

**构建**
- 新增 `tapered-sweep` 基元：`rx`/`rz` 随各站点变化，取向使用平行传输，因为 `extrudePath` 的 Frenet
  标架会在拐点处翻转 180°。此前任何收尖的东西都无法构建，所以发束、角和尾巴都是用等半径的片段拼成，
  看起来像面条。当各站点实际上没有收细时，校验器会发出警告。
- 新增受细分档位限制的 SDF 基元和细分曲面、UV 展开、视觉外壳雕刻、morph target 以及二次误差简化。

**Intake**
- 新增相机拟合求解器、`probe_glb.py`（来源、包围盒、场景清单以及保守的语义就绪评估）以及语义分解。
- 新增可选、隔离的 SAM2 / MediaPipe / Depth Anything V2 证据适配器（`run_vision_adapter.py`）。它们
  从不批准 pass，也从不提供几何。
- 新增纯标准库的 baseline JPEG 解码器，对不支持的 progressive/12-bit/CMYK 模式有显式回退，使常见
  输入不再依赖仅限 macOS 的 `sips`。

**工作流**
- 新增仓库本地的强制工作流检查清单、恢复门禁以及有证据支撑的步骤跟踪，位于
  `.img2threejs/state.json`，`generic`、`character` 和 `cs2` profile 会按顺序插入各自必需的 intake
  门禁。
- 新增从 `reviewHistory` 推导的每 pass 与总计修正上限；达到任一上限时 `forge/next.py` 硬停止。
- 新增失败即关闭的流水线路由（`forge/_shared/pipeline_routing.py`）：置信度低于 `0.82` 时，路线解析为
  `request-input`，而不是在武器与角色之间猜测。
- 新增可执行的 CS2 评审 CLI 以及针对 profile 的 CS2/角色检查清单门禁。
- 为每个 profile 新增明确的适用性、投影路线和材质证据决策。

### Changed
- 解决自 v1.2 起悬而未决的头发策略问题。头发拒绝使用 `plane-card`：它需要本技能无法输出的 alpha
  纹理。默认表示档位是 `shell`，不是发束——在参考 GLB 上测量，头发表面粗糙度为 0.00338，躯干对照为
  0.00312，所以它的头发是一个光滑外壳，所有发丝细节都在纹理里。`tube` 和 `box` 也被拒绝用于头发。
- 把 `hair`、`detail`、`decal` 和 `panel` 角色排除在测地蒙皮之外。该场测量的是穿过实体的距离，所以在
  测试夹具上，头顶的一个顶点会穿过头骨获得 8.1% 的颈部权重，并在旋转时与头骨发生剪切。刚性组件从
  返回的权重中被排除，而不只是在旁边注明。
- 让基元列表只有一个所有者。`generate_threejs_factory.py` 保留了自己的一份 `VALID_PRIMITIVES`；一个在
  一份列表中存在而在另一份中缺失的基元不会报错，而是被静默改写为 `box`。
- 保留渐进披露的参考资料，同时把 CS2 intake、确定性评审门禁、自我修正、多角度评审、部件覆盖以及
  可用于动作的校验变为明确的路由器要求。
- 把每个 pass 的顺序定为：构建、渲染、Tier 1、多角度、确定性 pass 检查、profile 评审、AI 评审、同步。
- 让重新生成感知动作，使 `refine-code` 无法覆盖它必须修复的产物，并拒绝与本地状态不一致的 spec 路径。
- 让材质别名、CS2 词汇和 spec 检索示例只用英文；数据集词汇按设计保持双语。
- 通过 `IMG2THREEJS_SHOWCASE_ROOT` 而不是绝对路径解析配套 showcase，并从发布的技能中移除特定于机器
  的路径。研究提炼内容保留在本地。

### Fixed
- 允许 `tapered-sweep` 站点收缩为真正的点。半径为零的环仍然带有重合顶点和零面积三角形，所以扫掠会
  以一个浮点噪声宽度的钝帽结束——而锥度警告本会放过它。
- 通过共享的细分辅助函数解析 instanced-cluster 的基础基元，使输出的辅助函数与几何调用在该接缝处
  不会漂移。
- 读取发布工具实际写入的版本 front-matter 键。
- 把空的 IoU/边缘并集评为 `0` 而不是 `1`，并把反转或过小的前景遮罩视为不可用证据，而不是完美匹配。

### 本版本的已知限制
之所以写明，是因为 schema 读起来和一个能用的功能一模一样：
- 没有 `hairProfile` → `componentTree` 编译器。schema 会被校验；spec 仍需直接编写其头发组件。
- `scalp_exposure` 测量的是由 spec 推导的点，而间隙推进是在运行时移动顶点，所以该门禁测量的并不是
  实际发布的几何。把推进移到构建时的 Python 中，是该子系统目前仍可获得的最大改进。
- 发束档位的头发参数以及每个头发门禁阈值都是推导而非测量的，并如实报告自身如此。目前没有带分离
  头发几何的多部件 GLB 可用于校准。
- `BoneSpec.ik` 存在于 schema 中，但没有任何东西填充它。姿态扫描门禁未实现。
- 头发动力学和发丝级头发永久不在范围内：单张图片不携带运动信息，且本流水线不输出纹理或 alpha。

## [1.4.3] — 2026-07-30

目前被接受的发布线是 `1.4.x`。从受管控的 `v1.4.3` 标签起，GitHub 发布版本是权威的更新日志。

### Changed
- 发布现在只从经批准的带注释版本标签进行；合并 pull request 永远不会改变版本或创建发布版本。

## 无效的历史记录：1.5.0——未发布

下面的条目由已退役的推送到 `main` 即发布的自动化生成。保留它仅作为历史背景，并不代表一个被接受的
发布版本或发布说明基线。

### Added
- 新增 Python CI 与自动发布
- 更新更新日志和路线图
- 增强技能与严格的 cs2 组件渲染

### Fixed
- 稳定 pHash 的亮度不变性
- 让测试与评审证据门禁对齐
- 赞助捐赠链接 + 每周与全语言 Trendshift 徽章（#42）
- README 使用 logo 标志，并采用其真实宽高比（#36）
- 恢复 assets/logo.svg，使 README 的 logo 不再 404（#35）

## [1.4.1] — 2026-07-26

CS2 重建流水线的加固更新：显式组件覆盖、手枪装配契约，以及能区分真实结构与逼真纹理的评审证据。

### Added
- **装配覆盖门禁**——`stage4_review/check_part_coverage.py` 验证每个指定组件都已构建，防止多个指定
  组件塌缩进同一个网格，并报告无归属的网格以及从未进入 spec 的清单细节。
- **Glock-18 适配器**——CS2 路线现在支持专用的 `pistol` / `glock-18` 组件树，套筒、框架、弹匣、
  扳机护圈、控制件、枪管和内部机构各有独立契约；它不复用刀具拓扑。
- **结构优先的指引**——在 `SKILL.md` 和 `grimoire/build/geometry_patterns.md` 中记录了关于具名、
  可爆炸拆分和可选择部件的规则，以及爆炸视图的正确布局缩放。

### Changed
- **严格的评审证据**——在视觉 pass 可以继续之前，流水线要求去贴图 blockout 证据、有序的 pass 计分，
  以及厚度方向和长轴方向的视角。
- **几何完整性检查**——Tier 1 现在会暴露未闭合的独立几何、接缝不足、恒定的刀刃研磨以及缺失的远端
  收细，使投影无法掩盖结构缺陷。

## [1.4.0] — 2026-07-25

**主题：武器流水线。** 图像匹配的 CS2 硬表面重建：有证据支撑的身份、投影优先的表面处理匹配、按家族
区分的几何以及门禁驱动的评审。

### Added
- **CS2 intake 与来源契约**——参考准入、技术探查、身份路由、元数据查询、VPK/纹理发现，以及一个保留
  不确定性而不是猜测的原子性 `cs2-intake.json` 交接。
- **CS2 知识库与本地检索**——双语 BM25 检索 profile、精选的词汇和解剖参考，以及面向规格工作的感知
  来源的结果处理。
- **按家族区分的重建**——刀具适配器、受支持子类型校验、组件树契约、投影纹理烘焙，以及面向 CS2 资产
  的严格质量路线。
- **有证据支撑的 CS2 评审**——`cs2_review.py`、几何完整性测量、固定与环绕评审视角、家族/表面处理/
  投影/关键细节门禁，以及带版本号的评审场景元数据。
- **参考预览与提示词资产**——经浏览器冒烟测试的 CS2 刀具预览、参考夹具，以及聚焦于刀具、手枪和技术
  分析的技能提示词。

### Changed
- **投影优先的表面处理工作流**——去光照的参考裁切图是匹配皮肤图案、贴花和涂装表面的默认路径；程序化
  表面处理仍作为明确披露的回退方案。
- **Divine Eye 校准**——尺度和宽高比信号已生效，重建补救路径现在要求物体性、软保真度和比例证据，而
  不是接受仅凭 IoU 的结果。

## [1.3.0] — 2026-07-22

"质量与效率"系列：确定性优先的评审框架（Divine Eye）、更强的输入完整性、几何真实性门禁，以及基于
参考的纹理/材质分析。

### Added — Plan 1.3（阶段 1–7）
- **输入完整性**——参考准入（`check_reference_admission.py`）、intake 正确性交叉检查
  （`check_intake_correctness.py`）、属性自动绑定、共享 pHash。
- **几何真实性**——曲线扫掠（F.6）、平坦度门禁（G.1）、Blum 车削轮廓推导。
- **Divine Eye**——确定性多信号集成（`divine_eye.py`）：IoU/尺度硬门禁；比例 / 对称一致性 / pHash /
  SSIM / 边缘 / 过曝 / 平坦 / 色调一致性软信号；自不确定性 `probe` 路由。
- **多角度**——退化视角检测（`diagnose_render_multi_angle.py`）与无参考自洽性检查；自动取景。
- **眼睛判断层**——受门禁控制的 VLM 门禁（`vlm_gate.py`）、逐特征验证（§3.8）、有界停止策略（§3.6）、
  校准框架（仅报告 + 分离度检查）。
- **效率**——按模块的代码生成缓存（§3.7 邻居失效）。
- **展示**——依参考条件启用的后期特效（DOF/bloom），严格排除在评估路径之外。

### Added — 会话能力工作（并入 1.3）
- **纹理表面处理分析**——`stage1_intake/analyze_texture.py`：对表面处理分类（gem-metal / gemstone /
  painted-metal / worn-composite / brushed-steel / plastic），并写入有文档依据的 MeshPhysicalMaterial
  标量；`grimoire/build/threejs_texture_reference.md`。
- **物体性（OSIM-lite）**——`stage4_review/objectness.py`：纯标准库的类 HOG 描述符 + 余弦相似度；
  作为软信号 + 重建模式补救接入 Divine Eye。
- **`ground-blade` 基元**——带倒角的放样截面（主倒角 + swedge/假刃），加入生成器 + 校验器白名单。
- **颜色门禁修复**——`diagnose_render.py` `color_is_gated(pass_id)`（颜色硬失败只从 material pass 起
  生效，使白模 blockout 不会误判失败）。

### Added — 重建保真度升级（并入 1.3）
- **基于参考的渐变色标**——`stage1_intake/extract_gradient_stops.py`：前景遮罩下的分带中值采样，从
  参考图中提取材质的真实渐变（终结手工猜测的 STOPS），命名色相区域，并把偏蓝的紫/蓝色标（`B > R`）
  标记为 `blue-collapse`（在色调映射下塌缩为蓝色），附带偏品红的建议修正。
- **`candy-coat` 表面处理类别**——`stage1_intake/analyze_texture.py`：以介电为主的阳极氧化/PVD/doppler
  配方（metalness 0.35 / clearcoat 0.60 / envMapIntensity 0.70），使饱和的彩色涂层保持色相，而不被
  环境光吃掉；铬面高光仍为 `gem-metal`，明亮洁净的仍为 `gemstone`。另加 `paletteHueRisk` 色相存活
  注释。
- **CIEDE2000 色彩计算**——`_shared/color_metrics.py`：sRGB→CIELAB + 完整 ΔE00，经 Sharma 标准测试对
  验证。
- **感知颜色的 Divine Eye 信号（仅报告）**——`hue_zone_parity`（沿轴分带的 CIEDE2000；能捕获亮度/结构
  信号遗漏的"紫色被渲染成蓝色"）和 `specular_wash`（饱和度衰减 + 色相向青色漂移检测器）。两者在校准
  之前都以仅报告方式发布（不计入集成权重），因此永远不会静默改变结论。
- **InstancedMesh 输出**——重复系统现在输出一个 `THREE.InstancedMesh`（单次 draw call），而不是逐实例
  的 `Mesh` 克隆循环；`instanced-cluster` 基元会解析到其基础几何，而不是失败。
- **`ground-blade` UV 修复**——刀刃 UV 现在覆盖几何实际的 Y 范围，而不是硬编码的范围，因此偏离原点的
  刀刃不再把每个面都钳到明亮的刀脊边缘那一行（"整片一个颜色"/白尖 bug）；长度方向的渐变读数正确。
- **无依赖的镂空**——`extrude` 支持 `THREE.Shape.holes` + 一个 `ovalLoop` 辅助函数（例如剪线钳的椭圆
  孔），无需 CSG 依赖。

### Notes
- `forge/` 中为纯 Python 3.10+ 标准库（无需 pip 安装）。20/20 个 forge 测试套件全绿。
- 更新了 grimoire 经验：着色真实感（色调映射下的色相存活；参考胜过文字描述）、几何模式、自我修正。

## [1.2.0] - 2026-07-21

**主题：人形角色生成器。** 角色和混合对象成为重建流水线的一等公民，同时对底层代码生成器做了一轮引擎
与框架改进。

### Added

- **角色 / 混合领域检测。** 评估阶段现在能识别类似角色的形体语言，并把重建路由到感知解剖结构的路线，
  而不是硬表面物体路径。
- **人形组件模板。** 由评估阶段输出一个扁平化的人形模板，包含测量得到的头身比例、面部关键点位置和
  姿态对齐。
- **比例锁定构建 pass。** 新的门禁 pass，在形体/材质工作开始之前强制解剖比例正确。
- **特征放置构建 pass。** 新的门禁 pass，对照参考图放置并验证面部和身体关键点。
- **按部件的角色材质。** 皮肤、头发、布料和配饰材质与 Track A 细节机制集成，使风格化人物具有可辨认的
  相似度。
- **表面拓扑分类。** 按表面拓扑对部件分类，以驱动更准确的几何选择。
- **按部件的颜色 / RGBA 配方。** 显式的按部件颜色与 RGBA 材质配方，以更紧密地匹配参考。
- **Tier-1 诊断。** 生成框架的诊断报告层。
- **哈希缓存。** 内容哈希缓存，避免跨 pass 的冗余重算。
- **真正的挤出 / 车削 / 管几何。** 真正的挤出、车削和管几何生成取代了之前的近似。

### Changed

- 在完整重建框架之前重构了项目布局，包括使用带阶段前缀的脚本名，使流水线顺序更清晰。

### Docs

- 发布了公开的 ROADMAP（v1.0 → v1.5）和一份 token 成本文档。
- README 重做：3D 展示、在线演示链接、新 logo，以及动画 GIF 预览（霰弹枪、刀、war-hauler、Sony、
  Doraemon House、Crowned Loot Chest）。
- 新增 LICENSE、CONTRIBUTING 以及一份社区推广手册。
- 赞助指向越南捐赠页面（MoMo / VietQR）。

## [1.1.0] - 2026-07-15

**主题：细节优先的分析。**

### Added

- 必需的 `detailInventory` 产物，列举决定身份的微观细节（光泽区域、倒角、紧固件、雕刻/涂绘线条、
  轮廓、污渍、磨损）。
- 严格质量门禁：在每个细节都映射到真实组件或材质条目之前阻止代码生成，防止浅薄的 spec 进入渲染器。

## [1.0.0] - 2026-07-15

**主题：物体流水线。** 首次发布。

### Added

- 分阶段雕刻流水线：blockout → structure → form → material → lighting → interaction → optimization，
  每个 pass 都有视觉门禁。
- 图像适用性校验与 `ObjectSculptSpec` 编写（组件 + 材质）。
- 使用并排对比图的渲染对参考图评审循环。
- 暴露枢轴点、挂点和碰撞体的可用于动作的运行时层级。
- 省 token 的纯代码输出（可 diff 的 TypeScript + JSON spec，无二进制文件）。

[1.5.1]: https://github.com/img2threejs/img2threejs/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/img2threejs/img2threejs/compare/v1.4.3...v1.5.0
[1.4.1]: https://github.com/hoainho/img2threejs/compare/v1.4.0...4e9fbecae0e63b370581737c89991d4dca84c287
[1.4.0]: https://github.com/hoainho/img2threejs/releases/tag/v1.4.0
[1.3.0]: https://github.com/hoainho/img2threejs/releases/tag/v1.3
[1.2.0]: https://github.com/hoainho/img2threejs/releases/tag/v1.2.0
[1.1.0]: https://github.com/hoainho/img2threejs/releases/tag/v1.1.0
[1.0.0]: https://github.com/hoainho/img2threejs/releases/tag/v1.0.0
[1.4.3]: https://github.com/img2threejs/img2threejs/releases/tag/v1.4.3
