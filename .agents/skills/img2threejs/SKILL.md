---
name: img2threejs
description: 将物体或角色参考图转换为用代码构建、经过质量门禁、可直接用于动画的程序化 Three.js 模型。用于图像转 3D 重建、细节精确的物体重建、风格化/相似度最大化的人物角色、sculpt spec 以及分阶段代码生成。
license: Apache-2.0
metadata:
  upstream-version: 2.0.0
---

# img2threejs——图像转程序化 Three.js

把参考图中可见的物体重建为一个**纯代码**的程序化 Three.js 模型，由分阶段雕刻流水线和 AI
视觉自我修正循环把关。这是"用代码重建"，**不是**摄影测量、网格提取或下载美术资源包。这一承诺
约束的是模型如何被*构建*——它并不限定模型之后可以被*导出*为哪些文件格式；显式选择的输出目标
（`--target <kind>`）是对已构建模型的一次终端性、整体产物级的转换，按其自身声明的限度验证，
绝不是另一种构建模型的途径。

与代理无关：可在 Claude Code、Codex 或 OpenCode 下运行。本文凡提到"代理视觉"或"代理浏览器
工具"，都使用宿主提供的任何能力——原生图像读取、浏览器 MCP（playwright/chrome-devtools）、
项目预览，或用户提供的截图。

本文件是始终加载的路由器：它给出操作顺序，并把每条硬性规则写成一行。每条规则背后的完整契约
位于该规则所指的 `grimoire/` 或 `docs/` 文件中——在到达对应阶段时再读所指文件，不要提前读。

## 安装

这是工作流包中收录的完整 Apache-2.0 上游实现。脚本和参考资料都以本目录为根解析。将其安装到
接收方的项目中；包安装器可以额外添加第二个代理入口，指向同一份权威副本。可选的领域插件和
集成是独立的依赖，由相应的上游工作流说明。

## 何时使用

用户附上/指向一张物体图片，想要一个程序化 Three.js 模型、一份重建/动画/破坏方案、一份
sculpt spec 或代码。也适用于材质研究、可直接用于动作的道具、游戏物体、植物/机械部件以及
风格化重建。

## 核心承诺

从照片开始按顺序雕刻——绝不一次性生成网格：
1. **先运行 `python3 forge/next.py --state .img2threejs/state.json [<spec>]`**，每次开始、
   恢复以及每次修正迭代之前都要运行。它报告有序检查清单、确切的下一条命令、证据状态以及有界
   修正循环的状态；它绝不取代 spec/pass 门禁。遇到硬停止必须服从；绝不凭记忆继续。
2. **验证**该图像是否适合作为 3D 目标（`grimoire/intake/validation_rubric.md`）。
3. **评估**物体类别和复杂度，然后在写任何代码之前写出 `qualityContract`。
4. 写出 **Spec**：组件层级、材质、光照、枢轴点、挂点、动作锚点。
5. **逐 pass 构建**：blockout → structure → form → material → lighting → interaction → optimization。
6. 每个 pass 都用截图与参考图对比来**验证**；即使全局分数看起来不错，只要某个决定身份的特征
   错了，该 pass 就判为失败。

输出是近似/风格化/低多边形时要明确说明。单张图片无法揭示被遮挡的面，也无法保证几何精确——
要如实说出来，而不是假装有把握。

## 强制本地状态门禁

对话上下文是可丢弃的；`.img2threejs/state.json` 才是本地检查清单的权威来源。每次重建初始化
一次，之后每一步都经它把关：

```bash
python3 forge/state.py init --state .img2threejs/state.json --reference <img> --profile <generic|character|installed-domain> --spec object-sculpt-spec.json
python3 forge/next.py --state .img2threejs/state.json [object-sculpt-spec.json]
python3 forge/state.py mark <step-id> --state .img2threejs/state.json --evidence <path>
```

- `next.py` 打印当前步骤、pass、未完成的强制步骤、确切的下一条命令以及 `loop/max`。退出码 3
  或 `status=stopped` 是硬停止：报告原因并请求输入。绝不通过从对话历史重建进度来绕过它。
- 每个已完成的步骤都需要证据；不适用的步骤只能带 `--reason` 标记为 `skipped`——禁止静默省略。
  循环计数来自 `reviewHistory` 中的动作（`refine-spec`/`refine-code`），而不是代理的记忆。
  默认：每个 pass 3 次修正，总计 6 次。
- 领域 profile 的步骤、门禁和参考资料来自**注册表**：仓内模块（`character`）和已安装插件
  （`cs2`，以及来自 plugin-character 的 `animated-character`）以相同方式注册，`forge/state.py init`
  会列出可用项。profile 只增加强制门禁，不改变核心顺序——领域插件通常要求在 AI 评审之前提供
  权威分类、intake manifest 以及机器可读的领域评审；`character` 要求角色契约和关键点证据；
  `animated-character`（需要已安装 plugin-character）包含 `character` 的全部内容，再加上九个
  Stage R 步骤（`grimoire/readiness/animation_contract.md`）。只要绑定必须能**动**，就选它——在
  `character` 上没有 Stage R 门禁，构建会在从未运行它们的情况下完成，动画过去就是这样带着问题
  发布的。它的顺序是承重的：先修复网格，再冻结，再以叠加方式绑定，最后验证一致性。每个 profile
  都会记录适用性、投影适用性以及材质证据适用性。状态文件是用于恢复的索引，不是视觉证据：渲染图、
  spec、评审历史和确定性门禁仍是权威产物。

## 必需输入

- 一个图片路径 / 截图 / URL / 附带的图片（缺失或无法读取时询问用户）
- 预期用途：道具、游戏物体、主视觉渲染、可玩/可破坏物体、动画绑定
  （默认：具有交互性能的实时浏览器道具）
- 当某个领域插件服务该物品时，提供其 intake 步骤要求的权威记录，或明确请求用户/视觉提供方
  提供一份；仅靠启发式检测不足以选择几何适配器

## 循环（脚本负责强制执行；代理视觉负责判断）

在技能根目录运行脚本（`forge/...`）。纯 Python 3.10+ 标准库，无需 pip 安装。完整参数：
`grimoire/scripts.md`。绝不让脚本对视觉效果*打分*——那是代理的工作。

1. **先分析图像**（代理视觉，在运行任何脚本之前）：按 `grimoire/intake/image_analysis.md` 中的
   分层观察协议执行——识别/分类、按宏观→中观→微观分解、梳理部件关系、用 PBR 术语命名材质、
   列出决定身份的特征，并标记单一视角遮挡的内容。先观察后推断；使用受控的 3D 词汇；使用 3D
   物体空间而非 2D 图像空间。然后探查本地图像：
   `forge/stage1_intake/probe_image.py <image>`（只读元数据，不是视觉检查）。
1a. **本地 Spec 检索**——在图像分析之后、编写或改进 spec 之前，拉取本地领域证据
    （解剖/PBR/磨损/几何/运行时/物理），而不是凭空编造：
    `python3 forge/stage2_spec/new_pre_spec_assessment.py "Name" --image <img> --out assessment.json`
    （会自动在 `core_3d` 集合或已声明领域贡献的集合上运行 BM25——集合**绝不**根据目标名称
    猜测；写出一个 `localSpecSearch` 包，由 `new_sculpt_spec.py --assessment` 带入 spec）。
    完整的查询扩展配方（双语术语、聚焦的 `search_specs.py` 检索、缓存规则）：
    `grimoire/intake/local_spec_search.md`。在重试不完整或领域特定的查询之前，MUST 阅读它。
1b. **领域 intake**——当某个领域插件服务该物品时，先完成它的 intake 步骤，再编写 pre-spec
    （准入、启发式信号、分类、家族/路线解析）。
    MUST read the contract its step names, completely（必须完整阅读该步骤所指的契约），然后才能
    创建 manifest 或运行 pre-spec 评估。
1c. **可选的保真度证据适配器**——仅在它们能改善已观察到的薄弱点时使用；标准库核心仍是权威。
    细长/复杂遮罩 → 本地 SAM2；角色面部/姿态 → MediaPipe；前后线索薄弱 → Depth Anything V2
    （`forge/stage1_intake/run_vision_adapter.py <segment|landmarks|depth> ...`；每个适配器都会输出
    来源记录；单目深度只是相对值）。**仅通过 MCP 做的场景改动永远不算实现**——要把已证实的
    改动写回 spec 或 TypeScript，重新构建，重新截图。完整的适配器 + MCP 路由及权限边界：
    `docs/integrations/reference_fidelity_tooling.md`。
2. **Pre-Spec 评估门禁**——分类 + 复杂度评分 + 写出质量契约：
   `forge/stage2_spec/new_pre_spec_assessment.py "Name" --image <img> --complexity <simple|moderate|complex|ultra-complex> --out assessment.json`。规则：`grimoire/intake/quality_contract.md`。
   设置 `objectClass.primaryDomain`（`object` | `character` | `hybrid`），并填写预置的
   `detailInventory`（其 `targetMinDetails` 随复杂度缩放）。领域插件可以通过其 augmentation
   **提高**这些下限——合并时会钳制，所以插件永远无法降低任何一项（皮肤的表面处理/磨损/五金件
   本身就是物品，因此此类领域要满足最高保真度标准。几何用程序化方式编写，但表面处理要走步骤
   2c 的投影路径——对带图案的皮肤（Doppler/Gamma/Marble/Fade）使用程序化表面处理，与参考图对比时
   会明显不对。领域插件自带表面处理规则手册和纹理获取指南；阅读其检查清单步骤所指的内容。
2b. **细节清单**（细节丰富的对象不要跳过）——按区域扫描并列举每一个决定身份的小细节（光泽、
   倒角、紧固件、线条、轮廓、污渍）：
   `forge/stage1_intake/build_detail_inventory.py <image> --mode grid-3x3 --out-dir <dir> --out di.json`。
   每个细节 MUST 映射到一个 `component.localFeatures` 或 `material.localOverrides` 条目——绝不能
   只是文字描述。分类体系 + 3D 术语配方：`grimoire/intake/detail_inventory.md`。
2c. **投影优先的保真度**（角色以及需要匹配参考的表面——涂装皮肤、贴花、手绘图案）——当目标是
   匹配某张特定参考图的表面时，把照片自身的像素贴到网格上，而不是用程序化方式去近似。这是最大的
   单项保真度杠杆；对带图案的表面使用程序化材质是排名第一的重建失败原因。配方
   （`grimoire/character/likeness_maximization.md`——其中两个杠杆也适用于角色以外的对象）：
   求解相机（`stage1_intake/solve_camera_pose.py` → `referenceCamera`），对参考图做**去光照**
   （`stage1_intake/delight_albedo.py`，硬性要求——去光照是投影安全的前提），然后投影去光照后的
   裁切图并烘焙到 UV（`stage3_build/bake_projected_texture.py --mesh-id <id>`）。对涂装皮肤而言，
   投影的去光照裁切图本身就是表面处理——不要用程序化 Doppler 材质。对角色，先捕获关键点
   （`stage1_intake/extract_landmarks.py --out anatomy.json`），填写 `preSpecAssessment.anatomy`，
   路由到 `grimoire/character/reconstruction.md`。单一视角无法显示被遮挡的面——按区域报告置信度，
   并在必要时请求更多视角。
   角色子路线，按顺序——先确定有哪些部件再去塑形，先塑造头部再塑造长在头上的头发：
   - **部件**——`grimoire/character/structure_decomposition.md`
   - **头部**——`grimoire/character/head_construction.md`（相似度门禁对照的依据）
   - **头发**——`grimoire/character/stylized_hair_threejs.md` + 参数契约
     `grimoire/character/threejs_hair_parameter_contract.json`。只有在轮廓评审通过后才锁定发束
     拓扑：材质调整无法修复错误的发束拓扑。
2d. **无参考的人形**——没有参考图的通用人物没有可测量的东西，因此用公开的标准比例填充解剖数据：
   `forge/stage2_spec/humanoid_proportions.py <spec> --style-heads 8 --in-place`。它会写入
   `anatomy.source: "canon-table"`，确保标准比例永远不会被误当作测量值；当 spec 指定了参考图时它
   会拒绝运行；对于语料库未提供的数据，它会明确指出，而不是插值补出。
3. 根据评估编写 spec：
   `forge/stage2_spec/new_sculpt_spec.py "Name" --image <img> --assessment assessment.json --augmentation spec-augmentation.json --domain <profile> --out object-sculpt-spec.json`（检查清单步骤会携带已解析的参数）。
   用该物体真实的、决定身份的系统替换通用的初始 `featureReviewTargets`（每个 pass ≤5 个
   critical、≤3 个 important）；对角色添加 `anatomy-proportion`、`face-landmark-placement`、
   `pose-silhouette`、`outfit-and-palette`。只使用 3D 图形学术语（`grimoire/glossary/3d_vocabulary.md`），
   绝不用"好看/光滑/亮"之类。在选择 `primitive` 之前，按 `grimoire/intake/surface_topology.md`
   为每个组件确定 `topologyClass`/`topologyRationale`——这能防止把连续的有机形体选成一个盒子。
4. 当材质保真度重要且存在源图像时，先分析每种材质的**表面处理**，再提取参考 PBR 证据，两者都
   按裁切图进行（确认裁切图确实落在你以为的部件上）：
   - `forge/stage1_intake/analyze_texture.py <crop> --spec spec.json --material-id <id> --in-place`
     对表面处理分类，提取渐变调色板，并把有文档依据的 MeshPhysicalMaterial 标量写到材质上。配方
     + Three.js 纹理/PBR 规则：`grimoire/build/threejs_texture_reference.md`。经验法则：**solid albedo for flat paint,
     real reference crop for patterned finishes**（纯色漆面用纯色 albedo，带图案的表面处理用真实
     参考裁切图）。
   - `forge/stage1_intake/extract_pbr_evidence.py <crop> --out-dir <dir> --material-id <id> --target-threshold 0.7`。
     置信度 < 0.7 是停止/改进输入的信号，不是通过。这是推断，不是逆向渲染。
   - 多个命名区域时：`forge/stage1_intake/material_region_analysis.py --manifest regions.json --out-dir material-evidence --out material-analysis.json`，
     根据 `docs/materials/material-reference.json` 解析每项分配，再用
     `forge/stage2_spec/apply_material_analysis.py` 接入。
   - 输出受控的材质相机/裁切契约（`forge/stage4_review/material_views.py`），比较可见足迹裁切图
     （`material_comparator.py`），只应用限定在材质范围内的有界修正（`material_feedback.py`），
     并记录阻断性结果（`material_gate.py`）。
5. 生成代码前先校验，再做严格校验：
   `forge/stage2_spec/validate_sculpt_spec.py object-sculpt-spec.json`，然后加 `--strict-quality`。
   严格模式会阻止浅薄的 spec（一个只有单个根节点、没有重复系统、没有局部覆盖、没有微观分组的
   复杂物体，即使 JSON 校验通过也**不**具备实现条件）。
6. **锁定的构建 pass**——只修改当前已解锁的 pass：
   `forge/stage3_build/orchestrate_passes.py status object-sculpt-spec.json`
   `forge/stage3_build/generate_threejs_factory.py object-sculpt-spec.json --out src/createObjectModel.ts`
   生成器是失败即关闭的：`strict-quality` 必须通过它才会写出任何 factory，而未来的 `--pass-id`
   会一直失败，直到之前的 pass 都被评审为 `continue`。若被阻断，保留 `BLOCKED` 产物并改进针对该
   对象的 spec；不要用通用模板替代。本地状态只在新 pass 或 `refine-spec` 时追加 `--force`；
   `refine-code` 直接编辑当前产物而不重新生成。覆盖之前，先把有效的手工改进同步回 spec；生成的
   代码不能是重建决策的唯一副本。
6a. **达成三角形预算。** `performanceBudget.targetTriangles` 为每个带分段数的基元选择一个细分
   档位（low ≤6k、standard ≤60k，否则为 hero），并限制隐式曲面的采样网格上限。档位不够精确时，
   给该组件添加 `geometryDescriptor.decimate: {"targetRatio": 0.4}`——这是生成的 factory 中的一次
   二次误差塌缩，在蒙皮绑定**之前**运行，以便权重基于保留下来的顶点计算。它只保留 `position`
   （法线重新计算），因此对已编写/已展开的 `uvStrategy` 会拒绝执行。离线 LOD 档位：
   `forge/stage3_build/decimate.py <mesh.json> --ratio <r> --json`。
7. 在浏览器/预览中渲染当前 pass，在评审视角截图。
7a. **离轴与放置门禁——单一评审视角不能作为关于模型的证据。**
   要截取转台序列而不是单帧，并运行全部三项；每一项都能捕获旧门禁在构造上必然放过的一类缺陷
   （头骨上的穿孔、挂在臀部高度的帽子、悬空的挂饰，都曾在八轮只看正面的评审中存活下来）：
   `forge/stage4_review/turntable_gate.py --capture 0=front.png --capture 90=right.png --capture 180=rear.png --capture 270=left.png --json`
   `node runtime/scripts/export_mesh_geometry.mjs --url <preview> --out meshes.json`，然后
   `forge/stage4_review/self_intersection.py meshes.json --json`
   `forge/stage4_review/attachment_anchor.py object-sculpt-spec.json --measured measured.json --json`
   三者的退出码都是：`0` 干净 / `1` 门禁失败 / `2` 错误。失败会阻断 `continue`，即使全局保真度
   分数通过。在相信一个干净的结论之前，先读 `sampledVertexCount` / `unmeasuredAttachments` /
   `missingAzimuths`：它们分别指出门禁没有检查到的内容。
8. **在 AI 视觉之前运行确定性门禁。** MUST read
   `grimoire/review/gates_reference.md` 和 `grimoire/review/self_correction.md`，且必须完整阅读。
   运行 `forge/stage4_review/diagnose_render.py`，并用
   `--spec object-sculpt-spec.json --pass-id <pass> --in-place` 记录通过的 Tier 1 结果；对非平面
   形体还要用固定视角和至少两个有意义的环绕视角运行
   `forge/stage4_review/diagnose_render_multi_angle.py`。然后运行
   `forge/stage3_build/orchestrate_passes.py check object-sculpt-spec.json --pass-id <pass>`。
9. 打包一张并排对比图，然后用代理视觉检查它：
   `forge/stage4_review/make_comparison_sheet.py --reference <img> --render <shot> --out cmp.png --json`。
10. 记录评审（总体 + 分层 + 分特征分数 + 决策）：
    `forge/stage4_review/append_review.py object-sculpt-spec.json --pass-id <pass> --fidelity <0-1> --action <continue|refine-spec|refine-code|request-input|stop> --summary "..." --render-screenshot <shot> --comparison-image cmp.png --ai-vision-score <0-1> --layer-scores-json '{...}' --feature-reviews-json <f.json> --in-place`。
    当某个领域插件贡献了评审门禁时，先用该插件评审步骤所指的命令生成带版本号的报告，再用
    `--domain-review-json <report>.json --review-scene-json <the plugin's scene fixture>` 附加。
    检查清单步骤会携带已解析的路径。
    家族、涂装区域、投影覆盖、关键细节或环绕门禁中任一失败都会阻断 `continue`，即使全局分数
    通过。参见插件自己的评审门禁文档。
11. 手动编辑评审之后同步流水线状态，记录检查清单证据，然后在进行下一次修正或 pass 之前重新运行
    本地状态门禁：
    `forge/stage3_build/orchestrate_passes.py sync object-sculpt-spec.json --in-place`
    `python3 forge/next.py --state .img2threejs/state.json object-sculpt-spec.json`。
12. 宣告完成之前，运行
    `forge/stage4_review/check_part_coverage.py --spec object-sculpt-spec.json --manifest parts.json`
    并验证可用于动作的层级。只有拿到证据才能标记 `part-coverage` 和 `action-ready`。

## 以 GLB 为中介的 v2 渲染保真度路线（1.5 alpha）

当用户提供 GLB 作为中间参考时，浏览器渲染出的 GLB 是一个独立编写的程序化 factory 的结构与视觉
基线。原始 GLB 永远不是像素证据，其拓扑/材质也永远不会被复制进 factory。在任何 factory 编辑之前——
完整契约见 `grimoire/build/python_threejs_render_bridge.md`，机器可读 schema 见
`docs/specs/render-profile.v2.schema.json`（含示例；失败即关闭的校验）：

1. 先运行 `forge/stage1_intake/probe_glb.py`。合并成单节点/单网格的资产对语义标签而言是
   `insufficient`；在声称精确区域之前，请求多部件 GLB 或浏览器语义 ID pass。
2. 编写**一份**共享的 `render-profile.v2`（`forge/stage4_review/validate_render_profile.py`），GLB
   路线与程序化路线共用。区域 ID 针对具体对象，绝不从示例 profile 继承；在
   `extensions.requiredSemanticRegions` 中声明必需集合，使遗漏成为硬性校验错误。
3. 每个被采纳的视角截取六个 pass（`beauty`、`alpha-silhouette`、`semantic-id`、`depth`、
   `normal`、`roughness-material-id`）；用 `forge/stage4_review/compare_region_passes.py` 评分。
   缺少语义 ID 数据会阻断分区域置信度，而不是退回到整图分数。
4. 使用针对区域的连续几何——当某区域的轮廓需要连续曲面时，绝不用漂浮的基元替代面部/头部体块、
   布料外壳或尾巴。
5. 每个循环只运行**一个**修正组，按顺序：`camera → silhouette → face → clothing → accessory
   → materials → lighting`；每组之后重新截取完整 pass 集合，并记录改动的组、哈希和分数。诊断
   改进时绝不合并多个组。

## 门禁（不可跳过）

在任何视觉评审或 `continue` 决策之前，MUST 阅读 `grimoire/review/gates_reference.md` 中逐项门禁的
完整契约（Divine Eye、VLM 补救、多角度、内部差异、手性、头发、领域评审、有界修正、Divine Eye
拟合、截图反馈、装配、附着、材质、细节清单、绑定载荷、角色路线）。简而言之：

- 先验证参考图（`grimoire/intake/validation_rubric.md`、`check_reference_admission.py`）。
- `divine_eye.py` 以确定性检查优先；VLM（`vlm_gate.py`）是受门禁控制的最后一层，硬门禁失败时
  绝不咨询它。
- 非平面形体必须在 ≥2 个角度下成立（`diagnose_render_multi_angle.py`）。
- 每个视觉 pass 都要测量轮廓**内部**（`interior_difference.py`）。轮廓 IoU 只读取约 11% 的人物
  单元格：一个删掉了脸的模型与完成脸部的模型得到了相同的 0.8803 分。
- 每一对 `-l`/`-r` 都是**镜像**，不是旋转——在 spec 阶段即为硬性要求（`validate_chirality`）。
  两侧以同样方式出错的一对仍会通过，需要用 `medial_lateral_bias` 与参考图对比。
- 头发对象：`scalp_exposure.py` 是**硬**门禁，在任何渲染之前对几何运行；`hair_gate.py` 是软门禁，
  从属于前者。覆盖不足绝不能成为加宽发团的理由。
- 带硬边界的平涂色区域（白斑/胸斑/白袜、涂装条纹、涂绘标记）是身份特征，因此其边界在几何上
  把关：`vertex_region_gate.py`。绝不用纹理——本流水线输出的是代码；形状谓词位于
  `_shared/vertex_paint.py`。
- 关于曲线的声明（"卷成钩状，而不是直的圆锥"）需要 `swept_arc_gate.py`：轮廓 IoU 会放过一个
  大致占据正确单元格的直圆锥。
- 角色构建在绑定 `THREE.Skeleton` 之前先校验绑定载荷（`stage5_rig/validate_rig_payload.py`）；
  它只证明载荷完整性，绝不证明姿态压力或相似度。
- 必须能**动**的绑定还要运行动画门禁（`grimoire/readiness/animation_contract.md`；检查清单步骤和
  门禁来自已安装的 plugin-character——`stage5_rig/` 仍保留在本仓库中作为发射器的库，而不是检查
  清单的权威）。存在的动画片段不等于能播放的动画片段：只有 G1
  （`maxSampledBindingDelta <= 2^-23`）能区分两者，而输入缺失的门禁会报告 `unevaluated`，绝不是
  通过。在附着模式下以 IDENTITY 绑定，显示偏移只从网格包围盒获取；是否循环由 `poseReturn`
  决定，绝不由位移决定。
- 领域插件的评审门禁还会针对其带版本号的场景夹具运行。
- 本地状态默认强制每个 pass 3 次修正、总计 6 次；达到任一上限即为硬停止。`correction_loop.py`
  可能在重复缺陷、振荡或平台期时更早停止。
- `continue` 需要渲染图 + 对比图 + AI 视觉分数 ≥ 阈值，且每个 critical 特征 ≥ 其自身阈值
  （`grimoire/feedback/render_capture.md`）。
- 每个模型都必须既可爆炸拆分**又**可点击——这是结构门禁，不是像素门禁
  （`check_part_coverage.py`、`grimoire/build/geometry_patterns.md`）。
- 可用于动作、附着、材质/光照、细节清单以及角色路线的要求：
  `grimoire/readiness/action_rigging.md`、`grimoire/readiness/joint_attachment.md`、
  `grimoire/feedback/shading_realism.md`、`grimoire/intake/quality_contract.md`、
  `grimoire/intake/validation_rubric.md`。

## 自我修正

每个 pass 之后，恰好选择一项：`continue | refine-spec | refine-code | request-input | stop`。
`refine-spec` 修正错误/缺失/浅薄的 spec（重新校验，不要在代码里绕过它打补丁）；
`refine-code` 修正与可靠 spec 不符的几何/材质/光照。做决定之前，MUST 阅读
`grimoire/review/self_correction.md` 中的根因指南 + 保真度量表，记录决定，并重新运行本地状态门禁。

**小特征需要不同的仪器。** Divine Eye 的 SSIM/色调/边缘信号运行在 64×64 亮度网格上，所以几个
像素宽的细节在任何比较发生之前就已经消失了。当保真度取决于单个撕口、翼梁、獠牙或眼睛时，使用
四级显微镜：`grimoire/review/divine_eye_microscope.md`。其中两条经实证确立的规则：在组件的
**可见足迹**上测量保真度（完整帧减去隐藏该组件的帧），绝不在隔离渲染上测量；绝不对**凹陷**特征
做颜色门禁，因为暗部比例捕获的是凹腔阴影而不是材质。

## 透明度与过程调试

每个 pass 都要附证据（确切数值/坐标）报告改了什么，指出仍不匹配的地方，在只是"有改进"时绝不
宣称"完成"。通过门禁并不证明 3D 真实感。完整规则 + 示例：`grimoire/review/self_correction.md`。

## 左与右

左右成对是**反射**，绝不是旋转：只对横向轴取反，其他不变，`(x, y, z) → (-x, y, z)`。在
`forward: +Z`、Y 轴向上的右手坐标系中，角色自身的左侧是 **+X**。该约定以代码形式存在于
`forge/_shared/chirality.py`（`CHARACTER_LEFT_SIGN`），并针对搞错它而发布出去的两类缺陷设有两个
不同的门禁：`validate_chirality` 在 spec 阶段捕获把旋转当作反射的错误，`medial_lateral_bias` 与
参考图对比可捕获两侧以同样方式出错的一对。反射还会反转三角形绕序——在镜像一侧把它翻回来，否则
`flatShading` 会把肢体照成像是从背后打光。包含实测缺陷的完整说明：`grimoire/scripts.md`
（"Left and right" 一节）。

## 头发

头发有自己的子系统，因为它有其他门禁看不到的失败模式。完整契约、测量数据和非目标：
`docs/HAIR_PIPELINE.md`。硬性规则：

- 发根以 `(u, v)` 绑定到头皮，绝不使用绝对位置（硬性校验错误）。
- `standProud` 由生成器强制执行，不是建议。
- `scalp_exposure.py` 是在任何渲染之前对几何运行的**硬**门禁；覆盖不足本身绝不能成为加宽发团的
  理由。
- 默认表示档位是 `shell`，不是发束；发丝感来自分面与材质（`hair.human.code-only`），因为本技能
  不输出纹理。
- 头发拒绝使用 `plane-card`（它需要本技能无法输出的 alpha 纹理）。
- 头发采用刚性父子关系，绝不平滑蒙皮（测地场会穿过头骨）。

## 领域插件（Domain plugins）

领域插件让本流水线原本需要推断的地方变得精确。它贡献自己的检查清单步骤和门禁，并发布一个
`spec-augmentation.json`，本流水线在 `spec-authoring` 时拉取。没有插件服务该物品时，这里什么都
不变：编写骨架，并像对待其他任何物体一样从参考图推断形状。

- 插件贡献的步骤以其自己的 id 和已解析路径出现在检查清单中。阅读每个步骤所指的内容——插件自带
  契约，并由它管辖自己的领域。
- 插件可以**提高**本流水线的质量下限，永远不能降低任何一项；合并时会钳制。
- 不服务某物品的插件不发布 augmentation。这既不是错误也不是被阻断的运行：这就是通用路径，重建
  按推断进行。
- 本流水线不指名任何领域。若某条规则是领域特定的，它就位于该领域的插件中。

### img2 harness

插件由 `img2` harness（[img2threejs/img2](https://github.com/img2threejs/img2)）安装和管理，这是
一个独立的零依赖 CLI（Node 启动器，Python 核心）。本技能自身从不安装任何东西：当 `state.py init`
报告某个 profile 不可用时，给出安装它的 `img2 add` 命令并停止——绝不改为内置领域逻辑。

```bash
img2 add img2threejs/plugin-<id> --ref <tag>      # install a plugin at a tag (e.g. plugin-cs2)
img2 doctor                                       # what each host resolves: base-skill path + version, plugin gates
img2 capabilities --from-kind image --to-kind glb # which installed plugin serves an edge
```

安装设置与完整 CLI 参考见 README 快速开始以及 harness 仓库的文档。

## Forge 运行时契约

细分运行时测试会针对 showcase checkout 编译生成的 TypeScript。把 `IMG2THREEJS_SHOWCASE_ROOT`
设为该 checkout；未设置时，仅限运行时的本地测试会跳过并给出可操作的提示，而静态契约仍会运行。
CI 应设置 `IMG2THREEJS_REQUIRE_SHOWCASE=1`，把缺少 showcase checkout 变为测试失败。

```bash
IMG2THREEJS_SHOWCASE_ROOT=/path/to/img2threejs-showcase python3 forge/tests/test_subdivision.py
IMG2THREEJS_SHOWCASE_ROOT=/path/to/img2threejs-showcase python3 -m unittest discover -s forge/tests
IMG2THREEJS_SHOWCASE_ROOT=/path/to/img2threejs-showcase python3 forge/tests/test_showcase_tsc_smoke.py
```

## 实现规则（简要）

使用 TypeScript + 原生 Three.js，除非项目使用了封装层。`Group` factory
`createObjectNameModel(spec, options)`，重建数据与渲染器对象分开保存，所有程序化噪声使用确定性
种子。在使用任何外部美术资源之前，优先使用基元 / `Shape` 挤出 / 曲线+管 / 实例化 / 置换 / 生成的
canvas 纹理。完整的几何与材质配方 + 来之不易的失败模式：`grimoire/build/geometry_patterns.md`。

### 可选的 Python ↔ Three.js 渲染桥

当要求用 Python 做角色渲染时，把它用作包裹浏览器 Three.js 运行时的确定性作业/证据层：相机批次
manifest、源/输出哈希、就绪与稳定检查、截图持久化、遮罩、诊断以及对比打包。目标 Three.js 浏览器
路线仍是渲染的权威。不要用 Blender/VRM/GLB 输出静默替换程序化 TypeScript factory。完整的路由、
manifest 字段和失败规则：`grimoire/build/python_threejs_render_bridge.md`。

### 标准角色流水线（合并 1.5 beta + alpha）

角色工作使用 `grimoire/readiness/standard_character_pipeline.md`。beta 负责严格的雕刻/构建/评审
门禁；alpha 负责确定性相机 manifest、浏览器截图证据以及 UniRig 形态的绑定校验。CharacterGen、
Tripo、VRM 以及其他神经网络/资产系统是需主动开启的适配器，需记录来源、checkpoint、许可证、坐标
转换和输出哈希。它们绝不静默替换程序化 TypeScript factory。图像转网格系统输出的是没有骨骼的
静态网格，所以无论看起来多好，其输出都永远不能直接用于动画。可执行入口：
`forge/stage4_review/render_bridge.py` 和 `scripts/capture_threejs_playwright.py`
（`init → browser capture → validate → diagnose`；截取必须在真实的 showcase/浏览器路线上进行，并在
工作区中留下可读的 PNG）。

## 输出

- **仅分析**：适用性结论 + 分数、物体提取、宏观→微观层级、几何策略、材质/光照配方、
  动画/破坏可行性、方案 + 风险。
- **实现**：简要给出上述内容，然后编辑代码；用 typecheck/build + 截图验证。
- **不可行**：指出阻碍因素，请求更多视角 / 更干净的图片 / 接受风格化 / 更窄的目标。
  "无法从这张图片达到所要求的保真度"是一个有效的结果。
