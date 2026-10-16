# 阶段 2B · 补充多视图角色设定图（3 个投影 + 配饰平铺）

**模型：** GPT-Image-2.5（2026 年 9 月起为首选，源工作流的选择；fal id `openai/gpt-image-2.5/flare/*`）| GPT-Image-2，再到 Seedream V5 Lite（备选）——GPT-Image 系列最擅长在一张图里排布多个分格投影
**画幅：** 16:9 横版
**参考图：** 用户输入的角色图 + 阶段 2A 的严格正视 A-pose 设定图（两张都附上）

## 用途

这是**给用户看的视觉辅助**——一张 16:9 图，展示角色的三个正交投影（正、侧、背），配饰单独平铺在旁边。帽子、武器、披风、背包等大件单独画在人物旁，便于用户在部件确认环节准确指认。

它**不**直接作为部件提取的输入（输入是阶段 2A 的图）。它用于人工参考，并在多视图提取时作为下游的姿势匹配参考。

## 提示词骨架

```
A clean orthographic character sheet of {CHARACTER_DESCRIPTION}, 16:9 landscape composition, white background (#FFFFFF) throughout. Show the character in THREE views, each in A-pose, laid out left-to-right across the sheet:

1. FRONT view (left third) — character faces the camera dead-on, strict front, A-pose, full body head to toe. Identical to the strict-front sheet from Stage 2A.

2. SIDE view (middle third) — character in profile, 90 degrees rotated to the right (camera sees the character's left side), still in A-pose, full body head to toe, feet on the same ground line as the front view.

3. BACK view (right third) — character faces directly away from the camera, dead-back, A-pose, full body head to toe, feet on the same ground line as front and side.

To the right of the figure (or above/below if space requires), lay out the character's separable accessories as ISOLATED objects on the same white background: {ACCESSORY_LIST — e.g. "the wizard hat, the curved katana, the leather satchel"}. Each accessory drawn cleanly at a natural angle, large enough to read all detail. Label each accessory with its name in small caption text below the object.

Neutral diffuse flat lighting throughout, no shadow on the ground, no cinematic mood. Character identity, proportions, color palette, and accessories match the reference image EXACTLY across all three projections. Sharp focus, reference-grade clarity. Same character in all three views — verifiably the same proportions and face.
```

## 替换规则

- `{CHARACTER_DESCRIPTION}`——与阶段 2A 使用的描述相同
- `{ACCESSORY_LIST}`——接收阶段识别出的所有可拆分配饰（帽子、武器、背包、首饰、披风等）。若无配饰，整段删除配饰平铺指令。

## 负面提示词

```
no inconsistent character across views, no different face between views, no different proportions, no different outfit, no different colors, no overlapping views, no cropping of any view, no environment, no background props, no shadow gradient on ground, no dramatic lighting, no rim light, no cinematic mood, no perspective camera, no foreshortening, no missing accessories, no merged accessories, no labels missing
```

## 质量检查清单

- [ ] 三个视图齐全且清楚分隔
- [ ] 每个视图都是严格正交（正视 = 正对、侧视 = 正侧、背视 = 正背）
- [ ] 各视图可确认是同一角色（脸部比例、服装、颜色相同）
- [ ] 三个视图都保持 A-pose
- [ ] 配饰单独平铺并加标注
- [ ] 白色背景，无阴影，无环境
- [ ] 16:9 画幅干净，无裁切
- [ ] 参考级清晰度（作为视觉参考而非输入，但仍需清晰可读）
- [ ] 若构图失败（视图重叠、各视图脸不同）：重试。2 次重试后仍失败，退回 Seedream V5 Lite。仍失败则上报。

## 为什么此阶段用 GPT-Image-2 而不用 Nano Banana Pro

Nano Banana Pro 是严格正交下单角色单姿势的主力，但在多分格布局中难以跨格保持角色一致。GPT-Image-2 在同一画布上排布同一角色的 3 个分格视图并保持一致身份更可靠——而这正是阶段 2B 唯一的任务。
