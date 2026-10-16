# 阶段 4 · 成对部件——严格正视（手、靴子、手套、护手）

**模型：** Nano Banana Pro
**分辨率：** 2K
**参考图：** 阶段 2A 的严格正视 A-pose 设定图（始终附上）
**规则：** 成对部件在画面中保持在一起，与设定图上的严格正视角度相同。不要“3/4 外侧视角”。不要“展示用大片角度”。两件朝向完全一致的严格正视，近景裁切以看清细节。

## 各部件提示词模板

### 手 / 手套（成对）
```
Reference the attached strict-front A-pose character sheet. Render BOTH hands of the same character as a labeled pair, close-up framing. STRICT FRONT VIEW — palms facing the camera dead-on, fingers relaxed and slightly spread, exactly as in the A-pose orientation on the sheet. Show the left hand on the left side of the frame, right hand on the right side, both at the SAME strict-front angle (palms to camera). NO 3/4 view, NO outer-side view, NO inside-palm tilt. Include any gloves, rings, or hand armor exactly as on the sheet. White background, neutral flat lighting. Sharp focus, reference-grade clarity at 2K. Same color, same material, same wear as the sheet.
```

### 靴子 / 脚（成对）
```
Reference the attached strict-front A-pose character sheet. Render BOTH feet/boots of the same character as a labeled pair, close-up framing. STRICT FRONT VIEW — toes pointing at the camera, both boots seen dead-on from the front, exactly as positioned on the A-pose sheet. Left boot on the left of the frame, right boot on the right, both at the SAME strict-front angle. NO 3/4 outer view, NO side angle, NO hero shot. Include any straps, buckles, or front-visible sole detail from the sheet. White background, neutral flat lighting. Sharp focus at 2K. Same color, same material, same wear.
```

### 通用成对模式（用于不对称的一对——一只手套 + 一个护腕等）
```
Reference the attached strict-front A-pose character sheet. Render the {LEFT_ITEM_NAME} and the {RIGHT_ITEM_NAME} of the same character as a labeled pair, close-up framing. STRICT FRONT VIEW — both items shown at the same strict-front angle, matching the A-pose orientation on the sheet. Label which is left and which is right. White background, neutral flat lighting at 2K. Match the exact materials and wear from the sheet.
```

## 成对部件与身体部件的失败方式为何不同

身体部件必须保持严格正视 A-pose，才能让接缝与身体组装吻合。

成对部件可以拉近以看清细节（是近景而非全景）——但必须保持相同的严格正视角度。这一对作为近景细节图一起展示，两件朝向完全一致。如果左手是严格正视而右手是 3/4，流程就无法把它们重新组装。

成对部件的侧视和背视图属于阶段 5（多视图），仅在用户要求时制作——不属于默认提取。

## 负面提示词
```
no three-quarter view, no 3/4 outer view, no 3/4 hero angle, no different angles between the pair, no asymmetric framing, no rotation, no tilt, no inside-palm tilt for hands, no outer-sole tilt for boots, no holding props, no clenched fists (unless the sheet showed clenched fists), no separate frames, no background, no environment, no shadow, no dramatic lighting, no presentable hero angle, no glamour shot
```

## 质量检查清单

- [ ] 已核实严格正视——两件都正面朝前，角度完全一致
- [ ] 两件在同一画面中，作为带标注的一对展示
- [ ] 材质 / 颜色 / 磨损与设定图一致
- [ ] 白色背景，无阴影
- [ ] 2K，清晰对焦
- [ ] 若模型输出 3/4 外侧视角：加明确的反 3/4 锚定后重试
