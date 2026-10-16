# 用于皮肤与布料的 Three.js——引擎实际做了什么

提炼自 **showcase 锁定的确切版本 `three@0.169.0` 的源码**，而非文档站点。下文每个数字都是指向
`node_modules/three/src` 的 `file:line` 引用，因为文档页面省略了钳制（clamp）、折叠（folding）和能量
项——而恰恰是这些决定了一个人工设定的数值能否最终作用到像素上。

为皮肤或布料选择材质之前先读本文。它的目的是阻止代价最高的两种失败模式：**设定一个引擎会忽略的值**，
以及**把同一个自由度当作两个自由度暴露两次**。

---

## 1. 光泽（sheen）——布料的载体

### 机制

| 事实 | 来源 |
|---|---|
| BRDF 采用 Estevez & Kulla 2017 "Production Friendly Microfacet Sheen"，`D_Charlie` 分布 | `shaders/ShaderChunk/lights_physical_pars_fragment.glsl.js:320,337,345` |
| 光泽项为 `sheenColor * (D * V)`——与颜色相**乘** | `…lights_physical_pars_fragment.glsl.js:348` |
| `sheenColor` 默认值为 **`0x000000`** | `materials/MeshPhysicalMaterial.js:52` |
| `sheenRoughness` 默认值为 **`1.0`** | `materials/MeshPhysicalMaterial.js:54` |
| **仅当 `sheen > 0` 时**才上传该 uniform | `renderers/webgl/WebGLMaterials.js:406` |
| `sheen` 被折叠进颜色：`uniforms.sheenColor = sheenColor × sheen` | `renderers/webgl/WebGLMaterials.js:408` |
| `sheen` 跨越零值时会递增 `material.version` → 着色器重新编译 | `materials/MeshPhysicalMaterial.js` 中 `_sheen` 的 getter/setter |

### 三个必须编码进规则、而不是靠记忆的推论

**S-1. 单独设置 `sheen` 毫无作用。** `sheenColor` 默认为黑色，且该项是乘法，因此在不改动 `sheenColor`
的情况下设置 `sheen: 0.65`，贡献恰好为 `0`。一个指定了 `sheen` 却省略 `sheenColor` 的织物 profile，
等于什么都没指定。

> 本仓库现状：`generate_threejs_factory.py` 已将 `sheenColor` 默认设为 `#ffffff`
> （grep `sheenColor:`——这是该文件中唯一的出现位置，位于生成的
> `MeshPhysicalMaterial` 构造函数中），
> 而不是 three 的黑色，因此生成的代码避开了这个陷阱。但**没有任何 registry profile 声明
> `sheenColor`**——`fabric.woven-matte` 和 `hair.human.code-only` 都只给出 `sheen` 而没有它。因此色调
> 来自生成器的回退值，从不源自参考图。修复方式是把 `sheenColor` 加到 profile 中，而不是修改回退值。

**S-2. `sheen` 与 `sheenColor` 是一个自由度，而不是两个。** 它们在上传前相乘，因此
`sheen: 1.0, sheenColor: #808080` 与 `sheen: 0.5, sheenColor: #ffffff` 逐位完全相同。如果一份规格
（spec）把两者都当作独立证据从参考图中提取，就等于把同一个数提取了两次，会产生看似相互矛盾、渲染却
完全相同的先验。**只提取一个：光泽色调。把 `sheen` 保留为带固定人工默认值的标量强度。**

**S-3. 开启光泽会让布料变暗，且变暗程度可以计算。**

```glsl
float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
```
`ShaderLib/meshphysical.glsl.js:205,207`

在全白光泽下，漫反射底色会先乘以 `0.843`——**变暗 15.7%**——然后再叠加光泽波瓣。因此，一件底色已与
参考图匹配、*随后*又加上光泽的服装，在每个非掠射角度下渲染出来都会比参考图更暗。修正是可预测的：

```
effective_sheen_strength = sheen × max(sheenColor.r, .g, .b)
base_darkening           = 0.157 × effective_sheen_strength
compensated_base_colour  = target_colour / (1 - base_darkening)
```

这是一个**可以设门禁的数值**，而不是品味问题：给定人工设定的光泽，预期的变暗程度事先已知，因此一个比
参考图暗约 `0.157 × strength` 的布料区域，可以诊断为"施加了光泽却未做底色补偿"，而不是笼统的颜色偏差。

### 选择 sheenRoughness

`sheenRoughness` 是 Charlie 分布的宽度，因此它对应掠射边缘光的收紧程度：

| 织物 | `sheenRoughness` | 观感 |
|---|---|---|
| 棉、亚麻、羊毛、毛毡 | `0.7 – 1.0` | 宽而柔和，几乎看不到边缘光 |
| 拉绒 / 哑光合成纤维 | `0.5 – 0.7` | 一条宽带 |
| 缎面、丝绸 | `0.15 – 0.35` | 一圈窄而亮的边缘光——缎面的标志 |

在低多边形服装上使用低 `sheenRoughness`，会把边缘光集中到少数几个面上，看起来像塑料。除非参考图明确
显示缎面边缘光，否则优先取高端值。

---

## 2. 清漆层（clearcoat）——皮肤的载体

### 机制

| 事实 | 来源 |
|---|---|
| `clearcoatF0` **固定为 `0.04`**，不可人工设定 | `ShaderChunk/lights_physical_fragment.glsl.js:56` |
| `clearcoatRoughness` 被**向上钳制**：`max(clearcoatRoughness, 0.0525)` | `…lights_physical_fragment.glsl.js:72` |
| 几何粗糙度会被**叠加**：`clearcoatRoughness += geometryRoughness` | `…lights_physical_fragment.glsl.js:73` |
| 同样的叠加也作用于基础粗糙度：`material.roughness += geometryRoughness` | `…lights_physical_fragment.glsl.js:9` |
| `geometryRoughness = max(max(dxy.x, dxy.y), dxy.z)`，来自法线导数 | `…lights_physical_fragment.glsl.js:6` |
| `clearcoat` 跨越零值时会递增 `material.version` | `MeshPhysicalMaterial.js` 的 `_clearcoat` setter |
| `clearcoatRoughness` 默认 `0.0`，`clearcoatNormalScale` 默认 `(1,1)` | `MeshPhysicalMaterial.js:27,29` |

### 两个推论

**C-1. 低于 `0.0525` 的 `clearcoatRoughness` 是假象。** 设定 `0.0` 与设定 `0.05` 渲染结果完全相同。
校验器不得把低于钳制值的数值当作有意义的值接受，证据提取也不得报告这样的值。

**C-2. 面片化会自动让皮肤变粗糙，这就是低多边形耦合。** `geometryRoughness` 来自屏幕空间法线导数，因此
**平直着色会在每条面片边缘抬高它**。在光滑几何上调好的清漆层，用到同一个平直着色的角色上会显得更模糊，
而材质本身毫无变化。对本流水线（刻意采用低多边形面片化风格）的影响：

- 皮肤清漆层应在**最终细分结果**上设定，绝不在光滑代理体上设定。
- 两个使用相同皮肤材质但面片密度不同的部件不会一致。这是引擎特性，不是 bug，也是皮肤不能以绝对高光
  响应设门禁的原因。
- 这也是另一条常设规则成立的理由：**绝不根据光照未知的参考图对粗糙度设门禁——只报告。** 在这里，连
  *几何*都会改变这个数值。

### 为什么皮肤用清漆层而不用透射

在这个保真度下，皮肤真正的特征是**温暖漫反射底色之上一层宽而柔和的电介质高光**——这正是一层低强度、
中等粗糙度的清漆层叠在温暖底色上。`clearcoat 0.1–0.3` 配合 `clearcoatRoughness 0.3–0.5`，只用两个
数值、无需任何贴图就能得到它。

---

## 3. 透射与厚度——皮肤不采用，及其原因

`transmission` 是一种**屏幕空间折射**近似：它需要 `transparent: true`、一个透射渲染目标，并对后缓冲
进行采样。它是玻璃模型，不是次表面模型。

| 事实 | 来源 |
|---|---|
| `thickness` 默认 `0`，`attenuationDistance` 默认 `Infinity` | `MeshPhysicalMaterial.js:59,61` |
| `attenuationColor` 默认白色 | `MeshPhysicalMaterial.js:62` |
| 当 `transmission > 0` 时，生成器已强制设置 `transparent` | `generate_threejs_factory.py`，`MeshPhysicalMaterial` 构造函数中生成的 `transparent:` |

在封闭不透明的身体网格上，透射产生的是玻璃质感的人形，而不是有肉感的皮肤——而且要额外付出一整个渲染
目标的开销。registry 已经陈述了这个如实的限制：*"MeshPhysicalMaterial has no true multilayer skin
subsurface scattering"*（`docs/materials/material-reference.json`，`skin.human`）。

**规则：皮肤绝不设置 `transmission`。** 用玻璃模型近似 SSS 并把结果当作重建呈现，属于臆造。薄膜透光——
耳垂、鼻翼边缘、带蹼的手指——是唯一正当的用途，且必须是*独立*薄部件上的*独立*材质，并声明为近似。

---

## 4. 暗中相同的自由度

把其中任一对暴露两次，会产生看起来比实际更丰富的规格，以及相互矛盾、渲染却完全相同的先验。

| 参数对 | 关系 | 来源 |
|---|---|---|
| `sheen` × `sheenColor` | 上传前相乘为同一个 uniform | `WebGLMaterials.js:408` |
| `ior` ↔ `reflectivity` | `reflectivity = clamp(2.5(ior−1)/(ior+1), 0, 1)`；写入 `reflectivity` 即写入 `ior = (1+0.4r)/(1−0.4r)` | `MeshPhysicalMaterial.js:34–44` |

**设定 `ior`，绝不设定 `reflectivity`。** `ior` 是物理量，具有有意义的取值范围（皮肤 ≈ 1.33–1.5，
大多数织物 ≈ 1.45–1.55），而 `reflectivity` 只是它的派生视图。

---

## 5. 专门坑布料的基础材质事实

| 事实 | 默认值 | 为何对服装重要 | 来源 |
|---|---|---|---|
| `side` | `FrontSide` | 在下摆、袖口或领口处开口的服装外壳，透过开口**什么也看不到**——背面被剔除，所以袖子内侧是个洞。任何有开放边界的服装都需要 `DoubleSide`，并设置 `shadowSide` 以便仍能投射阴影。 | `Material.js:24` |
| `vertexColors` | `false` | 必须显式启用。材质按 id 共享，所以**启用前先克隆**，否则共享该材质的每个部件都会被染色——生成器对 `rootTipGradient` 已经这样做。 | `Material.js:25` |
| `flatShading` | `false` | 低多边形风格依赖它，而它会抬高 `geometryRoughness`（§2 C-2）。 | `Material.js:382`（toJSON） |
| `roughness` / `metalness` | `1.0` / `0.0` | 保持默认粗糙度 `1.0` 的织物已大致正确；皮肤则不然。 | `MeshStandardMaterial.js:20,21` |
| `polygonOffset` | `false` | 与皮肤之间留有小间隙偏移的布料，在偏移趋近于零处仍可能 z-fighting。优先用真实的几何间隙（`standProud`），而不是深度技巧。 | `Material.js` |

---

## 6. 几何：服装各部位用哪种部件

本节要防止的陷阱是：仅因为某个现成便捷几何体的名字与名词对得上，就伸手去用它。

| 需求 | 使用 | **不要**使用，及原因 |
|---|---|---|
| 袖子、裤腿，任何沿弯曲脊线渐细的部分 | **`tapered-sweep`**（本仓库的基元；平行传输标架） | `TubeGeometry`——半径恒定，看起来像面条。带路径的 `ExtrudeGeometry`——Frenet 标架在拐点处翻转 180°。 |
| 必须贴合躯干自身截面的服装主体 | **由被覆盖部件的环形堆栈派生的偏移曲面**，然后 `standProud` | `LatheGeometry`——旋转体在缩放前是圆形，无法表达躯干的前后不对称。在 lathe 上设定 `rx ≠ rz` 描述的是该几何体并不具备的曲面（本仓库已对这种情况设门禁）。 |
| 下摆、腰带、领口边缘——清晰的边界 | **与一块平板做普通求交**（用 `max`，不用 `smin`） | 平滑并集 / `smin`——会把边缘卷圆，而卷圆的下摆一看就不是下摆。 |
| 平面饰边、补丁、徽章 | 由 `Shape` 生成的 `ShapeGeometry` / `ExtrudeGeometry` | `PlaneGeometry` + alpha——需要本流水线无法生成的纹理。 |
| 重复的紧固件：纽扣、铆钉、扣眼 | `InstancedMesh`（本仓库的 `instanced-cluster`） | 独立网格——徒增开销而无保真度收益。 |
| 布料褶皱与皱纹 | 中尺度的**几何**，或者干脆不做 | `normalMap`——没有纹理。`displacementMap`——同理。registry 自己的 `fabric.woven-matte` 说明已写明 *"Large folds and hems belong in geometry"*。 |

**`side: DoubleSide` 既是材质决策，也是几何决策：** 如果服装被设定为封闭的偏移体而非开放外壳，
`FrontSide` 就是正确且更省的选择。尽可能选择封闭体，把 `DoubleSide` 留给真正开放的边界。

---

## 7. 任何 Three.js 特性都无法给本流水线提供的东西

明确写出，以免有人围绕它们做规划：

- **没有真正的皮肤次表面散射。** `MeshPhysicalMaterial` 没有多层 SSS。`transmission` 是玻璃模型（§3）。
- **没有布料模拟。** Three.js 没有布料解算器，而单张参考图既不包含运动，也不包含可用来拟合解算器的材质
  参数。
- **没有纹理就没有逐纤维或逐线的细节。** 对纯代码流水线而言，光泽就是可用的全部织物纹理线索。
- **没有 alpha 裁切的轮廓细节。** 这正是 `plane-card` 对头发和布料饰边都不采用的原因。

---

## 8. 人工设定值检查清单

在一个皮肤或布料数值进入规格之前：

- [ ] 引擎到底会不会读取它，还是它受制于另一个值 `> 0` 才生效？（`sheen`、`clearcoat`、`transmission`、
      `iridescence`、`anisotropy` 都各自控制自己的 uniform 块。）
- [ ] 它是否被钳制？（`clearcoatRoughness` ≥ `0.0525`。）
- [ ] 着色时是否有东西叠加到它上面？（`geometryRoughness` → `roughness`、`clearcoatRoughness`。）
- [ ] 它是否在上传前与另一个值相乘，使这对参数成为一个自由度？（`sheen` × `sheenColor`。）
- [ ] 它是否是另一个属性的派生视图？（`reflectivity` 之于 `ior`。）
- [ ] 它是否需要本流水线无法生成的贴图？如果是，这个值只是装饰。
- [ ] 开启它是否会改变底层？（`sheenEnergyComp` 会变暗 `0.157 × strength`。）
