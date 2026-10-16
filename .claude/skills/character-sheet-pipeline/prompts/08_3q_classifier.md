# 阶段 4.5 · 视觉分类器验证——反 3/4 重试循环（V3）

**模型：** 使用宿主代理可用的图像检查能力，或已确认支持图像输入的视觉 API。在结论中记录所用模型和方法。本文件提供的是评分标准，不是已部署的分类器服务。
**输入：** 候选图像 + 部件类别（`body-essential | paired | accessory | hair | sheet | multiview-side | multiview-back`）
**输出：** JSON 结论——`pass | soft_fail | hard_fail` + reason 字符串 + 各维度标记。

## 为什么需要这一阶段

即便用了反 3/4 提示词，图像模型在配饰和小部件上仍可能偏向 3/4 大片角度。接受生成图之前先检查，并记录结构化结论。重试控制在已认可的生成范围内；这套评分标准不代表 API 成本，也不保证准确率。

## 分类器提示词（严格正视评分标准——用于阶段 2A 及所有阶段 4 部件）

以下指令发给视觉 LLM。check 名称、JSON 字段名、枚举值和 `{{category}}` 占位符必须保持英文原样。

```
你是 3D 建模流程中严格的正交参考图验证器。你会收到一张渲染图和一个类别标签。你的任务是判断该图是否为严格正视（STRICT FRONT），能否作为下游 3D 提取的正交参考。

CATEGORY: {{category}}
EXPECTED ANGLE: strict front（正对镜头，无旋转、无倾斜、无 3/4）

按以下二元检查项评估图像：

1. body_axis_dead_front — 主体纵轴是否垂直于镜头（水平面内无身体旋转）？主体两侧应呈现等宽。
2. no_three_quarter — 主体是否完全没有介于正面与侧面之间的 3/4 旋转？（3/4 是最常见的偏移——从严标记。）
3. no_body_twist — 主体是否没有对立式站姿（contrapposto）、扭胯、扭肩、头部相对胸部转动？
4. no_hero_angle — 镜头是否处于中性平视、无任何透视戏剧化？无仰拍大片角度、无俯视上帝视角、无透视缩短。
5. no_partial_back — 主体背部是否完全没有露出？（只要能看到任何背面，就不是严格正视。）
6. framing_clean — 主体是否在白色背景上隔离、完整可见、关键几何没有被裁切？

判定规则：

- 六项全部通过 → verdict = "pass"
- 1–2 项轻微不通过（如头部轻微倾斜、轻度透视缩短），但图像仍可作为正交参考 → verdict = "soft_fail"
- 检查项 1、2、3 或 5 中任一项明确不通过 → verdict = "hard_fail"
- 仅检查项 4 或 6 不通过时通常判 "soft_fail"，除非角度严重偏离

只回复以下 JSON，不要任何说明文字，不要 markdown 代码围栏：

{
  "verdict": "pass" | "soft_fail" | "hard_fail",
  "checks": {
    "body_axis_dead_front": true | false,
    "no_three_quarter": true | false,
    "no_body_twist": true | false,
    "no_hero_angle": true | false,
    "no_partial_back": true | false,
    "framing_clean": true | false
  },
  "reason": "<一句简短的话，指出主要失败模式；通过时写 'clean strict front'>",
  "estimated_camera_rotation_degrees": <整数，带符号：负数 = 镜头在轴线左侧，正数 = 镜头在轴线右侧，0 = 正对>
}
```

## 分类器提示词（多视图侧视评分标准——用于阶段 5 侧视输出）

骨架相同，只替换期望角度和检查项部分：

```
EXPECTED ANGLE: strict side / profile（镜头与主体纵轴成 90°，看向左侧或右侧）

调整后的检查项：
1. profile_dead_on — 镜头是否与主体成 90°（或 270°）？主体身体轴线应完全侧对，一侧肩膀遮住（或几乎遮住）另一侧。
2. no_three_quarter_between_front_and_side — 图像是否没有介于正面与侧面之间的 3/4 偏移？（另一种常见偏移。）
3. no_three_quarter_between_side_and_back — 图像是否没有介于侧面与背面之间的 3/4？（较少见但会发生。）
4. body_pose_matches_front — 身体是否保持与阶段 2A 设定图相同的 A-pose（手臂约 45°、两腿与肩同宽）？
5. framing_clean — 同正视评分标准。
```

## 分类器提示词（多视图背视评分标准——用于阶段 5 背视输出）

```
EXPECTED ANGLE: strict back（正背对镜头，与正面成 180°）

调整后的检查项：
1. body_axis_dead_back — 主体背部完全朝向镜头，从背后看双肩等宽，头部完全背向镜头。
2. no_three_quarter_back — 图像没有介于侧面与背面之间的 3/4。
3. no_partial_face — 主体面部完全不可见。
4. body_pose_matches_front — 从背后看仍保持 A-pose。
5. framing_clean — 同上。
```

## 重试策略——升级提示词模板

分类器返回 `hard_fail` 时，不要原样重跑原提示词。构建一个**点名具体失败原因**的升级提示词，把它作为纠正前置。以下模板发给图像生成模型，保持英文：

```
[CRITICAL CORRECTION] The previous attempt failed strict-front verification: {{classifier.reason}}.
Estimated rotation: {{classifier.estimated_camera_rotation_degrees}}° off dead-front.

YOU MUST regenerate with the body axis DEAD FRONT. NO three-quarter angle. NO rotation. Both sides of the subject EQUAL width. Both feet/legs/arms at EQUAL angle.

{{original_stage_prompt}}

Anti-drift reinforcement (mandatory): zero rotation in the horizontal plane. Camera at zero degrees azimuth relative to the subject. Subject's longitudinal axis is parallel to the image plane, NOT angled away from it. If the prior attempt was rotated to camera-right (positive degrees), this attempt must counter-rotate to dead-front. If the prior attempt was rotated to camera-left (negative degrees), same correction.
```

## 重试预算

- **首次尝试**使用原阶段提示词及常规反 3/4 负面提示词。
- **重试 1** 使用上面的升级提示词，同一模型（图像阶段为 Nano Banana Pro）。
- **重试 2** 使用升级提示词 + 退回 Nano Banana 2。
- **重试 2 后**仍为 `hard_fail` → 停止。向用户展示三次尝试及分类器理由。提供选项：(a) 带警告接受最佳结果，(b) 提供自定义指令再试一次，(c) 跳过该部件。

`soft_fail` 自动接受，但在 manifest 中记为 `accepted_with_warning` 并记录分类器理由。运行结束后用户可查看 manifest，要求重新生成任何 `soft_fail` 部件。

## 每个部件的 manifest 条目

```json
{
  "part": "hat_front",
  "category": "accessory",
  "attempts": [
    { "model": "nano-banana-pro", "verdict": "hard_fail", "reason": "rotated ~25° camera-right; 3/4 hero angle", "image_hash": "..." },
    { "model": "nano-banana-pro", "verdict": "hard_fail", "reason": "still rotated ~15° camera-right", "image_hash": "..." },
    { "model": "nano-banana-2", "verdict": "pass", "reason": "clean strict front", "image_hash": "..." }
  ],
  "final_verdict": "pass",
  "retry_count": 2,
  "accepted_image": "01_parts/hat_front.png"
}
```

## 成本说明

每次验证是一次视觉请求——小图输入，约 200 token 的 JSON 输出。在 GPT-4o-mini-vision 档位每次检查大约 1–2 美分，GPT-5 vision 更贵。一次典型的 10 部件运行，每个部件验证一次、硬失败率约 15%，预计共约 12 次视觉调用：比一次 Nano Banana Pro 重新生成便宜得多。

## 何时跳过分类器

- 用户明确说“跳过验证，接受第一次结果”——在 manifest 中记录后交付。
- 阶段 6（360 视频）——视频验证更难；目前用人工视觉快速检查代替自动分类器。

## 为什么用 GPT-4/5 vision 而不是 Claude vision

两者都可行。本版本默认选 OpenAI vision，原因是：(a) 流程在阶段 2B 已集成 OpenAI 图像调用，无论如何都需要 OPENAI_API_KEY；(b) 严格评分标准的 JSON 输出模式在 GPT-4o / GPT-5 上久经验证。如果只想用 Anthropic，把调用换成 claude-opus-4-7 vision，提示词保持不变——评分标准可移植。
