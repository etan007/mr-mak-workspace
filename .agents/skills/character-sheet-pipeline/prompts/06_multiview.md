# 阶段 5 · 各部件多视图——侧视与背视（由关卡控制）

**模型：** Nano Banana Pro（与阶段 2A + 4 相同——一致性优先）
**分辨率：** 2K
**参考图：** 阶段 2A 的严格正视 A-pose 设定图 + 阶段 4 对应部件的严格正视提取图（两张都附上）
**规则：** 这些是严格正交的侧视和背视图。这里同样不要 3/4。侧视 = 恰好旋转 90° 的侧面。背视 = 恰好 180° 的正背。角色 / 部件全程保持 A-pose。

## 关卡 2 默认方案

生成任何多视图前，先向用户提出以下默认方案：

> **默认多视图集合：** 身体主体部件（躯干、腿、手臂、头）+ 头发 → 每项生成侧视 + 背视。
>
> **请告诉我：**
> - “default”——接受默认集合
> - “add: [部件]”——额外为这些配饰生成多视图
> - “remove: [部件]”——这些部件不做多视图
> - “skip all”——不生成任何多视图
> - “side only”——只生成侧视，不做背视

等用户明确回复后再继续。

## 为什么要设关卡

多视图会让渲染数量比阶段 4 翻两到三倍。一个有 9 个部件的角色，正视 9 张 + 其中 5 个（身体部件）做侧 + 背 = 9 张正视 + 10 张多视图 = 19 次渲染。每次都消耗额度，用户需要同意这个量。

## 各部件提示词模板

### 身体部件——侧视（90° 侧面）
```
Reference the attached strict-front A-pose character sheet and the front-facing {PART_NAME} extract. Render the same {PART_NAME} in STRICT PROFILE view — the body / part rotated exactly 90 degrees so the camera now sees the character's LEFT side (showing the right side of the part from the camera's perspective). Strict orthographic, NO 3/4, NO tilt, NO perspective. A-pose held — arms still angled 45°, legs still shoulder-width. White background (#FFFFFF), neutral flat lighting at 2K. Same character, same proportions, same materials as the sheet. Clean cuts at the same anatomical landmarks as the front extract.
```

### 身体部件——背视（180°）
```
Reference the attached strict-front A-pose character sheet and the front-facing {PART_NAME} extract. Render the same {PART_NAME} in STRICT BACK view — the character rotated exactly 180 degrees so the camera now sees the back of the part dead-on. Strict orthographic, NO 3/4, NO tilt, NO perspective. A-pose held — arms still angled 45° (now seen from behind), legs still shoulder-width. White background, neutral flat lighting at 2K. Same character, same proportions, same materials. Clean cuts at the same landmarks as the front extract.
```

### 头——侧视
```
Reference the attached strict-front A-pose character sheet and the front-facing head extract. Render the same head in STRICT PROFILE view — rotated exactly 90 degrees, camera sees the character's left ear, nose pointing to the camera-right edge of frame. NO 3/4. Strict orthographic. Neutral expression, mouth closed, eye open. White background, neutral flat lighting at 2K. Same face, hair, accessories.
```

### 头——背视
```
Reference the attached strict-front A-pose character sheet and the front-facing head extract. Render the back of the same head — exactly 180 degrees rotated, camera sees the back of the skull dead-on. NO 3/4. Show the hair from behind in full, any tied details (ponytail, braid, hair accessories on the back). White background, neutral flat lighting at 2K.
```

### 头发——侧视与背视（对长发/造型发价值高）
```
Reference the attached strict-front A-pose character sheet and the front-facing hair extract. Render the same hair from {ANGLE — "the left side, 90° profile" / "directly behind, 180°"}, isolated on a white background. Strict orthographic. Soft alpha edges. Show the full back silhouette where braids, ties, or accessories sit. Neutral flat lighting at 2K. No head, no body — hair only.
```

### 配饰（仅限用户认可的）——侧视
```
Reference the attached strict-front A-pose character sheet and the front-facing {ACCESSORY_NAME} extract. Render the same {ACCESSORY_NAME} from STRICT PROFILE — exactly 90° rotation, camera sees the side. NO 3/4. Strict orthographic. White background, neutral flat lighting at 2K. Same materials, same wear.
```

### 配饰——背视
```
Reference the attached strict-front A-pose character sheet and the front-facing {ACCESSORY_NAME} extract. Render the same {ACCESSORY_NAME} from STRICT BACK — exactly 180° rotation, camera sees the back face dead-on. NO 3/4. White background, neutral flat lighting at 2K.
```

## 多视图通用负面提示词
```
no three-quarter view, no 3/4 angle, no 45° angle, no rotated showcase, no perspective distortion, no foreshortening, no different pose, no broken A-pose, no different materials, no different color, no environment, no background, no shadow, no dramatic lighting, no presentable hero angle
```

## 每张多视图的质量检查清单

- [ ] 侧视 = 精确的 90° 侧面（不是 80°、不是 100°、不是 3/4）
- [ ] 背视 = 精确的 180°（不是“背面 3/4”）
- [ ] 保持 A-pose（针对角色部件）
- [ ] 角色 / 比例 / 材质与严格正视提取图一致
- [ ] 白色背景、平光、2K
- [ ] 若模型默认输出 3/4：用更强的 STRICT PROFILE / STRICT BACK 锚定后重试
