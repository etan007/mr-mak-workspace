# 门禁参考（完整契约）

在任何视觉评审或 `continue` 决策之前，完整阅读本参考。`SKILL.md` 只保留可执行的顺序和一行摘要；
本文件定义强制性的门禁行为。

- **适用性 + 参考图完整性**：在任何规划之前给出 pass / conditional / reject
  （`grimoire/intake/validation_rubric.md`），**并且**每张参考图都要经过
  `forge/stage1_intake/check_reference_admission.py` 采纳（会附带原因拒绝空白/碎片化/过小/重复/
  无法解码的参考图）。intake 的理解结果由 `forge/stage1_intake/check_intake_correctness.py` 交叉
  核对（遇到高置信度的类别矛盾会中止）。
- **Divine Eye（整套机制的核心）——确定性优先，模型最后**：渲染评估器是
  `forge/stage4_review/divine_eye.py`——一个零 token 的多信号集成（IoU/比例为**硬**门禁；
  proportion/symmetry-parity/pHash/SSIM/edge/blowout/flat/tonal-parity 为软门禁），具备自我
  不确定性判断（信号不一致时给出 `probe`）和确定性路由（`continue`/`refine-spec`/`refine-code`/
  `probe`）。VLM（`forge/stage4_review/vlm_gate.py`）是受门控、经过校准、交叉核对的最后一层：
  **硬门禁失败时绝不调用**，采用多次采样投票，可以挽救一个接近阈值的软性拒绝，但绝不能越过硬性
  几何失败而放行。
- **没有多角度就等于没发生**：非平面形体必须在 ≥2 个相机角度下都成立。
  `forge/stage4_review/diagnose_render_multi_angle.py` 会在环绕视角的轮廓塌缩（用一个平面冒充
  体积）时标记 `degenerate-view`。环绕角度使用不依赖参考图的自洽性检查——绝不拿照片未覆盖的
  参考角度来打分。
- **领域评审契约**（随提供服务的插件一起发布）：其评审工具消费 manifest 和带版本的场景夹具，然后
  阻断以下问题：系列身份错误、投影覆盖缺失、涂装区域不匹配、关键身份细节失败、表面处理/材质响应
  失败，以及环绕形体退化。它记录精确度等级、隐藏区域置信度、分区域置信度、近似说明、相机、环境
  哈希、曝光、色调映射、分辨率、背景和渲染器版本。领域插件为哪些物品提供模板由该插件自己决定，
  并在其自身契约中说明。插件不提供服务的物品不会得到增补，运行会通过推断走通用路径，而不是被
  阻断——不提供服务不算失败。
- **有界修正循环（防止 token 空烧）**：`forge/stage4_review/correction_loop.py` 保证终止
  （成功/重复缺陷/振荡/平台期/硬上限），并升级为 `request-input`——绝不会静默地无限消耗。硬门禁
  路由到 `refine-code`；重复缺陷和振荡路由到 `refine-spec`。确定性的分析-合成参数拟合与 Divine Eye
  来源记录：`grimoire/build/analysis_by_synthesis_fitting.md`。
- **可执行的 Divine Eye 拟合**：`forge/stage4_review/fit_params.py` 中的 `fit_against_divine_eye()`
  把确定性的"参数→渲染"回调连接到有界、感知门禁的 Divine Eye 优化。干净的候选使用原始保真度；
  触发硬门禁的候选得分低于所有干净结果，同时保留原始保真度和来源记录。返回的目标值以及可选的已选
  原始保真度都是显式的，每条复制出的记录都带有候选/参考/渲染来源。它按需加载默认评估器，返回
  归一化的原始保真度修正循环来源记录，且不修改源数据。
- **内部差异（每个视觉 pass 必需）**：`forge/stage4_review/interior_difference.py` 按高度分带，
  测量轮廓**内部**的外观。轮廓 IoU 只由约 11% 的人物格子——轮廓线上的那些——计算得出，因此对另外
  89% 视而不见。实测：一张完成的脸，与同一模型把脸**删掉**之后，两者都得 0.8803，四位小数完全相同；
  加上一整张嘴，轮廓指标只变了 −0.0002，而且方向还是错的。轮廓指标绝不能作为修正循环在内部细节
  工作中优化的信号。当任一前景遮罩退化为整帧覆盖时它拒绝打分，并报告 `cellsCompared`，避免在寥寥
  几个格子上测出的差异被当作证据。
- **手性（spec 阶段，硬门禁）**：`forge/stage2_spec/validate_sculpt_spec.py` 中的
  `validate_chirality` 要求每对 `-l`/`-r` 都是矢状面**镜像**，而不是旋转后的副本。同时对 x **和**
  z 取反等于绕 Y 轴旋转 180°，而旋转保持手性，于是两侧肢体变成了同一只手。它**无法**捕捉的情况
  （以免有人过度信任绿色结果）：两侧以**相同**方式出错的一对，仍然是自身的完美镜像，需要用
  `chirality.medial_lateral_bias` 对照参考图检查。约定以代码形式存在于：`forge/_shared/chirality.py`。
- **头皮暴露（硬门禁，有头发的对象，在任何渲染之前）**：
  `forge/stage4_review/scalp_exposure.py` 在点上以几何方式查找秃斑，因此不需要浏览器，也不需要
  截图。暴露超过 `--hard-max` 一律视为失败。它只统计颅骨**外部**的头发——最近邻测试会让失败的构建
  通过，因为那些顶点仍在附近，只是沉到了表面以下。轮廓 IoU 看不到秃顶（它在内部），内部差异也
  无法把它与颜色偏移区分开。
- **头发门禁（软门禁，有头发的对象）**：`forge/stage4_review/hair_gate.py` 比较分带覆盖率、发际线
  偏移和高光带位置。其结论从属于 `scalp_exposure`。**覆盖率不足本身绝不授权加宽发块**——这样做曾
  让闭合度从 42.2% 降到 40.9%，六个视角全部变差，最差视角的头顶暴露上升了 14.9 个百分点，因为加宽
  的发块从颅骨上滑落了。完整记录：`docs/HAIR_PIPELINE.md`。
- **程序化绑定契约**：对人形/角色构建，在绑定 `THREE.Skeleton` 之前，用
  `forge/stage5_rig/validate_rig_payload.py` 校验制作的 `joints`/`parents`/`names`/`matrix_local`/
  打包蒙皮 payload。该门禁只证明 payload 的结构完整性；姿势压力测试、动态包围盒、可读截图和视觉
  相似度仍是独立的门禁。payload 职责与非目标：`grimoire/readiness/procedural_rigging_contract.md`。
- **Tier 1（旧有，仍然有效）**："Tier 2（AI 视觉）绝不针对未通过 Tier 1 的渲染运行。"在请求对比图
  之前，运行 `forge/stage4_review/diagnose_render.py`（轮廓 IoU/比例/对称性/逐部件颜色）并记录结果
  （`--spec ... --in-place`）；否则 `orchestrate_passes.py check` 会拒绝。
- **预 spec / 严格质量**：在 spec 深度足以满足其契约之前，阻止代码生成。
- **截图反馈**：只有在具备渲染图 + 对比图 + 全局 AI 视觉分数 ≥ 阈值（默认 0.7），**并且**每个
  关键特征 ≥ 其自身阈值时，才允许 `continue`。详情及分层评分卡：`grimoire/feedback/render_capture.md`。
- **可动作**：构建运行时层级（pivot、socket、碰撞体、破坏组），绝不是一个惰性的整块；暴露
  `root.userData.sculptRuntime`。`grimoire/readiness/action_rigging.md`。
- **组装门禁（结构，而非像素）——每个模型交付时都必须可爆炸拆分**且**可点选**：这是构建要求，不是
  按项目附加的额外项。为每个网格命名；为表面起伏标记 `userData.explodeWithParent`，使其随所在外壳
  移动；由*匿名*网格组成的具名组算作一个部件，而由*具名*部件组成的具名组仍是容器。爆炸拆分和部件
  点选必须共享同一个"部件"定义——若两者不一致，两者都是错的。通过围绕模型中心**缩放**布局来分开
  部件，绝不能把每个部件推开相同距离（那只会平移整体排布而不会拉开任何间隙）。然后运行
  `forge/stage4_review/check_part_coverage.py --spec <spec> --manifest <parts.json>`：若 spec 中
  指定的组件从未构建，或两个组件被融合到一个网格上，它会**失败**；若清单中的细节从未进入 spec，或
  有网格不属于任何具名部件，它会给出警告。这是唯一对**结构**打分的门禁——其他所有门禁都对像素打分，
  而一个贴着投影照片的单一融合网格能通过所有那些门禁。它的局限是坦诚的，报告时必须说明：它证明
  你构建了你所指定的内容，但永远证明不了你指定得足够。
  完整契约以及靠一次错误 pass 才学到的两条规则：`grimoire/build/geometry_patterns.md`。
- **挂接**：子附件（树枝/肢体/把手/管子）需要 `attachment.parentSocket`、`localStart`、
  `localEnd`、`contactType`、`embedDepth`/`overlap`、`gapTolerance`——不得有悬空部件。
  `grimoire/readiness/joint_attachment.md`。
- **材质/光照**：`grimoire/feedback/shading_realism.md`——独立的 PBR 通道（绝不把 albedo 混用为
  roughness/normal/AO）、宏观/中观/微观频段、真实光源。
- **细节清单**：对 `moderate` 及以上的对象，在 `detailInventory` 达到 `targetMinDetails` 且每条
  细节都映射到真实的组件/材质条目之前，严格质量会阻止代码生成（gloss 需要低粗糙度/clearcoat；
  紧固件需要实例化/微观部件）。
- **角色路线**：当 `primaryDomain` 为 `character`/`hybrid`（或使用 `--character`）时，spec 编写器会
  自动构建一个风格化人形模板（头/颈/躯干/手臂 + 头发、眼镜、耳机、面部特征），在一个隐藏根节点下
  展平到世界空间，并带有逐部件的角色材质和角色构建 pass（`proportion-lock`、`feature-placement`）。
  严格质量要求填写完整的 `anatomy` 块（头身单位、比例、面部关键点）和角色特征目标。人物的适用性
  路由：`grimoire/intake/validation_rubric.md`（风格化 vs 最大相似度）。做的是风格化半身像，不是
  面部复制；按参考图逐项细化位置。
