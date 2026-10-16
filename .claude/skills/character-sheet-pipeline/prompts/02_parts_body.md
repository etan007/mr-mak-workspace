# 阶段 4 · 身体主体部件——严格正视（躯干 / 腿 / 手臂 / 头）

**模型：** Nano Banana Pro（与阶段 2A 相同——一致性优先）
**分辨率：** 2K
**参考图：** 阶段 2A 的严格正视 A-pose 设定图（始终附上）
**规则：** 部件必须是严格正视，与设定图的 A-pose 朝向完全一致。不要 3/4。不要倾斜。不要旋转。

## 各部件提示词模板

### 躯干
```
Reference the attached strict-front A-pose character sheet. Render ONLY the torso of the same character, from the base of the neck down to the top of the hips. STRICT FRONT VIEW — both shoulders equal width, body dead-on facing the camera, no rotation, no tilt, no 3/4 angle. Exact same A-pose orientation as the sheet. White background (#FFFFFF), neutral flat lighting. Show clean cut at the neck and at the hips — no clothing detail hanging off the cut. Sharp focus, reference-grade clarity at 2K. Same art style, same color palette, same materials as the sheet.
```

### 腿（成对，保持在一起）
```
Reference the attached strict-front A-pose character sheet. Render ONLY the lower body of the same character, from the top of the hips down to the soles of the feet, both legs together. STRICT FRONT VIEW — both legs visible at equal angle, toes pointing forward at the camera, no 3/4, no rotation. Exact same A-pose orientation as the sheet. Include any pants, leggings, or leg armor exactly as on the sheet. White background, neutral flat lighting. Clean cut at the hip line. Sharp focus at 2K.
```

### 手臂（成对）
```
Reference the attached strict-front A-pose character sheet. Render ONLY both arms of the same character, from the shoulder cap down to the wrist. STRICT FRONT VIEW — both arms at the exact A-pose angle from the sheet (arms angled ~45° from the torso, palms facing the camera). Both arms shown side by side at the same A-pose angle, no rotation, no 3/4. Include any sleeves, bracers, or arm wraps from the sheet. White background, neutral flat lighting. Clean cut at the shoulder and at the wrist. Hands NOT included (extracted separately).
```

### 头
```
Reference the attached strict-front A-pose character sheet. Render ONLY the head and neck of the same character. STRICT FRONT VIEW — face dead-on to the camera, eyes looking directly at the camera, no head tilt, no chin tilt, no 3/4 angle, no profile. Neutral expression (mouth closed, eyes open). Show from the top of the head down to the base of the neck. Hair included as it appears on the sheet. White background, neutral flat lighting. Same face, same proportions, same age, same skin tone, same eye color, same hair color. Sharp focus at 2K. Clean cut at the base of the neck.
```

## 通用负面提示词
```
no three-quarter view, no 3/4 angle, no rotation, no body twist, no head tilt, no shoulder tilt, no profile view, no back view, no perspective distortion, no foreshortening, no different pose, no different angle, no dramatic lighting, no rim light, no cinematic mood, no DoF blur, no environment, no background, no shadow on the ground, no extra limbs, no costume changes, no presentable hero shot, no glamour shot
```

## 各部件质量检查清单

- [ ] **严格正视**——可验证：部件两侧在画面中等宽 / 同角度
- [ ] 与阶段 2A 设定图的 A-pose 朝向一致（最常见的失败：模型把部件转了角度）
- [ ] 切口干净（无半截道具、无悬挂的袖子碎片）
- [ ] 材质 / 颜色 / 磨损与设定图一致
- [ ] 白色背景，无阴影渐变
- [ ] 2K 分辨率
- [ ] 确实用了参考图（快速核对：脸 / 肤色 / 颜色是否一致？）
- [ ] 若姿势偏向 3/4：用更强的 STRICT FRONT 锚定 + 明确的反 3/4 负面提示词重新生成。绝不交付偏移的部件。
- [ ] 若 3 次重试后仍偏移：上报用户，提供跳过或带警告接受的选项
- [ ] **V3：** 输出在接受前须经阶段 4.5 视觉分类器验证。重试逻辑和升级提示词模板见 `prompts/08_3q_classifier.md`。不要交付结论为 `hard_fail` 的部件。
