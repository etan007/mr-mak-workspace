# 阶段 2A · 严格正视 A-pose 设定图——主力环节

**模型：** Nano Banana Pro（首选）| Nano Banana 2（备选）。此处绝不用 GPT-Image-2/2.5。
**分辨率：** 2K（2048×2048 或最接近的 1:1）
**画幅：** 1:1 正方形
**参考图：** 用户输入的角色图

## 提示词骨架

```
A clean character reference sheet of {CHARACTER_DESCRIPTION}, full body visible from head to toe, standing in a relaxed A-pose. STRICT FRONT VIEW — the character faces the camera directly, dead-on, NO three-quarter angle, NO rotation, NO tilt of the body. Both shoulders fully visible at equal width. Both feet equally visible at equal angle. Eyes look directly at the camera. Camera at eye-level, perfectly orthographic-style framing, zero perspective distortion. Arms angled ~45° down-and-out from the torso (A-pose), palms facing the camera, fingers relaxed. Legs shoulder-width apart, weight evenly distributed on both feet, toes pointing forward at the camera. Pure white background (#FFFFFF), no shadow on the ground, no ground plane visible. Neutral diffuse studio lighting — soft and even, no rim light, no key light from the side, no cinematic mood lighting, no colored gels. Match the character's identity, proportions, color palette, and accessories EXACTLY from the reference image. Preserve face identity. Sharp focus on the entire silhouette from head to toe. Reference-grade clarity for 3D modeling at 2K resolution.
```

## 替换规则

- `{CHARACTER_DESCRIPTION}`——在接收阶段构建。必须包含：性别表现（如明显）、外观年龄、美术风格（写实 / 风格化 / 动漫 / 卡通渲染）、主要服装、主要配饰、配色。

## 负面提示词（按模型语法追加）

```
no three-quarter view, no 3/4 angle, no body rotation, no body twist, no contrapposto, no hero pose, no dynamic pose, no action shot, no looking away from camera, no closed eyes, no head tilt, no shoulder tilt, no asymmetric stance, no foreshortening, no perspective distortion, no environment, no background props, no shadow on the ground, no rim lighting, no cinematic mood lighting, no motion blur, no depth of field, no cropped limbs, no missing parts, no duplicate limbs
```

## 进入阶段 2B 前的质量检查清单

- [ ] 严格正视——双肩等宽、双脚同角度、头部正对镜头
- [ ] 全身可见——从头到脚，无部位被裁切
- [ ] 确为 A-pose（手臂不是 90° 的 T-pose，也不是垂在身侧，约 45°）
- [ ] 掌心朝向镜头（朝前）
- [ ] 脚尖朝前指向镜头（不向外撇）
- [ ] 白色背景，无阴影渐变
- [ ] 无背景元素、无地面，场景中没有源图里不存在的道具
- [ ] 角色与源图一致——同一张脸、同一套服装、同样的配饰
- [ ] 2K 下全身清晰对焦
- [ ] 若模型输出 3/4 视角，用更强的 STRICT FRONT 措辞重试。可以退回 Nano Banana 2。若 3 次尝试后仍无模型能保持严格正视，上报用户——绝不交付 3/4 视角的设定图。
