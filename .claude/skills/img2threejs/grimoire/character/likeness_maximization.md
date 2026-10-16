# 相似度最大化（投影优先管线）

当目标是与单张参考图中某个特定人物或角色达到最大相似度、而不是做一个通用风格化角色时，使用本参考。这是 `character` 领域默认的高相似度路径；输入质量较弱或用户接受近似效果时，走 `character/reconstruction.md` 描述的风格化/徒手兜底路径。

本参考所实现的完整规格见 `docs/UPGRADE_PLAN.md` 第 5.8-5.10 节。

## 为什么徒手雕刻达不到高相似度

手写的基本体（胶囊体、球体、凭肉眼调的 blend shape）可以逼近比例，但无法复现照片中编码的精确几何与表面信息。真正能提升相似度的两个杠杆是：(1) 让网格的形状和相机与照片精确对齐；(2) 把照片本身的像素作为纹理贴到该网格上。其他一切都是次要的。

## 管线

### (a) 将参数化模板拟合到关键点

提供一个轻量、由代码生成的参数化人形/面部模板——以头身单位参数化的身体加一个可形变的面部，概念上对应 SMPL-X（身体 + 手 + 面部、下颌/眼睛关节、带校正 blendshape 的线性混合蒙皮）和 FLAME（基于扫描的面部）。它保持程序化：模板由代码生成、由参数驱动，绝不是下载的美术资源。

通过最小化模板关键点与 `stage1_intake/extract_landmarks.py` 观测到的 2D 关键点之间的重投影误差，来拟合模板参数（形状、姿势、表情）——即 SMPLify-X 的思路。不要手动摆放顶点；求解参数，使模板投影后的关键点与图像关键点吻合。

### (b) 相机匹配

估计并存储参考照片的焦距、FOV 和朝向（`forge/stage1_intake/solve_camera_pose.py`，输出一个 `referenceCamera` spec 块）。渲染相机必须与之匹配，以便：

- 评审截图可以与源照片做像素级叠加
- 步骤 (d) 中的纹理投影能准确落位

没有匹配的相机，只要模型从创作时那个偶然角度以外的任何角度观看，投影纹理就会错位。

### (c) 先去光照，再把照片当作 albedo

原始照片烘焙了拍摄时现场光照造成的阴影、高光和环境光遮蔽。直接用作 albedo 意味着投影纹理会与新场景的光照相冲突。运行一遍去光照（`forge/stage1_intake/delight_albedo.py`）——最低限度是高通/叠加中和，如有可用的 AI 去光照工具则用其等效方案——以恢复中性的基础色，然后独立推导 roughness/normal/AO。把"albedo 必须不含烘焙光照"视为硬性要求，而不是锦上添花。

### (d) 投影与烘焙

基于匹配的相机求解投影/相机投影贴图（Three.js `ShaderMaterial`，或 `three-projected-material` 的做法），把去光照后的参考图映射到拟合好的网格上，然后针对可见（正面）一侧把结果烘焙进网格的 UV（`forge/stage3_build/bake_projected_texture.py`，标准库 PNG）。

### (e) 推断不可见区域，标注置信度

背面/侧面没有被观测到。可选方案按优先级排序：

1. 请求额外视图（`request-input`：front/side/back）——对真人始终先尝试这一项
2. 在解剖学上成立时，沿身体对称面镜像正面纹理（对面部效果尚可，对不对称的头发/服装效果差）
3. 万不得已时，从最近的已观测边缘延续调色板

每个推断区域都要有各自的置信度分数，并注明由哪种策略产生。绝不能把推断出的背面不加说明地当作观测结果呈现。

### (f) 为形变做绑定

输出一个 `SkinnedMesh`，带有身体的关节骨架，以及用于面部表情的 morph target/blend shape，可导出为 glTF。保持拓扑可预测（已重拓扑，面部周围四边面均匀），使 blendshape 形变干净。通过 `root.userData.sculptRuntime` 暴露骨架和 morph 通道。

## 分部件说明（风格化到写实的调节）

配方与 `character/reconstruction.md` 相同，只是向写实方向调节：皮肤保持暖色基底/柔和粗糙度/边缘光的近似（真正的 SSS 不在范围内）；头发仍优先使用风格化发簇而非发丝几何——单张图像无法提供真实的头发微观结构，所以不要夸大头发的相似度；眼睛采用光泽球体加虹膜贴花的处理，并带正确的眼神光，这比单纯的几何精度更显"有生气"。

## 诚实性说明

每次运行此管线时都要明确说明：单张图像无法保证 100% 的相似度。背面/侧面、被遮挡的几何，以及真实的皮肤/头发微观结构，都无法从一张照片中观测到。本管线通过参数化拟合 + 照片投影 + 去光照 + 相机匹配来最大化相似度，报告各区域置信度，并在对象是真人且保真度重要时请求额外视图。绝不能把"100% 匹配"作为输出结论——改为按区域报告置信度。

一个可选的、需显式标记的 `generativeAssist` 模式（导入外部图生 3D 的基础网格，例如 TRELLIS/Tripo/Hunyuan3D/Rodin）能把写实上限抬得更高（按当前生成器水平，正脸形状准确度约 80-95%），但它是非程序化的，绝不会作为静默默认——见 UPGRADE_PLAN.md 第 5.9 节。

## 来源

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
