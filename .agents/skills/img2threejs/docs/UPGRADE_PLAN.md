# img2threejs 升级计划

状态：v1.2.0 已发布。v1.1.0 = Track A 细节优先 + Track B/相似度脚手架。v1.2.0 = 人形角色生成器（GENERATOR）：一个扁平化、世界空间的人形 componentTree 模板（头/颈/躯干/手臂 + 头发、眼镜、耳机、面部特征）、逐部件角色材质、角色构建 pass（proportion-lock、feature-placement）和特征目标，在 primaryDomain 为 character/hybrid（或使用 --character）时自动启用。已在一张真实肖像上端到端验证（spec -> generate -> 浏览器渲染），产出一个可辨认的风格化半身像。19/19 测试通过；对象流水线不受影响。
目标版本：1.1.0（Track A）、1.2.0（Track B + 角色生成器）

v1.2.0 实现说明：
- 生成器节点带有会级联到子节点的 transform.scale，所以人形模板把所有部件扁平化到世界空间，置于一个隐藏的、单位缩放的根节点之下，以避免非均匀缩放造成的变形。（用于动画的绑定/枢轴层级是未来的改进。）
- createSculptMaterial 只在 colorVariation.palette 至少有 2 个条目时才采用它（否则会混入米色回退色调），所以每个角色材质都提供其目标颜色的两个色阶。
- 尚待打磨（未来）：矩形眼镜框、衬衫贴花上的 canvas 纹理字标（目前是一块纯橙色面板）、耳机在颈部两侧的放置、头发形状细化，以及接入角色渲染的投影优先相似度路径（delight + camera-match + 纹理投影）。

1.1.0 已发布内容：
- Schema：preSpecAssessment.detailInventory（+ 按复杂度设定的 targetMinDetails）、objectClass.primaryDomain、preSpecAssessment.anatomy、顶层 referenceCamera。
- 门禁：stage2_spec/validate_sculpt_spec.py 细节清单门禁（数量 + 组件/材质关联 + 光泽/紧固件检查）和角色路线门禁（anatomy + 角色特征目标）；两者都向后兼容。
- 参考文档：intake/detail_inventory.md、character/reconstruction.md、character/likeness_maximization.md；build/geometry_patterns.md 细节 + 角色配方；intake/validation_rubric.md 角色适用性分支。
- 脚本：stage1_intake/build_detail_inventory.py、stage1_intake/extract_landmarks.py、stage1_intake/solve_camera_pose.py、stage1_intake/delight_albedo.py、stage3_build/bake_projected_texture.py。
- 测试：16 个通过（其中 8 个为新增，覆盖 schema、门禁、向后兼容和新脚本）。SKILL.md + README 已更新；版本升至 1.1.0。

尚未实现（后续工作，不要假定已存在）：
- stage3_build/generate_threejs_factory.py 人形绑定 + 面部关键点放置 + 细节输出钩子。
- stage2_spec/new_sculpt_spec.py 角色 componentTree 模板。
- stage3_build/orchestrate_passes.py proportion-lock / feature-placement pass。
- delight/camera/projection 脚本是有文档说明的近似实现/描述符，而不是 GPU 精确实现。
与维护者锁定的范围决定：
- 对人类/角色主体的首要目标：最大化与参考图的相似度，在输入允许的范围内尽量接近 100%。
- 诚实的约束：纯手工编写的图元无法达到照片级相似度。经第 13 节的调研确认，通往接近 100% 的现实路径是投影优先的流水线：把参数化人形/面部模板拟合到图像关键点上，然后把（去光照后的）参考图本身作为纹理投影到网格上，并让渲染与照片的相机对齐。当输入较弱或用户接受时，风格化/手办化仍是稳妥的回退方案。
- 两条路线都要交付。本文档是这项工作的权威 spec。

---

## 1. 问题陈述

当前 1.0 流水线的两个弱点：

1. 角色 / 人类主体。流水线是为硬表面物体构建的。生成的人与参考图不像，因为没有解剖比例系统、没有面部关键点放置、没有姿态/骨架对齐，而且适用性评分细则会主动拒绝头发和布料褶皱（这恰恰是人物的决定性特征）。
2. 精细细节在分析阶段捕获不足。微小但决定身份的细节（光泽区、圆角、螺丝/铆钉、雕刻或描绘的线条、轮廓线、污渍与磨损）只用一个 0-3 的"局部细节密度"分数表示。在编写 spec 之前，没有强制的、与证据关联的细节清单，所以它们被跳过，永远到不了渲染。

## 2. 根因地图（当前文件）

| 症状 | 根因 | 位置 |
| --- | --- | --- |
| 人物与图像毫不相像 | 没有解剖/关键点/姿态模型；只有面向物体的几何配方 | `grimoire/build/geometry_patterns.md`、`forge/stage2_spec/new_pre_spec_assessment.py`、`forge/stage2_spec/new_sculpt_spec.py` |
| 人物在早期就被拒绝 | 评分细则拒绝以头发/布料褶皱为主的主体 | `grimoire/intake/validation_rubric.md` |
| 整图分数掩盖了面部/比例错误 | 特征门禁没有解剖特征 | `forge/_shared/feature_acceptance_policy.py`、spec `featureReviewTargets` |
| 小细节被遗漏 | 细节密度只有一个分数；没有清单产物或门禁 | `grimoire/intake/quality_contract.md`、`forge/stage2_spec/new_pre_spec_assessment.py`、`forge/stage2_spec/validate_sculpt_spec.py` |
| 检查细节区域时没有辅助 | 探测只返回元数据 | `forge/stage1_intake/probe_image.py` |

## 3. 设计原则（整个升级过程中必须成立）

- 脚本负责执行和打包；代理的视觉负责判断。不要把视觉评分移进脚本。
- 只用纯 Python 3.10+ 标准库。不用 pip，不用 PIL/numpy/Playwright。PNG 用 `struct`/`zlib` 处理，与现有脚本一致。
- 保持 token 效率：新门禁在 codegen 之前快速失败；每次审查一张打包好的对比图；按 pass 门禁生成的方式不变。
- 向后兼容：1.0 的纯对象 spec 必须仍能通过校验。新块是增量的，只在相关时（按复杂度或按领域）才强制执行。
- 与代理无关：任何新的"看图"步骤都能配合原生视觉、浏览器 MCP 或用户提供的裁剪图工作。

---

## 4. Track A - 细节优先分析（v1.1.0）

目标：让微细节捕获成为一个必需的、与证据关联且有自身门禁的产物，使光泽、倒角、紧固件、线条和污渍能可靠地到达渲染。

### 4.1 新产物：`detailInventory`

在评估阶段产出，带入 spec。结构：

```json
{
  "detailInventory": {
    "scanMethod": "component-zones | grid-3x3 | grid-4x4",
    "targetMinDetails": 6,
    "details": [
      {
        "id": "top-bevel-gloss",
        "kind": "gloss",
        "description": "sharp specular hotspot along the top chamfer under key light",
        "region": { "x": 0.2, "y": 0.15, "width": 0.6, "height": 0.12, "units": "normalized" },
        "scale": "meso",
        "affects": "material",
        "mapsTo": { "type": "material.localOverride", "ref": "enamel-gradient/top-highlight" },
        "evidenceRef": "gradient-body",
        "confidence": 0.8
      }
    ]
  }
}
```

支持的 `kind` 值（细节分类）：`gloss`、`bevel`、`fastener`（螺丝/铆钉/螺栓）、`linework`（雕刻/描绘线/面板线）、`contour`（边缘轮廓/卡通描边）、`seam`、`stitch`、`stain`（污垢/铜绿/变色/褪色）、`scratch`、`chip`、`decal`、`emissive`、`hole`、`groove`、`ridge`。

规则：每个 `detail` 必须设置 `affects`（geometry 或 material 或两者），并且 `mapsTo` 一个真实的 `component.localFeatures[]` 条目或 `material.localOverrides[]` 条目。只用散文描述的细节算门禁失败。

### 4.2 新参考文档：`grimoire/intake/detail_inventory.md`

分类体系，以及如何用 3D 图形术语表达每种细节：
- gloss / do bong -> 低 roughness 区、clearcoat、高光热点位置，若有条纹则用各向异性。
- bevel / bo goc -> `edgeTreatment.type=chamfer`、bevelRadius、segments；注明它是否呈现为明亮的边缘高光。
- fastener / oc vit -> 实例化网格、数量、间距/分布、头部形状（半球/平头）、凹陷。
- linework / net ve, duong net -> 雕刻凹槽（几何）vs 描绘线（canvas 纹理贴花）vs 面板线（暗色 AO 接缝）；可读性目标。
- stain / vet o -> 污垢量、凹处偏置、竖向流痕、铜绿颜色、褪色/日晒漂白区、遮罩位置。
- seam/stitch/chip/scratch/decal/hole -> 映射到 localFeatures，包括放置、尺寸、朝向、材质效果、几何效果、置信度。

每个条目说明：在哪里、改变什么、多强、由什么证据支持。

### 4.3 新脚本：`forge/stage1_intake/build_detail_inventory.py`

- 输入：参考图（+ 可选的组件区域）。
- 输出：把每个区域（网格或逐组件）的裁剪图输出到一个目录，外加一个待填写的 `detailInventory` 骨架 JSON。
- 目的：强制逐区域地系统检查，避免代理只把整张图粗看一遍而漏掉小标记。
- 纯标准库 PNG 切片（struct/zlib），与 `stage4_review/make_comparison_sheet.py` 一致。

### 4.4 Schema 与门禁变更

- `forge/stage2_spec/new_pre_spec_assessment.py`：输出 `detailInventory` 骨架；按复杂度档位设置 `targetMinDetails`（起始值：simple 3、moderate 6、complex 10、ultra 16，可调）。
- `forge/stage2_spec/new_sculpt_spec.py`：把 `detailInventory` 带入 spec；接入一个辅助函数，使每个细节都关联到一个组件/材质。
- `forge/stage2_spec/validate_sculpt_spec.py`（`--strict-quality`）：新增检查
  - 细节数量 >= 该档位的 `targetMinDetails`。
  - 每个细节都 `mapsTo` 一个已存在的组件 localFeature 或材质 localOverride（没有孤立的散文）。
  - 当清单列出 gloss/bevel 细节时，"细节丰富"的对象必须带有材质 roughness 变化 + 至少一个 bevel/edgeTreatment。
  - gloss 细节需要低 roughness 的 localOverride 或 clearcoat；fastener 细节需要实例化/重复系统，或显式的少量 meso 部件。
- `grimoire/feedback/render_capture.md`：增加强制性的细节特写审查——掠射光镜头，必须展示倒角高光、可计数的紧固件、清晰的线条以及位于正确区域的污渍。在审查图上增加逐细节检查清单。

### 4.5 Track A 验收标准

- 重跑 loot-chest demo：评估至少列举出 gloss、bevel、铆钉、锁扣、侧把手、顶部自发光以及任何污渍，每一项都有证据区域；若清单为空或未关联，strict-quality 会阻止该 spec。
- 产出并审查一张细节特写对比图；审查记录逐细节的通过/失败。
- 纯对象的 1.0 spec 仍能通过校验（向后兼容）——新门禁只在存在 `detailInventory` 或复杂度 >= moderate 时触发。

---

## 5. Track B - 角色 / 手办重建（v1.2.0）

目标：增加一条一等公民的角色路线，在输入允许的范围内尽可能贴近参考地重建人形——比例、姿态、面部关键点、服装和配色。默认的高相似度路径是投影优先（5.8 节：参数化模板拟合 + 去光照照片投影 + 相机对齐）。当输入较弱或用户接受时，回退到风格化/手办化。不承诺从单张图得到有保证的 100% 相似度（5.10 节）。

### 5.1 领域检测

- `forge/stage2_spec/new_pre_spec_assessment.py`：增加 `objectClass.primaryDomain = object | character | hybrid`，从代理的分类推断（类角色的形态语言 + 皮肤/布料/头发材质 + 人形轮廓）。
- 当为 `character` 或 `hybrid` 时，评估还会额外输出一个 `anatomy` 块和角色特征目标。

### 5.2 新参考文档：`grimoire/character/reconstruction.md`

- 以头身为单位的比例系统，带一条风格轴：写实约 7.5 头身，风格化约 5-6，手办/Q 版 2-3。记录从图像测得的比例（头 : 躯干 : 腿、肩宽、髋宽）。
- 面部关键点布局：眼线接近头部垂直中点、眼距、鼻底、嘴线、发际线、耳朵上/下缘。存储归一化坐标。
- 姿态 / 骨架：颈、肩、肘、腕、髋、膝、踝；匹配轮廓和肢体角度。
- 角色材质（风格化）：皮肤（用暖色基底 + 柔和 roughness + 边缘/背光近似次表面散射，而非真正的 SSS）、头发（每缕用 hair card 或 tube-along-curve，分层）、眼睛（光泽球体 + 虹膜贴花）、布料（带褶皱法线的挤出/平面面板），金属/皮革配件复用 Track A 的细节机制。

### 5.3 解剖数据模型

```json
{
  "anatomy": {
    "styleHeads": 3.0,
    "proportions": { "headUnit": 0.18, "torso": 2.2, "legs": 3.0, "shoulderWidth": 1.6, "hipWidth": 1.3 },
    "pose": { "type": "T-pose | contrapposto | action", "jointAngles": { "leftShoulder": [0,0,-10] } },
    "faceLandmarks": {
      "eyeLine": 0.52, "eyeSpacing": 0.3, "noseBase": 0.66, "mouthLine": 0.78, "hairline": 0.34
    },
    "features": ["hair-style-id", "outfit-parts", "accessories"],
    "confidence": 0.6
  }
}
```

### 5.4 新脚本：`forge/stage1_intake/extract_landmarks.py`

- 在参考图上叠加带标注的网格 / 参考线，让代理的视觉能填写关键点坐标（眼睛、肩、髋、关节）。
- 输出一个带归一化坐标的 `anatomy` 骨架 + 一张供审查的叠加图。
- 只用标准库；不用人脸检测库——由代理提供判断，脚本负责打包参考线并记录判断。

### 5.5 生成器与流水线

- `forge/stage2_spec/new_sculpt_spec.py`：人形组件模板——带关节枢轴节点的 `rig` 根；头、面部特征组、头发组、躯干、手臂、腿用胶囊/渐细图元；服装部件作为独立组件，带 Track A 细节钩子。
- `forge/stage3_build/generate_threejs_factory.py`：输出人形绑定（具名关节枢轴、可动作的挂点）、胶囊肢体、根据关键点放置面部特征、hair card；全部通过 `root.userData.sculptRuntime` 暴露。
- 为角色领域插入两个新的构建子 pass，位于 `material-pass` 之前：
  - `proportion-lock`：按测得的头身比例和姿态做人形 blockout；以轮廓 + 比例匹配为门禁。
  - `feature-placement`：按关键点坐标放置面部特征和头发；以面部关键点对齐为门禁。
- `grimoire/intake/validation_rubric.md`：增加角色适用性分支——把人类归类为 `character-conditional -> stylized` 而不是拒绝；说明何时请求更多视角（正面、侧面、全身），并确认可接受的风格化程度。

### 5.6 角色特征门禁

`forge/_shared/feature_acceptance_policy.py` + spec `featureReviewTargets`：增加关键角色特征，各有自己的阈值：
- anatomy-proportion（头身比例、肢体长度）
- face-landmark-placement（眼线、特征间距）
- pose-silhouette（肢体角度、站姿）
- outfit-and-palette（服装形状 + 颜色区域）

审查对照的是关键点叠加图，而不只是整图分数。

### 5.7 Track B 验收标准

- 人类参考图被归类为 `character`，并产出带测得比例 + 关键点的 `anatomy` 块。
- 测试角色以正确的头身数和姿态重建，面部特征落在关键点线上，服装颜色区域匹配。
- 角色特征门禁分别对面部/比例/姿态打分；至少有一个测试用例在风格化标准下通过所有关键角色阈值。
- 当 `primaryDomain = object` 时，对象流水线不受影响。

### 5.8 最大化相似度 - 投影优先流水线（基于调研）

根据第 13 节，提升相似度最大的单项手段是不再手工雕刻面部，而是拟合模板并投影照片。把它作为角色的默认高相似度路径；保留自由手工的风格化路径作为回退。

1. 参数化模板拟合（相似度的行业标准）：
   - 提供一个轻量的、由代码生成的参数化人形模板（以头身为参数的身体加一个可变形面部），概念上对标 SMPL-X（身体 + 面部 + 手，含下颌和眼睛关节）和 FLAME（基于扫描的面部）。这仍是程序化的：模板由代码生成、由参数驱动，而不是下载的美术资源包。
   - 按 SMPLify-X 的思路，把模板参数（形状、姿态、表情）拟合到从图像提取的 2D 关键点和比例上：最小化模板关键点与观测到的图像关键点之间的重投影误差。关键点来自 `stage1_intake/extract_landmarks.py`（由代理视觉辅助）。
   - 理由："看起来像这个人"取决于比例 + 关键点对齐；自由手工图元无法可靠地做到这一点。

2. 照片纹理投影（单图相似度的最大提升）：
   - 为参考图求解相机（焦距/FOV/朝向），使网格与照片对齐，然后通过投影/相机投影纹理（Three.js `ShaderMaterial`，或 `three-projected-material` 的做法）把参考图投影到拟合后的网格上，并为可见（正面）一侧烘焙进网格 UV。
   - 对看不到的背面/侧面，通过沿对称面镜像正面纹理、延续配色，或请求背面/侧面视图来推断。把推断出的区域标记为较低置信度。

3. 投影前先去光照：
   - 原始照片包含烘焙进去的阴影、高光和 AO。在把它当作 albedo 之前，先运行去光照步骤以恢复中性基础色（高通 / 叠加中和，或等效的 AI 去光照工具），然后生成独立的 roughness/normal/AO。albedo 贴图必须不含烘焙光照。否则投影纹理会与场景光照打架，破坏相似度。

4. 相机对齐：
   - 估计并存储相机焦距、FOV 和朝向，使审查渲染能从与照片相同的视点拍摄，从而支持像素级叠加比较和正确的投影。在 spec 中增加 `referenceCamera` 块。

5. 转面图 / 参考平面工作流：
   - 遵循美术行业标准：正面、侧面以及（如有）背面的正交参考，高度对齐，以头身为单位的比例网格，逐视角先轮廓后 blockout，并同时记录配色。只有一个视角时，标记这一点并通过 `request-input` 请求更多视角。

6. 在 Three.js 中绑定和变形：
   - 为身体输出带关节骨架的 `SkinnedMesh`，为面部表情输出 morph target / blend shape，可导出为 glTF。保持可预测的拓扑，使 blendshape 干净地变形（重拓扑原则）。通过 `root.userData.sculptRuntime` 暴露骨架和 morph 通道。

7. 分部件配方（风格化到写实的旋钮）：
   - 皮肤：用暖色基础色、柔和 roughness 和边缘/背光近似次表面散射；谨慎使用 `MeshPhysicalMaterial` 的 sheen/transmission。
   - 头发：每缕用 hair card 或 tube-along-curve，分层，带 alpha/各向异性高光；头发是单图重建的经典失败点，所以优先用风格化的发团而不是发丝。
   - 眼睛：光泽球体加虹膜贴花/纹理；正确的眼神光能让写实感成立。
   - 服装：带褶皱法线的挤出/平面面板；复用 Track A 细节机制处理接缝、缝线、纽扣和印花。

### 5.9 可选的生成辅助模式（有文档说明的逃生口）

现代图像转 3D 生成器（TRELLIS、Tripo、Hunyuan3D、Rodin、TripoSR）能达到大约 80-95% 的正脸形状精度，并通过 Gaussian-splat/LRM 方法得到最接近照片的纹理（第 13 节）。对于真实人物，纯程序化代码无法与之匹敌。

- 提供一个显式、需主动选择的 `generativeAssist` 模式：导入由外部图像转 3D 模型产出的基础网格，然后用 img2threejs 处理重拓扑预期、绑定、应用投影优先的纹理/材质流水线，并运行同样的审查门禁。
- 这打破了"纯代码、不下载资产"的承诺，所以必须在 spec（`meshSource: procedural | generative-assist`）和输出中明确标记，并且绝不能作为静默的默认值。
- 即使在这个模式下，相似度的提升仍主要来自叠加在其上的去光照、投影和相机对齐。

### 5.10 关于 100% 的诚实说明

在输出中直白地说明：单张图无法得到有保证的 100% 相似度，因为背面/侧面、被遮挡的几何以及真实的皮肤/头发微观结构都无法观测。流水线通过参数化拟合 + 照片投影 + 去光照 + 相机对齐来最大化相似度，报告逐区域置信度，并在目标是真实人物且保真度重要时请求更多视角。

---

## 6. 横切关注点：反馈循环升级

- `stage4_review/make_comparison_sheet.py`：可选的叠加模式（角色用关键点线；细节审查用区域框）。
- 审查记录逐细节和逐关键点的分数，而不只是现有的五个层级分数。
- 每次审查保持一张打包好的对比图，以维持 token 效率。

## 7. 逐文件变更摘要

新文件：
- `grimoire/intake/detail_inventory.md`
- `grimoire/character/reconstruction.md`
- `grimoire/character/likeness_maximization.md`（投影优先流水线：模板拟合、照片投影、去光照、相机对齐、转面图）
- `forge/stage1_intake/build_detail_inventory.py`
- `forge/stage1_intake/extract_landmarks.py`
- `forge/stage1_intake/solve_camera_pose.py`（估计焦距/FOV/朝向；输出 `referenceCamera` 块）
- `forge/stage3_build/bake_projected_texture.py`（把去光照后的参考投影到拟合网格视图上并烘焙到 UV；标准库 PNG）
- `forge/stage1_intake/delight_albedo.py`（投影前从照片恢复中性 albedo）
- 一个由代码生成的参数化人形/面部模板模块（以头身为单位的身体 + 可变形面部），内联在生成器中，或作为 `assets/humanoid_template` 数据
- 一个细节丰富的物体特写和一个高相似度角色（基于投影）的 demo 资产

修改的文件：
- `grimoire/intake/quality_contract.md`（细节清单 + 领域 + anatomy）
- `grimoire/build/geometry_patterns.md`（角色配方 + 细节配方）
- `grimoire/intake/validation_rubric.md`（角色适用性分支）
- `grimoire/feedback/shading_realism.md`（皮肤/头发/布料说明）
- `grimoire/feedback/render_capture.md`（细节特写 + 关键点叠加审查）
- `grimoire/review/self_correction.md`（角色子 pass 指引）
- `forge/stage2_spec/new_pre_spec_assessment.py`
- `forge/stage2_spec/new_sculpt_spec.py`
- `forge/stage2_spec/validate_sculpt_spec.py`
- `forge/stage3_build/generate_threejs_factory.py`
- `forge/_shared/feature_acceptance_policy.py`
- `forge/stage3_build/orchestrate_passes.py`（为角色领域注册 proportion-lock / feature-placement pass）
- `forge/stage1_intake/probe_image.py`（复杂度高时提示进行细节扫描）
- `forge/tests/test_pipeline.py`（新增覆盖）
- `SKILL.md`、`README.md`（记录两条路线，升级版本号）

## 8. 分阶段路线图

| 阶段 | 版本 | 内容 | 验收 |
| --- | --- | --- | --- |
| P1 | 1.1.0 | 细节清单参考文档 + 构建脚本 + 评估/spec 字段 | loot-chest 评估列举出已关联的细节；strict 门禁阻止空的/未关联的清单 |
| P2 | 1.1.0 | 细节特写审查 + 校验门禁 + 测试 | 特写图证明 bevel/fastener/stain；测试全绿；1.0 spec 仍有效 |
| P3 | 1.2.0 | 角色参考文档 + 评分细则分支 + 评估中的 domain/anatomy | 人类图像 -> character-stylized + anatomy 块 |
| P4 | 1.2.0 | 角色 spec 模板 + 关键点脚本 + 人形生成器 | 测试角色具有正确的头身数 + 姿态 + 关键点 |
| P5 | 1.2.0 | 角色特征门禁 + proportion-lock/feature-placement pass | 对面部/比例/姿态打分；一个用例通过风格化标准 |
| P6 | 1.3.0 | 相似度最大化：`stage1_intake/solve_camera_pose.py` + `stage1_intake/delight_albedo.py` + `stage3_build/bake_projected_texture.py` + 参数化模板拟合 | 渲染与照片相机对齐；去光照后的参考投影到拟合网格上；正脸相似度明显高于风格化基线 |
| P7 | 1.3.0 | 可选的 `generativeAssist` 模式（有标记、非默认）+ 未见区域的置信度报告 | 导入并细化的路径端到端可用，并被清楚标注为非程序化 |
| P8 | 1.3.0 | 文档 + demo + 版本号升级 | SKILL.md/README 已更新，有高相似度角色 demo，不使用 emoji |

## 9. 测试策略

- 扩展 `forge/tests/test_pipeline.py`：细节清单校验（通过/失败用例）、领域检测、anatomy 校验、角色特征门禁阈值、向后兼容（1.0 对象 spec 仍能通过校验）。
- 端到端冒烟：开启细节门禁重建 loot-chest；端到端重建一个风格化角色。

## 10. 向后兼容

- 所有新块在 schema 层面都是可选的；strict-quality 只在 `detailInventory` 存在或复杂度 >= moderate（Track A），或 `primaryDomain != object`（Track B）时才强制执行它们。
- 现有对象 spec 和当前的 loot-chest demo 必须继续通过。

## 11. 风险与缓解

- 照片级人物无法程序化实现：范围锁定为风格化/手办化；在输出中说明这一点，并在需要时请求更多视角。
- 过严的门禁可能阻挡简单物体：门禁强度随复杂度/领域缩放；简单物体保持轻量路径。
- 单张图缺少被遮挡的面/存在姿态歧义：在确定之前用 `request-input` 请求正面/侧面/全身视角。
- 更多分析导致 token 成本上升：每次审查保持一张打包好的对比图；由脚本搭建列举的脚手架，模型只负责判断。

## 12. 未决问题

- 每个档位的默认 `targetMinDetails`——在第一次细节丰富的运行之后再调。
- ~~头发策略默认值：每缕用 hair card 还是 tube-along-curve（性能 vs 观感）。~~ **已解决。**
  按最初的提法，两者都不是。见 `docs/HAIR_PIPELINE.md`。hair card 被直接拒绝——card 需要 alpha 纹理才能看起来像头发，而本技能输出不带纹理的代码，所以它会渲染成一个不透明的矩形。扫掠体（`tapered-sweep`）承载轮廓。但决定这一点的测量也重新框定了问题：在参考 GLB 上，头发表面粗糙度为 0.00338，而躯干对照为 0.00312，这意味着它的头发是一层**平滑的壳**，所有发丝外观都存在于 diffuse 和 normal 纹理中。由于这些纹理不可用，发丝观感只能来自刻面和材质响应，默认表示层级是 `shell`，而不是 locks。在 `forge/stage2_spec/hair_profile.py` 中强制执行。
- 是提供一个小的参数化人形模板文件，还是在工厂中内联生成。
- 相机求解和去光照用纯标准库实现到什么程度，还是记录为可选的外部步骤；两者可能都需要先做一个务实的近似。
- `generativeAssist` 是否应该调用外部 API，还是只接受用户提供的基础网格（让本技能默认保持离线且不含资产）。

## 13. 调研摘要：最大化人物相似度的最佳实践

来自网络调研（2026 年 7 月）的发现，用于塑造 5.8 至 5.10 节。

1. 参数化模板加关键点拟合是相似度的标准做法。SMPL-X 是一个统一的身体 + 手 + 面部模型（10,475 个顶点，54 个关节，含下颌和眼睛），使用带修正 blendshape 的线性混合蒙皮；它内嵌了 MANO（手）和 FLAME（面部，从约 3,800 个头部扫描学习而来）。SMPLify-X 通过优化姿态、形状和表情来匹配观测到的 2D 关键点，从而把它拟合到单张图像上——这是单图人体恢复事实上的初始化方法。要点：把参数化模板拟合到图像关键点，而不是手工雕刻。

2. 照片纹理投影是单图相似度最大的杠杆。投影/相机投影纹理把参考图映射到网格上，就像从求解出的相机投射过去一样；Three.js 的 `three-projected-material` 库和自定义 `ShaderMaterial` 方法实现了这一点，包括对投影"快照"后再烘焙。近期的人体纹理方法（例如 TexDreamer）正是靠从稀疏视角编码高频细节的纹理投影模块来获得保真度的。

3. 把照片当作 albedo 之前必须去光照。albedo 贴图必须不含烘焙的阴影、高光和 AO；Substance 3D Sampler Delight、Agisoft Delighter、Unity de-lighting 以及各种 AI 去光照工具正是为此而存在，手动高通/叠加中和是常见的回退方案。跳过这一步会让投影纹理与场景光照打架。

4. 正交转面图工作流决定比例精度。美术师依据高度对齐的正面/侧面/背面参考建模，使用以头身为单位的比例网格和先轮廓后 blockout 的方法，并同时记录配色；跨视角一致的参考线让模型能匹配特征。采用参考平面加比例网格；请求缺失的视角。

5. Morph target / blend shape 加 SkinnedMesh 是 Three.js 中用于面部和身体的基本构件；干净的 blendshape 变形需要可预测的（经过重拓扑的）拓扑，LOD（3-4 级）用于管理性能。Three.js 自带一个 morph-targets 面部示例。

6. 生成式图像转 3D（2026）为真实人物设定了现实的相似度上限：TRELLIS（开源质量最高，Gaussian-splat 纹理）、Tripo（Tripo P1 能准确重建面部特征，纹理锐利）、Hunyuan3D（强力开源）、Rodin（高保真几何）、TripoSR/Stable Fast 3D（亚秒级，保真度较低）。报告的正脸形状精度约为 80-95%。这是 ML 而非程序化，因此是可选、有标记的 `generativeAssist` 模式；程序化路径仍通过叠加投影 + 去光照 + 相机对齐来提升相似度。

来源：
- [Expressive Body Capture: SMPL-X / SMPLify-X (arXiv 1904.05866)](https://arxiv.org/pdf/1904.05866)
- [SMPLify-X overview (EmergentMind)](https://www.emergentmind.com/topics/smplify-x)
- [Playing with Texture Projection in Three.js (Codrops)](https://tympanus.net/codrops/2020/01/07/playing-with-texture-projection-in-three-js/)
- [three-projected-material (GitHub)](https://github.com/marcofugaro/three-projected-material)
- [three.js morph targets - face example](https://threejs.org/examples/webgl_morphtargets_face.html)
- [TexDreamer: high-fidelity 3D human texture (arXiv 2403.12906)](https://arxiv.org/pdf/2403.12906)
- [Delight AI - Adobe Substance 3D Sampler](https://helpx.adobe.com/substance-3d-sampler/filters/tools/delight-ai-powered.html)
- [De-Lighting 3D Scans (Sketchfab community)](https://sketchfab.com/blogs/community/de-lighting-3d-scans-in-unity-by-pete-mcnally/)
- [Character Turnaround Guide (spines.com)](https://spines.com/character-turnaround/)
- [How to Create a 3D Character Model Reference (Coohom)](https://www.coohom.com/article/how-to-create-a-3d-character-model-reference)
- [Best AI 3D Model Generators 2026 (TRELLIS vs Meshy vs Tripo vs Hitem3D)](https://trellis2.app/blog/best-ai-3d-model-generator)
- [7 Image-to-3D AI Generators, July 2026 (Vitalify)](https://www.vitalify.asia/en/blog/generative-ai/ai-image-to-3d-generators-comparison)
- [How To Deploy Image-To-3D Models In Three.js (Threedium)](https://threedium.io/create/3d-models/platform/threejs)
