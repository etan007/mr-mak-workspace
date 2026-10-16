# Three.js 材质渲染参考

这是 `material-reference.json` 的人类可读配套文档。JSON 文件是机器查找的标准来源；本文说明从图像
重建模型时如何解读它。

## 有来源依据的 Three.js 约定

以下是来自官方 Three.js/Khronos 资料的渲染器约定，而非材质预设：

- `MeshStandardMaterial` 和 `MeshPhysicalMaterial` 使用 metallic-roughness PBR。
- `metalness` 和 `roughness` 取值在 `[0, 1]`；粗糙度和金属度贴图与对应标量相乘。
- `MeshPhysicalMaterial` 增加了清漆层、sheen、透射/体积、IOR、虹彩、各向异性和色散，
  代价是额外的 GPU 开销。
- `ior` 被限制在 `[1, 2.333]`；透射使用 `opacity = 1`，并需要有意义的几何厚度或厚度贴图。
- PBR 验证需要有意义的环境。用 `PMREMGenerator` 预过滤 HDR 环境。
- 颜色贴图使用 sRGB；数学数据贴图保持不标记/线性（`NoColorSpace`）。
- 切换贴图槽位或材质特性可能触发着色器重新编译。截取评审证据前要等待贴图上传完成。

主要来源及其 NotebookLM 来源 ID 列在 `material-reference.json` 中。在固定下文代码模式之前，
还用 Context7 核对了当前的 `/mrdoob/three.js` API 和官方示例。

## 研究来源层级

1. Three.js 官方文档、源码和示例定义运行时 API。
2. Khronos glTF 核心及材质扩展定义可移植的 metallic-roughness、sheen、透射和体积语义。
3. 一手研究/参考实现解释原生 Three.js 未直接建模的现象，尤其是皮肤次表面散射、头发散射和视觉材质识别。
4. Adobe 的 PBR Guide 和 Google 的 Filament 文档提供业界成熟的生产护栏。

本库有意把论坛配方排除在标准数值之外。官方 Three.js 示例是 API 证据，并不自动成为物理正确的预设；
例如名为 "car paint" 的演示，并不能推翻"完好的颜料/粘合剂层是电介质"这一分层规则。

## 如何解读这些数字

每个逐材质数值都是受官方属性语义约束的**推断起始先验**。它并不声称所有该材质的物体都只有一个粗糙度。
图像分析者必须选择 family、subtype 和 finish，应用先验，然后对照已采纳的部件裁剪图，在范围内拟合
颜色/变化。

| 标准材质 | metalness | roughness | 高级参数起始值 | 关键证据 |
| --- | ---: | ---: | --- | --- |
| 人类皮肤 | 0 | 0.52 | clearcoat 0.12, IOR 1.4 | neutral + grazing；有毛孔但无塑料光泽 |
| 人类头发 | 0 | 0.45 | anisotropy 0.65 | 方向性高光沿发丝/发束走向 |
| 风格化毛皮 | 0 | 0.78 | sheen 0.45 | 掠射响应加上不连续的轮廓 |
| 编织哑光织物 | 0 | 0.85 | sheen 0.65 | 编织法线和宽泛的掠射 sheen |
| 丝绸/缎面 | 0 | 0.32 | sheen 0.85, anisotropy 0.45 | 会移动的方向性高光 |
| 天鹅绒 | 0 | 0.72 | sheen 1.0 | 正面暗、边缘柔和明亮 |
| 哑光皮革 | 0 | 0.62 | clearcoat 0.08 | 不规则纹理，磨损边缘更光滑 |
| 抛光钢/镀铬 | 1 | 0.12 | — | 锐利的中性环境反射 |
| 拉丝钢 | 1 | 0.35 | anisotropy 0.85 | 沿拉丝方向拉长的反射 |
| 铝 | 1 | 0.30 | anisotropy 0.20 | 明亮的中性缎面导体 |
| 铜 | 1 | 0.28 | — | 红橙色导体反射；铜绿另作区域 |
| 黄铜/青铜 | 1 | 0.30 | — | 黄棕色导体响应 |
| 金 | 1 | 0.22 | — | 黄色的反射能量，而非黄色漫反射漆 |
| 涂漆/涂层金属 | 0 | 0.45 | clearcoat 0.75 | 电介质漆面；露出金属的剥落处需要遮罩/区域 |
| 亮面塑料 | 0 | 0.28 | clearcoat 0.20, IOR 1.5 | 有色漫反射主体上的中性镜面反射 |
| 哑光塑料 | 0 | 0.68 | IOR 1.5 | 宽泛高光；模塑/点状微结构 |
| 哑光橡胶 | 0 | 0.88 | IOR 1.48 | 微弱宽泛高光，带防滑微纹理 |
| 未处理木材 | 0 | 0.72 | anisotropy 0.12 | 木纹方向影响颜色和粗糙度 |
| 清漆木材 | 0 | 0.42 | clearcoat 0.75 | 木纹之上有独立的涂层反射 |
| 天然石材 | 0 | 0.78 | 可选 clearcoat | 多尺度矿物图案和起伏 |
| 釉面陶瓷 | 0 | 0.26 | clearcoat 0.70, IOR 1.5 | 坚硬电介质主体加釉面反射 |
| 透明玻璃 | 0 | 0.05 | transmission 1, IOR 1.5 | 背景扭曲、反射和厚度 |
| 磨砂玻璃 | 0 | 0.52 | transmission 0.85, IOR 1.5 | 模糊透射和蚀刻微法线 |
| 类石英宝石 | 0 | 0.06 | transmission 0.9, IOR 1.54 | 切面和随厚度变化的透射 |

请使用 JSON 中的范围，而不只是这一列默认值。磨损、潮湿、氧化、积灰、划伤、抛光或风格化的表面
可能落在范围内的其他位置，或需要新增一条 finish 记录。

## 当前的 Three.js 实现模式

从选中的配置创建候选材质，再附加各自独立编写的贴图。不要把光照烘焙进 `map`，也不要给数学贴图设置 sRGB：

```ts
import * as THREE from "three";

const loader = new THREE.TextureLoader();

function loadColorMap(url: string): THREE.Texture {
  const texture = loader.load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function loadDataMap(url: string): THREE.Texture {
  const texture = loader.load(url);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

const material = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, // 由图像得出的色调；若 map 已负责颜色则保持白色
  map: loadColorMap("base-color.png"),
  roughness: 0.85,
  roughnessMap: loadDataMap("roughness.png"),
  metalness: 0.0,
  metalnessMap: loadDataMap("metalness.png"),
  normalMap: loadDataMap("normal.png"),
  sheen: 0.65,
  sheenRoughness: 0.75,
});
```

标量和贴图相乘，因此白色数据贴图保留标量值，黑色则将其压制。若在首次编译后才附加贴图槽位，
需设置 `material.needsUpdate = true`。记录对比证据前，等待所有贴图加载完成。

每次 PBR 对比都使用稳定的 HDR 环境：

```ts
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0; // 只标定一次，绝不按材质调整

const pmrem = new THREE.PMREMGenerator(renderer);
const environment = pmrem.fromEquirectangular(hdrTexture).texture;
scene.environment = environment;
pmrem.dispose();
```

玻璃使用 `MeshPhysicalMaterial({ transmission: 1, opacity: 1, metalness: 0, ior: 1.5,
thickness })`。`thickness` 以世界空间单位计，因此不能是通用预设：应根据模型尺度或厚度贴图推导。
背景/环境以及封闭、朝向正确的几何都是材质测试的一部分。

## 材质创建配方

### 皮肤

- 用去光照的图像颜色作为 `map`；绝不把面部阴影烘焙进 albedo。
- 使用独立的毛孔/皱纹法线和低幅度的粗糙度变化。
- 金属度保持为零。clearcoat 只是克制的湿润油脂近似，不是塑料外壳。
- 改变轮廓的面部平面、褶皱和皱纹由几何负责。
- 如果相似度需要真实的次表面传输，就记录 `MeshPhysicalMaterial` 不足以胜任，而不是用偏橙的 albedo 去补偿。

### 头发与毛皮

- 几何发束/面片负责轮廓和发缝；贴图负责发丝尺度的变化。
- 为头发编写方向与 UV/切线走向一致的各向异性贴图。
- 毛皮和天鹅绒用 sheen 表现掠射响应，但当纤维改变可见轮廓时仍需要几何。
- 在移动的掠射光下验证。静态 beauty 视角无法证明方向性响应。

### 织物与皮革

- 织物是电介质：金属度为零、粗糙度高、带编织法线、可选 sheen。
- 缎面/丝绸需要更低的粗糙度和方向性响应；哑光棉布不需要。
- 皮革需要不规则纹理和反映磨损的粗糙度。不要凭棕色判断是皮革。
- 大褶皱、接缝、卷边、针脚和面板厚度属于几何或明确的起伏，而不是 albedo。

### 裸金属

- 干净外露的导体金属度设为一；可见色调通过基础色/贴图驱动。
- 要做有效验证，必须使用 PMREM 过滤的环境。
- 粗糙度控制反射扩散；各向异性加方向贴图模拟拉丝。
- 氧化、污垢、漆面和铜绿是独立的电介质/过渡区域。除非像素在目标尺度下确实无法分辨，否则不要把它们
  平均成一个金属度为小数的表面。

### 涂漆金属

- 完好的漆面是电介质（`metalness` 接近零），尽管其基底是金属。
- 漆面/汽车涂层使用 clearcoat，并配独立的 clearcoat 粗糙度贴图。
- 露出基底的剥落处需要区域或金属度遮罩。仅凭漆色无法显示下方的金属。

### 塑料与橡胶

- 两者都是电介质。通过粗糙度、形变/上下文和微结构来区分，而不是仅凭黑色或有无高光。
- 亮面塑料可以使用克制的 clearcoat；哑光橡胶一般不用。
- 在可见处添加模塑点状/防滑法线和针对磨损的粗糙度。

### 木材、石材与陶瓷

- 木纹在颜色、粗糙度和法线通道之间必须对齐。
- 清漆木材是分层电介质：木纹主体加透明涂层。
- 石材使用多尺度 albedo 和起伏；抛光石材仍是电介质。
- 釉面陶瓷使用涂层反射；剥落处应露出更粗糙的胎体区域。

### 玻璃与宝石

- 基于物理的透明使用 `transmission`，而不是低 opacity。
- opacity 保持为一；根据几何尺度和/或 `thicknessMap` 推导厚度。
- 提供 PMREM 环境和可被折射的背景。
- 磨砂主要是粗糙度加蚀刻微法线，而不是灰色 albedo。
- 不透明的宝石质感漆面是涂层，不是可透射的石英；按光照响应分类。

## 必需的受控渲染

| 视角 | 证明什么 |
| --- | --- |
| `albedo-unlit` | 去光照的颜色、图案和区域分配 |
| `neutral-studio` | 均衡的漫反射/镜面响应 |
| `grazing` | 粗糙度、法线强度、sheen、各向异性和涂层 |
| `environment-reflection` | 导体和抛光层响应 |
| `backlight-transmission` | 透射、体积、吸收和厚度 |
| `reference-beauty` | 在求解出的相机下最终的吻合度 |

部件显微检查必须使用完整场景中的可见覆盖区域。单独渲染适合结构检查，但可能暴露参考图中被遮挡的
表面，从而产生错误的材质评分。

## 常见分类错误

- 黑色织物、皮革、橡胶和塑料仅凭 albedo 分类。
- 黄铜、金和金属黄漆被合并成一个 `gold` 预设。
- 涂漆金属在完好漆面上被赋予 `metalness = 1`。
- 头发做成哑光且均匀，看起来像橡胶或黏土。
- 织物使用平坦法线且没有 sheen，看起来像塑料。
- 透明玻璃用 opacity 实现，因此缺少体积/折射。
- 通过改变环境或曝光来掩盖错误材质，而不是修正材质本身。
- 参考图中的原始高光被烘焙进 albedo，然后又被二次照亮。

如果受控视角之间结论不一致，就在证据中保留这种分歧，并细化分类或请求输入。不要让高的 beauty
相似度评分推翻失败的材质硬门禁。
