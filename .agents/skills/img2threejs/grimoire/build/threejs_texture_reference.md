# Three.js 纹理与 PBR 参考（notebooklm 调研，2026-07-22）

以文档为依据（threejs.org MeshPhysicalMaterial / MeshStandardMaterial / Texture / CanvasTexture /
DataTexture / 手册 §Textures）。驱动 `analyze_texture.py`（表面处理分类 + 配方），以及
`generate_threejs_factory.py` 中生成的 `makeProceduralTextureSet` / 材质预设。

## 色彩空间——这里错了，一切都会看起来不对
- **反照率 / `map` / `emissiveMap` / `sheenColorMap` → `THREE.SRGBColorSpace`。**
- **数据贴图（`roughnessMap`、`metalnessMap`、`normalMap`、`aoMap`、`bumpMap`、`displacementMap`、
  `thicknessMap`、`anisotropyMap`）→ `THREE.NoColorSpace`**（线性数据，绝不是 sRGB）。
- `CanvasTexture`：`flipY = true`（默认），构造时自动 `needsUpdate`。
- `DataTexture`：`flipY = false`（默认）——内存中的 (0,0) 位于左下角。需设置 `needsUpdate = true`。
- 对已经使用过的纹理修改 `wrapS/wrapT` 后，**必须**设置 `needsUpdate = true`。
- `aoMap`/`lightMap` 读取 UV 通道 1——几何体需要第二套 UV，或设置 `texture.channel = 1`。
- 平铺：`wrapS = wrapT = THREE.RepeatWrapping` + `repeat.set(u,v)`；设置 `anisotropy =
  renderer.capabilities.getMaxAnisotropy()`，使倾斜角度下仍保持清晰。

## 按表面处理划分的材质配方（MeshPhysicalMaterial 标量）
| finishClass | metalness | roughness | clearcoat | ccRoughness | transmission | ior | envMapIntensity | anisotropy | 需制作的贴图 |
|---|---|---|---|---|---|---|---|---|---|
| `gemstone`（半透明石英/玻璃） | 0.0 | 0.05 | 1.0 | 0.0 | 1.0 | 1.54 | 1.0 | 0.0 | map(gradient), thicknessMap |
| `gem-metal`（镀铬多普勒刀刃——我们的混合方案） | 0.75 | 0.14 | 0.6 | 0.06 | 0.0 | 1.5 | 1.3 | 0.0 | map(gradient+smoke), roughnessMap |
| `painted-metal`（光面漆） | 0.0 | 0.5 | 1.0 | 0.05 | 0.0 | 1.5 | 1.0 | 0.0 | map, roughnessMap, clearcoatRoughnessMap |
| `worn-composite`（老化橡胶/握把） | 0.0 | 0.9 | 0.0 | 0.0 | 0.0 | 1.5 | 0.5 | 0.0 | map(mottled), roughnessMap, bumpMap |
| `brushed-steel` | 1.0 | 0.35 | 0.0 | 0.0 | 0.0 | 1.5 | 1.0 | 1.0 | anisotropyMap, roughnessMap, normalMap |

> 注意：纯 `gemstone`（transmission 1.0）是可透视的玻璃。喷漆/阳极氧化的金属刀刃
> （CS Doppler）是不透明的——使用 `gem-metal`（金属度 + 渐变贴图 + 清漆层，无透射）。

## 程序化贴图生成（代码中）
- **CanvasTexture**——绘制到 `HTMLCanvasElement`：沿调色板色标做线性/径向渐变
  （gemstone/doppler），用分层的低 alpha 斑块表现烟雾，用逐像素斑驳噪声表现磨损表面，用细的水平
  条纹表现拉丝金属。先 `new THREE.CanvasTexture(canvas)`，再设置 `colorSpace`。
- **DataTexture**——把计算出的噪声/高度写入 `Uint8Array`，`new THREE.DataTexture(arr,w,h,
  THREE.RGBAFormat, THREE.UnsignedByteType)`，`colorSpace = NoColorSpace`，`needsUpdate = true`。
- **高度 → 法线（没有内置辅助函数——需自行计算）：** 对高度场做 Sobel/邻域差分 →
  `R = (dx*strength + 1)*0.5*255`，`G = (dy*strength + 1)*0.5*255`，`B = 255`（向上 +Z），A = 255。
- **独立通道**（技能规则，已确认）：绝不要把一张贴图复用为另一张——反照率、粗糙度、法线/高度、
  AO 是彼此独立的信号，具有各自独立的频率成分。

## 分析 → 归为哪个 finishClass？
`analyze_texture.py` 通过纯标准库统计量对参考裁切图进行分类：
- 饱和度 + 色相分布 → 有彩色的 gemstone 还是中性的金属/灰色。
- 裁切图上的亮度梯度 → `gradient` 表面处理（doppler）还是平涂。
- 局部方差 / 斑驳 → `worn-composite`。
- 有方向性（水平）的高频条纹 → `brushed-steel`。
- 高光像素占比（非常亮的像素）→ 金属度的代理指标。
输出：`{finishClass, palette:[stops], mottle, gradientAxis, metalnessHint}` → 材质配方。
