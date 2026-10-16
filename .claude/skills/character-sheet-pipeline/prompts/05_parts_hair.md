# 阶段 4 · 头发——严格正视（默认开启，仅可主动关闭）

**模型：** Nano Banana Pro
**分辨率：** 2K
**参考图：** 阶段 2A 的严格正视 A-pose 设定图 + 头部提取图（如有，两张都附上）
**规则：** 头发**默认始终提取**。用户可在关卡 1 选择关闭，但这是主动关闭而不是主动开启。头发必须保持严格正视，与头部的正面朝向一致，以便之后 1:1 装回头部。

## 为什么默认开启

多数图生 3D 模型处理体积感头发很吃力——会输出一团粘在头上的融合块。提供一张发丝清晰的独立头发参考，用户就可以：
- 交给专门的头发 3D 流程（XGen、Hair Tool、Genesis hair）
- 用作发片（hair cards）的贴图参考
- 身体自动生成的同时，单独手工建模头发

跳过头发提取，默认得到的 3D 输出会更差。所以默认开启。

## 提示词模板

```
Reference the attached strict-front A-pose character sheet and head extract. Render ONLY the hair of the same character, isolated on a white background. STRICT FRONT VIEW — exactly the same front-facing angle as the head appears on the sheet. NO 3/4 angle, NO profile, NO back view (those come in Stage 5 multi-view if requested). Include the full silhouette as it reads from the front — every strand, braid, accessory, or extension that's visible from the front. Soft alpha-style edges where the hair meets the air (no harsh cut-outs). Neutral flat lighting. Same color, same highlights, same shine level, same accessories as the sheet. Sharp focus on the strand detail at 2K. No head, no face, no body — only the hair shape as if it were lifted off the head and floated in space, but viewed dead-on from the front.
```

## 通用负面提示词

```
no three-quarter view, no 3/4 angle, no profile, no back view, no rotation, no tilt, no head, no face, no body, no shoulders, no environment, no background, no shadow, no dramatic lighting, no harsh outline, no clean silhouette cut (hair needs soft edges), no presentable showcase angle
```

## 质量检查清单

- [ ] 严格正视——可验证：头发轮廓对称，或与设定图上的正面轮廓一致
- [ ] 已隔离——无头部、无身体
- [ ] 发丝与空气交界处为柔和的 alpha 边缘
- [ ] 颜色、高光、光泽与设定图一致
- [ ] 白色背景
- [ ] 2K，发丝细节清晰

## 何时跳过（少见）

仅在以下情况可跳过头发提取：
- 角色光头 / 没有头发
- 头发被帽子或兜帽完全遮住（改为提取帽子/兜帽）
- 用户在关卡 1 明确选择关闭

其他情况——短而服帖的头发、复杂造型、动漫尖刺发、辫子、狐耳——一律提取。

## 头发的阶段 5 多视图

若用户在关卡 2 认可为头发做多视图，用同样的严格正交标准生成头发的侧视 + 背视图。对长发、马尾、脑后扎辫，或任何背面轮廓与正面明显不同的发型尤其有价值。
