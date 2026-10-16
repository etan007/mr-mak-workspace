# img2threejs 材质参考库

本目录是图像材质分析与 Three.js 材质编写之间的标准桥梁。它被有意拆分为面向人的约定和机器可读数据：

- `THREEJS_MATERIAL_REFERENCE.md` 说明渲染规则和入门配方。
- `IMAGE_MATERIAL_ANALYSIS.md` 定义强制性的逐部件分析门禁。
- `material-reference.json` 是带版本的查找表，供后续的分析器/spec 接线使用。

本库存放的是**起始先验**，而非普适真理。粗糙度、清漆层、透射等外观参数取决于表面处理、磨损、
尺度、光照和实际参考图。流水线必须先对可见材质区域分类，再把匹配记录作为有界的起点，
按已采纳的图像证据拟合，并在受控渲染下验证。

## 查找约定

图像分析器必须输出结构化假设，而不是一个孤立的词：

```json
{
  "componentId": "torso-armor",
  "regionId": "gold-trim",
  "family": "metal",
  "subtype": "brass",
  "finish": "polished",
  "confidence": 0.81,
  "alternatives": ["metal.gold.polished", "coating.metallic-paint"]
}
```

解析顺序：

1. 由权威元数据或已评审 spec 提供的精确标准 `materialId`。
2. 精确匹配 `family + subtype + finish`。
3. 别名匹配，保留所有匹配候选，而不是静默选择其一。
4. 降低置信度的 family 兜底。
5. 当区分结果影响关键可见区域时，给出 `unknown` 和 `request-input`。

用户提供的材质身份优先于图像推断。低置信度的视觉猜测不得覆盖明确的元数据。反过来，文本材质名
只提供身份，不提供最终的颜色、磨损或粗糙度；这些仍来自图像证据。

## 应用约定

查找之后：

1. 把记录的 `renderPrior` 复制到候选材质中，绝不直接写进已接受的 spec。
2. 颜色和图案从已采纳、去光照的部件裁剪图中提取。不要把参考图中烘焙的阴影或高光当作 albedo。
3. 颜色贴图保持 `THREE.SRGBColorSpace`；粗糙度、金属度、法线、AO、厚度、各向异性等数据贴图
   保持 `THREE.NoColorSpace`。
4. 编写每一张 `requiredMap`；只有当表面在目标分辨率下确实均匀时，才可以用明确记录的常量替代贴图。
5. 初始拟合只在先验范围内进行。超出范围需要记录原因，例如涂层、风化、风格化或相互矛盾的参考证据。
6. 截取每一个 `validationView`，并对比部件的可见覆盖区域。仅凭 beauty 渲染永远不足以作为材质证据。

## 硬性限制

- 单张 RGB 图像无法唯一地分离光照、反射率、粗糙度和几何。
- 钢与铝、真皮与人造革、金与金属漆，在缺少上下文、多视角或受控光照时可能仍然无法区分。
- `MeshPhysicalMaterial` 只是近似皮肤、头发、毛皮和多层织物；它不是光谱、次表面或发丝渲染器。
- 环境强度和曝光是场景标定控制量，不是材质的固有常数。它们被有意排除在逐材质的物理身份之外。
- 被遮挡区域在获得更多证据之前，只继承低置信度的 family 先验。

## 研究来源

NotebookLM 笔记本：

```text
ThreeJS Materials Textures PBR
34554cd6-c897-4077-9561-308876bf2716
```

本约定提炼自官方 Three.js 的材质、贴图、颜色管理、渲染器和 PMREM 文档，以及 Khronos glTF 材质规范。
之后两次 NotebookLM 深度研究分别覆盖了 (1) PBR 基础、专门的皮肤/头发模型和图像材质识别，以及
(2) 当前 Three.js/Khronos 属性约定和生产配方。它们分别找到 101 和 100 个来源，导入了 73 和 52 个
被引用的来源。

只有 `material-reference.json` 中记录的来源层级可以影响标准约定：官方 Three.js 第一，Khronos 规范第二，
一手研究/参考实现第三，业界成熟的 PBR 指南第四。搜索结果中的博客、论坛和无引用的预设列表都不是
标准来源。任何生成的数值配方，在这里表示为有界先验、带有来源引用并通过仓库测试之前，都不具权威性。

## 未来流水线接线

预期的交接链路：

```text
component/material-region mask
  -> semantic material hypothesis
  -> material-reference.json lookup
  -> image-derived colour/PBR evidence
  -> ObjectSculptSpec material assignment
  -> Three.js material generation
  -> controlled render and component microscope
```

本目录定义这一交接。当前接线由 `forge/stage1_intake/material_region_analysis.py`、
`forge/stage2_spec/apply_material_analysis.py`、生成的工厂函数来源钩子，以及材质评审/门禁脚本实现。
不含 `materialPipeline` 的 spec 保持向后兼容；选择加入该约定的 spec 会被阻止，直到其区域、裁剪图、
受控对比以及几何/UV/绑定/LOD 兼容性证据全部通过。
