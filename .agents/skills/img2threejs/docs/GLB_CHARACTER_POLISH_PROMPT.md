# GLB 参考角色提示词——打磨

GLB 中介角色路线三份提示词中的第二份。它唯一的任务是在改动任何东西之前，把一处不匹配**定位**到一个分带和一个具名原因上。

| | |
|---|---|
| **适用场景** | 构建已**完成**，但结果看起来不像 GLB |
| **不适用场景** | 表面从未构建——如果输出头部的 `nodes` 数量小于 `CHARACTER_NODES`，你看到的是 cross-section loft，这里的任何内容都修不好它；重跑 [build](GLB_CHARACTER_PROMPT.md)。也不用于动作，动作请用 [animation](GLB_CHARACTER_ANIMATION_PROMPT.md) |
| **下一步** | 形状静止时稳定后，进入 [animation](GLB_CHARACTER_ANIMATION_PROMPT.md) |

## 使用前先读

**这是参考资料，不是保证。** 下面的失败模式表覆盖本流水线已知会产生的模式。你的主体可能呈现表里没有的模式——提示词会让代理说明这一点并停下，而不是强行匹配最接近的一行；这是正确结果，不是提示词的失败。

**遵守停止规则；这是最容易被滥用的提示词。** 它是一个"改一处、再测量"的循环，带有刻意设计的终止条件。抱着收敛的希望反复运行它，只会产生没人能归因的改动，并且每轮都要耗费一次完整的重新 splat。连续两次改动都没能改善目标测量值，意味着剩下的差距无法靠配置弥合——这本身就是信息，诚实的输出是哪些区域仍有差异、差多少。

## 提示词

复制此块内的全部内容，填好占位符，作为一条消息粘贴。

````markdown

打磨一个以 GLB 为参考、已成功构建但与参考不匹配的 img2threejs 角色。

## 输入

```
GLB reference:   <ABSOLUTE_PATH_TO_GLB>
Demo id:         <subject-id>
Showcase root:   <PATH_TO_img2threejs-showcase>
Config used:     <path to the .env from the init run>
Complaint:       <in your own words — "the face is a lumpy shell", "the arm is on the wrong side">
```

## 打磨 pass 中"1:1"的含义

你缩小的每一处差距，都必须**朝着测得的数值**缩小，绝不朝着个人品味。改动任何东西之前，先写下参考值和当前值：

| 参数 | 参考来源 | 当前值读取自 |
|---|---|---|
| 每个分带的宽度和深度 | 对 GLB 运行 `mesh_reference_compare.py` | 同一次运行的候选列 |
| 分带质心，侧向和深度 | 同上 | 同上——尺寸正确但在错误一侧的肢体 |
| 人物高度和节点范围 | `probe_glb.py` 包围盒 | 已构建模型的包围盒 |
| 每个区域的基础色 | `baseColorTexture` x `baseColorFactor`，sRGB 解码为线性 | 输出的顶点颜色 |
| 每个区域的 roughness、metalness | `metallicRoughnessTexture` x 其系数 | 输出的材质记录 |
| 每个节点的顶点数和三角形数 | 对照二进制文件的往返检查 | 输出的头部 |

让渲染变好但让数值**偏离**参考的改动不是修复；那是品味压过测量，下一次比较就会失败。撤销它并说明原因。

有两类限制不是缺陷，不得追逐：比节点格子尺寸更细的东西属于分辨率层面的说明；纹理图像、UV atlas 和法线贴图按 SKILL.md 的契约刻意不复制，所以格子以下的表面细节是编写出来的，必须标注为编写所得（authored）。

## 整个 pass 的规则

**改一处，再测量。** 绝不同时改两处。如果改了两处、数字变好了，你不知道是哪一处起的作用，下一个代理会继承一个并不成立的事实。

**不要追求零误差。** 残差无法避免时，让它*单边化*并说明。在一个插口边缘追求零误差花了三次重建；两个让误差始终偏凸的常数才解决了真正的问题。

## Step 1——确认你看的就是这次构建

诊断几何之前，先排除那些无聊的原因。init 流水线有两个阶段会打印一条消息后跳过，并且仍以 0 退出。

```bash
python3 forge/next.py --state .img2threejs/state.json
ls -l public/head-<subject-id>/sdf-surfaces*.bin
git diff --stat -- src/demos/<subject-id>/
grep -A12 "Measured, on the level shipped here" src/demos/<subject-id>/surfaceData.ts
```

读取输出头部的 `nodes`、`vertices` 和 `bytes per vertex`。如果 `nodes` 小于 `CHARACTER_NODES`，你抱怨的那个区域的表面**从未被构建**——你看到的人物是 cross-section loft，它在每个水平切片上都是凸的，容纳不了手指间隙、掌心凹陷或袖子内部。就此停下，把该节点加进去重跑 init 流水线；本文中的任何内容都修不好它。

还要检查页面加载的是哪一档。`x3` 的格子比 `x2` 大，所以 `x3` 是*更粗*的一档，属于 `surfaceDataLow.ts`。映射对调后的表现是：质量设置越高，模型看起来*越差*，而只有 `git diff` 能发现它。

## Step 2——逐分带测量哪里出错

这是回答"在哪里"的工具，它接收两个 GLB：

```bash
python3 forge/stage4_review/mesh_reference_compare.py <glb> <candidate.glb> \
  --bands 24 --align landmarks --json
```

**候选 GLB 必须导出，而本仓库没有脚本做这件事。** 写一次即可，约 20 行，参照 `$IMG2THREEJS_SHOWCASE_ROOT/pipelines/warrior/export_mesh_geometry.mjs` 中的模式：用 Playwright 打开预览 URL，`window.__IMG2THREEJS_VIEWER__.scene.getObjectByName('<root-name>')`，`updateMatrixWorld(true)`，然后用 three.js 的 `GLTFExporter`。`mesh_reference_compare.py` 专门组合真实的节点矩阵，就是为了能读取 `GLTFExporter` 写出的 `matrix` 节点。

两个网格都按**脚到身高**归一化，而不是按包围盒顶部——包围盒顶部是最高处凸出的任何东西，而这恰恰是两个主体之间不同的地方。逐分带读取：

| 字段 | 非零值的含义 |
|---|---|
| `widthDelta`、`depthDelta` | 该高度的尺寸错误 |
| `centroidXDelta`、`centroidZDelta` | 尺寸正确，**位置**错误——在错误一侧的肢体能通过任何只看宽度的检查 |
| `lowPct` / `highPct` vs `widthFull` | 身体 vs 道具：百分位数报告身体，原始范围让真实的道具差异仍然可见 |
| `meanBandError` | 给分带排序；只修最差的那个 |
| `note` | 在信任对齐结果之前先读它 |

## Step 3——碰配置之前先说出失败模式的名字

把测得的信号对应到一个原因。以下是本流水线实际会产生的模式：

| 信号 | 原因 | 唯一的那处改动 |
|---|---|---|
| 区域看起来凹凸不平/成团，约 1 mm 以下的特征缺失 | 该节点的格子太粗 | 在 `CHARACTER_CELL_SIZES_JSON` 中**只**调低该节点的格子 |
| 回折的褶皱被填平（眼睑、鼻孔、袖子内部） | 节点仍在 2.5D loft 上 | 把该节点加入 `CHARACTER_NODES`——调 spoke 数量修不好 |
| 节点内外翻转，或炸开 | 该 primitive 上的 `NORMAL` 缺失或翻转 | SDF 场的符号完全来自法线，所以错误的法线会*翻转*表面，而不只是让它变粗糙 |
| `widthDelta` 为正，而 silhouette IoU **下降** | spoke 数量超过该节点的密度上限 | 重跑 `measure_density_convergence.py`，取 `min(convergence, density ceiling)` |
| 过暗或过饱和，形状正确 | 颜色空间 | 顶点颜色按 sRGB 解码为线性后烘焙；`material.color` 必须保持白色，否则会给烘焙结果着色 |
| `centroid*Delta` 非零，`widthDelta` ~0 | 放置问题，不是形状问题 | 修正变换；不要动格子或 spoke |
| 形状正确，手性错误 | 在需要反射的地方用了旋转 | 只对侧向轴取反，然后把三角形绕序翻回来——`validate_chirality` 能捕获这种情况，`medial_lateral_bias` 捕获两侧以*相同*方式出错的一对 |
| 质量越高看起来越差 | 档位映射对调 | 对三个 `surfaceData*.ts` 做 `git diff` |
| 关节一弯就起折痕或失去体积 | 不是权重问题——横跨关节的边环太少 | `joint_loops.py <meshes.json> --min-loops N`；修复点在上游表面构建，权重调节触及不到 |

如果信号与以上都不匹配，说明这一点并停下。没有具名机制的改动，即使让数字变好，也只是猜测。

## Step 4——只改一处，只重建该节点

```bash
IMG2THREEJS_SHOWCASE_ROOT=<showcase> \
  integrations/glb_character_pipeline/build-character.sh --config <subject-id>.env --skip-build
```

在几何迭代期间，`--skip-build` 会在 tsc/vite pass 之前停下。把 `CHARACTER_NODES` 收窄到正在调查的节点，让一次 pass 只花几分钟而不是一小时——最终运行前再恢复完整列表。

## Step 5——对照上一次截取，证明有改善

绝对分数无法区分改善与退化。保留上一次的截取目录：

```bash
node integrations/glb_character_pipeline/node/capture-character.mjs \
  --demo <subject-id> --out work/cmp/<tag-new> --root-name <root>
node integrations/glb_character_pipeline/node/compare_views.mjs \
  work/cmp/<tag-new> work/cmp/<tag-previous>
python3 forge/stage4_review/interior_difference.py <baseline.png> <render.png> --json
python3 forge/stage4_review/diagnose_render_multi_angle.py --reference <ref> \
  --orbit 0.png --orbit 40.png --orbit 90.png --json
```

在轮廓**内部**测量。silhouette IoU 只读取约 11% 的人物格子：删掉脸的模型得分 0.8803——与完成的脸在小数点后四位上完全相同。重跑 Step 2 的分带比较，确认你瞄准的分带有改善，**并且没有其他分带变差**。

然后在 0°、40° 和一个掠射角度下查看渲染。一个表面可以拿到 2.49 mm 的中位精度，看起来却仍是凹凸不平、满是破洞的外壳。渲染与指标不一致时，以渲染为准。

## 停止规则

满足以下任一条件时，停下并报告：

- 最差分带的 `meanBandError` 落在参考自身的分带离散范围内，或者
- **连续两次单处改动**都没能改善目标测量值。

第二种不是失败，而是信息：它意味着剩下的差距无法靠配置弥合，诚实的输出是哪些区域仍有差异、差多少。逐分带报告：测得了什么、你说出了哪种模式、改了什么、重新测量的结果——包括你撤销的改动。

"无法从这个参考达到所要求的保真度"是一个有效结果。
````

---

形状静止时稳定之后，动作是一个独立的 pass，有它自己的失败模式——绑定到未过门禁表面的绑定会把表面缺陷伪装成美术问题。请使用
[`GLB_CHARACTER_ANIMATION_PROMPT.md`](GLB_CHARACTER_ANIMATION_PROMPT.md)。
