# 细节清单

在分析阶段、编写 spec 之前使用本参考。之所以需要它，是因为代理如果只对整张图扫一眼，
那些决定身份的小痕迹（一道倒角高光、一排铆钉、一块污渍）就会被漏掉。应逐区扫描，并把每个
痕迹记录为结构化的 `detail`，而不是散文式描述。

## 规则

每条 `detail` 记录：位置（`region`，归一化）、变化内容（`kind` + `affects`）、强度（`scale`，
强度由下文配方隐含）、证据区域（`evidenceRef`）以及置信度。它**必须**把 `mapsTo` 设为一个
真实存在的 `component.localFeatures[]` 条目或 `material.localOverrides[]` 条目。只用散文描述
的细节视为门禁失败——如果它没有映射到生成器会读取的字段，就不会出现在渲染中。

## 分类——kind 与图形学术语的对应

### gloss（光泽，do bong）
局部低粗糙度区域或镜面高光点，而不是整体材质变化。
- `material.localOverrides`：在该区域上设低 `roughness` 值（0.05-0.2），或在
  `MeshPhysicalMaterial` 上使用 `clearcoat` + `clearcoatRoughness` 来表现漆面/湿润效果。
- 条纹状高光（拉丝金属、头发）-> `anisotropy` + `anisotropyRotation`。
- 记录高光点相对主光方向的位置；没有匹配光照方向的 gloss 细节不会在渲染中显现。

### bevel（倒角，bo goc）
边缘处理，而不是纹理花招——光线打在真实的倒角上。
- `component.localFeatures` 几何效果：`edgeTreatment.type = chamfer`、
  `bevelRadius`（相对物体，例如 0.02-0.08）、`segments`（柔和边缘 2-4，硬边 1）。
- 记录它在掠射光下是否表现为一条亮边高光；若参考图沿边缘显示一条清晰的亮线，倒角必须是
  真实几何体，而不是法线贴图。

### fastener（紧固件：螺丝 / 铆钉 / 螺栓）
重复的小部件——始终用实例化系统，绝不做成一个个单独网格。
- `InstancedMesh`、`count`、间距/分布（线性、径向、网格）、头部形状（半球、平头、六角）、
  凹陷（凸起 vs 沉头）、材质（通常为金属，头部顶面粗糙度低）。
- 置信度应反映是每个实例都可见，还是只有一部分清晰可辨（被遮挡的部分行，只要能推断出间距，
  仍然算数）。

### linework（线条：雕刻 / 涂绘线 / 面板线）
三种截然不同的技法——选择证据所支持的那一种，它们读起来各不相同：
- 雕刻凹槽：几何效果，沿路径的凹陷 `groove`（见下文）；会形成阴影，没有几何体的话在任何光照
  下都会显得扁平。
- 涂绘线 / 贴花：带 canvas 纹理贴花区域的 `material.localOverrides`；只有颜色对比，没有起伏。
- 面板线：深色 AO 接缝——沿接缝用一条细的 `localOverride` 压暗粗糙度/AO，没有真实深度；当
  参考图显示的是柔和的暗线而非硬凹槽时使用。
- 给出可读性目标：线条在评审的掠射光截图中必须仍然可读。

### contour（轮廓：边缘描边 / 卡通轮廓光）
风格化描边，通常是轮廓光或背面描边技法。
- `material.localOverrides`，或专门的描边 pass（反转外壳或 shader 轮廓光）。
- 记录哪些轮廓边带有描边；部分描边（只有顶边）很常见。

### seam（接缝）
两个表面相接处的结构线（模压件、布料拼片、装甲板）。
- 几何效果：细的凹陷 `groove` 或凸起 `ridge`（按参考图所示选择），外加缝隙中略暗的 AO
  localOverride。

### stitch（布料缝线）
- `component.localFeatures`：沿接缝路径的小型重复凸点或虚线凹槽；通常与
  `linework: painted line` 搭配，以表现缝线颜色对比。
- 像紧固件排一样沿曲线实例化或重复，但间距更细。

### stain（污渍：污垢 / 包浆 / 变色 / 褪色）
始终是一个 `material.localOverrides` 区域，用以下子字段描述：
- `dirtAmount`：0-1，变暗/降饱和的程度。
- `cavityBias`：是否集中在缝隙/凹腔中（污垢/油污通常是）。
- `streak`：垂直/定向流痕标志 + 方向（受重力影响的污垢向下流）。
- `patinaColor`：氧化/铜绿/锈斑的十六进制颜色或具名色相偏移。
- `fadedMask`：日晒褪色形成的更浅、降饱和区域——与污垢相反，但仍是 localOverride。
- `region`：在物体上的位置，关联到 `evidenceRef`。

### scratch（划痕）
细小的局部粗糙度/法线扰动，可选择露出下层颜色。
- `material.localOverrides`：带方向（通常是使用造成的径向或定向）、宽度的划痕簇，以及是否
  露出下方不同的底色。

### chip（崩口）
表面材料缺失的小块区域，通常在边缘或角落。
- 若改变轮廓（缺口），用几何效果；否则用 localOverride，在角/边组件上露出下层颜色/粗糙度。

### decal（贴花）
印刷/粘贴的图形或标签，平贴在表面上。
- 带 canvas 纹理区域的 `material.localOverrides`；记录位置、近似尺寸和旋转。贴花不增加几何体，
  除非它有物理厚度（贴纸边缘）——若有，添加一块细的凸起 `component.localFeatures` 薄片。

### emissive（自发光）
自发光区域（LED、辉光、屏幕、余烬）。
- `material.localOverrides`：`emissive` 颜色 + `emissiveIntensity`，以及在渲染器色调映射下是否
  应产生泛光。记录它是恒定的，还是应当作为影响周围表面的光源（可能需要配套的点光/面光）。

### hole（孔洞）
真实的开口或插槽，会改变轮廓/拓扑。
- `component.localFeatures` 几何效果：真实的切口或插槽，而不是一块深色纹理。记录深度，以及
  内部是否需要自己的材质（可见凹腔）。

### groove（凹槽）
凹陷的直线或曲线沟道。
- 几何效果：沿路径的负起伏，宽度/深度相对物体，外加沟道内的 AO 压暗。与雕刻线条和接缝共享
  同一套机制。

### ridge（棱脊）
凸起的直线或曲线特征，是 groove 的几何反面。
- 几何效果：沿路径的正起伏，宽度/高度相对物体，顶边会接住高光（若参考图在棱脊顶部显示一条
  高光线，应搭配 gloss 或 bevel 说明）。

## 扫描方法

选择一种并记录为 `scanMethod`：
- `component-zones`：逐个遍历计划组件的包围区域；适用于组件边界已经确定的情况。
- `grid-3x3` / `grid-4x4`：把图像划分为均匀网格并检查每一格；适用于组件尚未确定、或物体没有
  明显部件边界的情况。

按复杂度等级设置 `targetMinDetails`：simple 3、moderate 6、complex 10、ultra 16（初始值，
运行后再调）。逐区扫描并对照最小数量，正是防止一眼扫过而漏掉小痕迹的关键。

## 置信度

每条细节打 0-1 分。以下情况应降低置信度：部分被遮挡的区域、靠对称推断而非亲眼看到的痕迹、
或 kind 分类有歧义（例如 scratch 与 panel-line 难以区分）。不要为凑够 `targetMinDetails` 而
虚抬置信度——未关联或低置信度、未通过 `mapsTo` 检查的细节仍会阻断门禁。
