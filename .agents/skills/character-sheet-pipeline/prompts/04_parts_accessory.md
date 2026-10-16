# 阶段 4 · 配饰——严格正视（帽子、武器、背包、首饰、披风、道具）

**模型：** Nano Banana Pro
**分辨率：** 2K
**参考图：** 阶段 2A 的严格正视 A-pose 设定图（始终附上）
**规则：** 配饰同样先做严格正视。不要“3/4 大片角度”，不要“展示用陈列图”。按物品戴/挂在角色身上时的正面朝向。侧视和背视图只在用户要求时于阶段 5（多视图）生成。

## 各配饰模板

### 帽子 / 头盔 / 头饰
```
Reference the attached strict-front A-pose character sheet. Render ONLY the {HAT_DESCRIPTOR — e.g. "wide-brimmed wizard hat with star-pattern band"} from the character, isolated on a white background. STRICT FRONT VIEW — the hat is shown head-on from the front, exactly as it would appear sitting on the character's head in the A-pose. NO 3/4 angle, NO tilted-back hero shot, NO side angle. Show the brim and crown as they read dead-on from the front. Neutral flat lighting. Same material, same color, same pattern, same wear as the sheet. Sharp focus at 2K. No character wearing it — just the hat as a standalone object, but oriented as it would sit on the front-facing character.
```

### 武器（单手）
```
Reference the attached strict-front A-pose character sheet. Render ONLY the {WEAPON_NAME — e.g. "curved katana with red wrapped handle"} from the character, isolated on a white background. STRICT FRONT VIEW — the weapon shown blade-front / front-face directly to the camera, full length visible vertically (or horizontally if naturally long-axis). NO 3/4 hero angle, NO presentable showcase angle. Front-orthographic, like a technical reference. Neutral flat lighting. Same material, same hilt detail, same blade finish, same wear as the sheet. Sharp focus at 2K.
```

### 武器（双手）/ 长柄武器
```
Reference the attached strict-front A-pose character sheet. Render ONLY the {WEAPON_NAME} from the character, isolated on a white background. STRICT FRONT VIEW — full length visible, front face to the camera, no rotation. Neutral flat lighting at 2K.
```

### 背包 / 挎包 / 随身物品
```
Reference the attached strict-front A-pose character sheet. Render ONLY the {ITEM_NAME — e.g. "leather satchel with brass buckles"} from the character, isolated on a white background. STRICT FRONT VIEW — front face of the item shown dead-on, the way it would appear hanging on the character's front-facing pose. NO 3/4 angle, NO hero shot. Neutral flat lighting. Same material, same hardware, same wear and patina as the sheet. Sharp focus at 2K.
```

### 披风 / 斗篷 / 长款飘动服饰
```
Reference the attached strict-front A-pose character sheet. Render ONLY the {GARMENT_NAME} from the character, isolated on a white background. STRICT FRONT VIEW — shown either laid flat or hanging on an invisible stand, silhouette dead-front to the camera. NO 3/4. Neutral flat lighting. Same color, same material, same trim, same wear as the sheet. Sharp focus at 2K.
```

### 首饰 / 小型附着配饰（戒指、胸针、项链、耳环）
```
Reference the attached strict-front A-pose character sheet. Render ONLY the {JEWELRY_NAME} from the character, isolated on a pure white background. STRICT FRONT VIEW — macro close-up, front face to the camera, no rotation. Neutral flat lighting at 2K. Same metal, same stones, same finish as the sheet.
```

## 配饰通用负面提示词
```
no three-quarter view, no 3/4 angle, no presentable hero shot, no glamour shot, no character body parts visible, no holding hands, no environment, no background, no shadow on the ground, no dramatic lighting, no different colors, no different materials, no rotated showcase angle
```

## 各配饰质量检查清单

- [ ] 已核实严格正视——物品正面朝前，无旋转
- [ ] 已隔离——画面中无身体部位
- [ ] 材质和颜色与设定图一致
- [ ] 尺寸可读
- [ ] 正视下所有特征细节可见（侧/背细节如有要求在阶段 5 处理）
- [ ] 白色背景，无阴影渐变
- [ ] 2K，清晰对焦
- [ ] 若模型默认输出 3/4 大片角度（非常常见）：加明确的反 3/4 负面提示词后重试
- [ ] **V3 强制：** 输出自动经过阶段 4.5 的视觉分类器。若结论为 `hard_fail`，自动调用 `prompts/08_3q_classifier.md` 中的升级提示词重试。配饰不得绕过分类器——在 V2 数据中，配饰是偏移最严重的类别。

## 为什么配饰也要严格正视

本技能的旧版本允许配饰用 3/4 角度，理由是“用户反正可以在 3D 里调整朝向”。这是错的——用户必须先手动把参考图转回正面才能喂给图生 3D 模型，多了一步且降低参考质量。严格正视是唯一一致的基准。侧视和背视只在用户明确要求时由阶段 5（多视图）生成。
