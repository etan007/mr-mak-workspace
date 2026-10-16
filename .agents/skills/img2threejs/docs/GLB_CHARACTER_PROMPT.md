# GLB 参考角色提示词——构建

GLB 中介角色路线三份提示词中的第一份。它接收一个 GLB 参考，产出能复现其测得表面的程序化 TypeScript，运行时不获取任何 `.glb` 或 `.bin`。

| | |
|---|---|
| **适用场景** | 你有 GLB 参考，且尚未构建任何表面 |
| **不适用场景** | 没有 GLB——请改用 README 中 "Driving it harder" 一节的单图路线；或者构建已经完成、结果只是看起来不对，那应使用 [`GLB_CHARACTER_POLISH_PROMPT.md`](GLB_CHARACTER_POLISH_PROMPT.md) |
| **下一步** | 形状不对时做 [polish](GLB_CHARACTER_POLISH_PROMPT.md)，然后做 [animation](GLB_CHARACTER_ANIMATION_PROMPT.md) |

## 使用前先读

**这是参考资料，不是保证。** 它按通用场景编写，所以无法了解你的主体：不同的 GLB 有不同的节点数、不同的特征尺寸和不同的密度上限，而文中引用的测量数值都来自同一个角色。预期需要调整它，也预期第一次运行不会是最后一次。把其中每个数字都当作*该测量什么*的示例，而不是可照抄的值。

**不要为了更好的结果而重跑它。** 一次完整 pass 会重新 splat 所有节点，代价高昂。如果它已完成而形状不对，polish 提示词会把原因定位到一个节点，而不是重建全部节点。只有在表面从未被构建时才重跑本提示词——输出头部的 `nodes` 数量会告诉你属于哪种情况。

## 前置条件

- 一份 img2threejs checkout，以及一份配套的 `img2threejs-showcase` checkout，用于承载输出的 demo
- `uv sync --project integrations/glb_character_pipeline`——该集成需要 numpy 和 Pillow，而只用标准库的核心刻意不依赖它们
- 优先使用多部件 GLB；合并成单节点的资产仍可运行，但无法支持逐区域的结论

## 提示词

复制此块内的全部内容，填好占位符，作为一条消息粘贴。

````markdown

使用 img2threejs 1.5.1，从一个 GLB 参考构建程序化 Three.js 角色。

## 输入

```
GLB reference:            <ABSOLUTE_PATH_TO_GLB>
Diffuse texture:          <ABSOLUTE_PATH_TO_PNG_OR_NONE>
Reference photo:          <PATH_OR_NONE>
Demo id:                  <subject-id>          # 小写、连字符分隔；会成为 src/demos/<id>/
Showcase root:            <PATH_TO_img2threejs-showcase>
Real longest dimension:   <e.g. 1.70 m>         # 用于检查尺度是否合理；绝不用来缩放
```

## 以下各项强制与 GLB 1:1 一致

参考是一件**测量仪器**，它真正携带的每个参数都要测量，而不是近似。不要目测、取整或"改进"其中任何一项——每一项在文件中都有来源，也都有一项检查证明它已落实：

| 参数 | 在 GLB 中的来源 | 如何验证 |
|---|---|---|
| 尺寸和包围盒 | `probe_glb.py` / `label_glb_nodes.py` 给出的节点世界空间包围盒 | 人物高度和每个节点的范围与参考一致；以米为单位说明残差 |
| 比例 | 每个分带的宽度和质心 | `mesh_reference_compare.py --align landmarks`——每个分带的 `widthDelta`、`depthDelta`、`centroidXDelta`、`centroidZDelta` |
| 几何 | 节点自身的顶点云，以测得的格子尺寸用 Surface Nets 提取轮廓 | `verify_cells.mjs` 报告 0 冲突且每个 quad 都已重建；`verify_roundtrip.mjs` 报告顶点数和三角形数相同、颜色相同、位置在量化步长以内 |
| 基础色 | `baseColorTexture` x `baseColorFactor`，逐顶点采样，sRGB 解码为线性 | 对照参考渲染的逐区域颜色差中位数 |
| Roughness、metalness | `metallicRoughnessTexture` 的绿/蓝通道 x `roughnessFactor` / `metallicFactor`，逐顶点 | 读回每个区域输出的材质记录，与 GLB 声明的数值比较 |
| 区域数量和范围 | `semanticDecomposition` 加测得的包围盒 | `CHARACTER_NODES` 中的每个节点都出现在输出头部的 `nodes` 中 |

尺度是测量出来的，绝不拟合：用于还原网格的格子尺寸必须是以全精度保留的测量值。把测得的 1.504 mm 取整为 1.50 mm 会让还原出的网格偏移，在一个节点上产生了 110,695 个表面上的格子冲突。

### 有三样东西做不到 1:1，说明这一点也是工作的一部分

在承诺匹配之前读这一节，因为三者中有两样通常被以为可用，其实不可用：

1. **资产中通常没有绑定和动画。** 基线 GLB 通常报告 `skinCount: 0`、`animationCount: 0`，且不带 `JOINTS_0` 或 `WEIGHTS_0`。没有任何可以 1:1 匹配的东西——每个关节、权重和姿态都是计算所得，必须报告为计算所得。如果你的 GLB *确实*带有蒙皮或动画，先说明并提问再继续：匹配它们是与本流水线契约不同的交付物。
2. **纹理图像、UV atlas 和法线贴图刻意不复制。** SKILL.md 的契约是参考的 "topology/materials are never copied into the factory"，本技能也不输出纹理。上面那些*数值*会被测量并烘焙进代码；图像文件不会被交付。因此格子尺寸以下的表面细节——皮革纹理、织物纹路——是程序化编写的，必须标注为编写所得（authored），而不是测量所得。
3. **任何比格子更细的东西。** 1.5 mm 的格子承载不了 0.2 mm 的特征。这是分辨率层面的说明，不是调参失败；要么为该节点调低格子，要么说明这一限制。

如果某次构建确实需要基线的 UV atlas，流水线有一个设门禁的逃生口——`CHARACTER_ALLOW_BASELINE_UV=1`，没有它 `bake_atlas_uvs.py` 会拒绝运行。它被记录为对"不使用基线资产"规则的授权偏离。使用它意味着结果不再是纯代码的，所以要在报告中说明，而不是让原来的声明继续成立。

## Step 0——预检。先于一切执行，任何一行失败就停下。

Stage 2 是让结果与 GLB 相像的关键，而在缺少 numpy 时它会**静默跳过**——运行随后以 0 退出，却什么也没产出，Stage 3 则重新编码一个空目录。这是本流水线"成功"后却返回一个与参考毫不相像的人物的最常见方式。所以先证明环境没问题：

```bash
cd <img2threejs checkout>
uv sync --project integrations/glb_character_pipeline
export IMG2THREEJS_GLB_PIPELINE_PYTHON="uv run --project integrations/glb_character_pipeline python3"
$IMG2THREEJS_GLB_PIPELINE_PYTHON -c "import numpy, PIL; print('numpy', numpy.__version__)"
export IMG2THREEJS_SHOWCASE_ROOT=<PATH_TO_img2threejs-showcase>
head -c 4 "<ABSOLUTE_PATH_TO_GLB>" | xxd     # 必须读到 glTF
```

报告打印出的 numpy 版本。如果 import 失败，**停下**——不要抱着"编码磁盘上现有的东西"的打算继续。

## Step 1——编写解码器，因为没有任何地方提供它

该集成输出的 `surfaceData.ts` 包含 `import type { EncodedNode } from './surfaceCodec'`。**对新 demo 来说这个文件不存在，也没有脚本会创建它。** 现在、在任何编码之前就编写 `src/demos/<subject-id>/surfaceCodec.ts`，否则 Step 5 的往返检查就没有可对照验证的东西。不要把 `CHARACTER_CODEC` 指向其他 demo 的副本——那会对照错误的契约做往返，错误会以几何的形式出现，而不是报错。

解码契约，逐节点、按流顺序：

| 字段 | 编码 |
|---|---|
| `cells` | 线性格子索引的 zigzag varint 差值，升序 |
| `offsets` | 格子内的位置，每轴 8 位 |
| `colours` | 每通道 8 位，已在线性工作空间中 |
| `edges` | 每个格子一个字节：位 `2*axis` = 网格边改变符号，位 `2*axis+1` = quad 反向绕序 |
| `exceptions` | varint 计数，然后是边字节无法表达的每个 quad 的四个顶点索引 |

用构建器自己的规则还原网格原点：`lo = cloud_min - 5*cell`。绝不扫描子格子相位：基于搜索得出的原点把 29% 的顶点放进了已被占用的格子。法线不随数据携带——从重建的三角形重新计算。

## Step 2——采集，并按测量给节点贴标签

```bash
python3 forge/state.py init --state .img2threejs/state.json --reference <glb> \
  --profile character --spec object-sculpt-spec.json
python3 forge/stage1_intake/probe_glb.py <glb> --out glb-probe.json
python3 forge/stage1_intake/label_glb_nodes.py <glb> --out nodes.json --min-confidence 0.6
```

基线资产把节点命名为 `root.0..root.N`，所以任何读取名称的标注器都会自信地输出胡话。标签来自测得的世界空间包围盒，在渲染确认之前一直保持 `hypothesis-requires-render-confirmation`。

逐节点记录：顶点数和三角形数、是否存在 `NORMAL`（**必需**——SDF splat 从法线取符号，所以缺失或翻转的法线会翻转表面，而不只是让它变粗糙），以及该 primitive 是否为单材质。

如果 `semanticDecomposition` 报告这是合并成单节点的资产，那么从这个参考无法得出逐区域的结论。说明这一点，然后把整个人物作为一个区域**继续**，标注为 `single-region-merged-asset`——不要停下，也不要编造区域。

## Step 3——逐节点测量 spoke 预算

```bash
$IMG2THREEJS_GLB_PIPELINE_PYTHON \
  integrations/glb_character_pipeline/python/measure_density_convergence.py <glb> <node>
```

从打印的表格中取 **`min(convergence, density ceiling)`**。该工具的最后一行打印 `density ceiling (largest median <= 5%)`；如果显示 `none`，表示该节点不支持任何 spoke 数量——说明这一点，而不是选取下限。

只看收敛是错的，而且会静默失败：`radial_outline` 用相邻角度桶插值填补空桶，所以超过节点密度后，轮廓会跨过没有顶点的弧段并向外鼓出。

| 在真实主体上测得 | |
|---|---|
| 手套上 192 个 spoke | 面积增至基线的 1.12x，而 IoU *下降* 0.896 → 0.867 |
| 同一次运行，一个腰包 | 越过其自身点云 7.96 mm |
| 切片数量 | 相对 320 切片参考的误差呈 U 形：20 时 13.81%，**40 时 8.59%**，160 时 13.83% |

切片数量保持 40。更薄的分带包含的点更少，其百分位数会变成采样噪声。

## Step 4——写一个配置文件，然后运行一条命令

每个子脚本都默认使用 `girl-character` 的路径（`public/mesh/girl-character-baseline.glb`、`src/demos/girl-character/surfaceData.ts`、`public/head`）。不带编排器导出的环境变量手动调用它们，会读到错误的 GLB 并写进另一个 demo。**使用编排器。**

复制 `integrations/glb_character_pipeline/configs/example.env`，填好它，并严格保持如下的档位映射——`x3` 使用更大的格子，所以 `x3` 是*更粗*的一档：

```bash
CHARACTER_GLB="public/mesh/<subject-id>-baseline.glb"     # symlink, gitignored
CHARACTER_DIFFUSE="work/<subject-id>-textures/diffuse.png"
CHARACTER_DEMO_ID="<subject-id>"
CHARACTER_NODES="<every node, coarsest-first>"
CHARACTER_LEVELS="x2 x3 default"
CHARACTER_BIN_DIR="public/head-<subject-id>"
CHARACTER_OUT_PREFIX="public/head-<subject-id>/sdf-surfaces"
CHARACTER_WORKDIR="work/head-<subject-id>"
CHARACTER_WORK_TAG="-<subject-id>"
CHARACTER_CODEC="src/demos/<subject-id>/surfaceCodec.ts"
CHARACTER_CELL_SIZES_JSON="<abs path to cells.json>"
CHARACTER_SECTION_REGIONS_JSON="<abs path>"   # 三项必须全部设置，否则 Stage 1 会静默跳过
CHARACTER_SPOKES_JSON="<abs path>"
CHARACTER_CROSS_SECTIONS="src/demos/<subject-id>/crossSections.ts"
CHARACTER_DEST_X2="src/demos/<subject-id>/surfaceDataMedium.ts"
CHARACTER_DEST_X3="src/demos/<subject-id>/surfaceDataLow.ts"
CHARACTER_DEST_DEFAULT="src/demos/<subject-id>/surfaceData.ts"
```

**一开始把每个节点都放进 `CHARACTER_NODES`。** 与参考的保真度几乎完全来自隐式曲面；cross-section 是 2.5D 的——每个角度桶一个半径——所以无论多少 spoke 都还原不了回折的褶皱，比如眼睑或鼻孔。只有在测量确认某节点的噪声已与基线相当后，才把它降级到 loft。

格子尺寸是**逐节点**的，取决于最细的真实特征：眼睑边缘约 1 mm，所以头部需要约 1.5 mm；大而平滑的表面没有那么细的东西，低于约 2.5 mm 只会让文件翻倍而没有可测的收益。**不要对测得的格子尺寸取整。** Stage 3 用它还原网格原点，所以把测得的 1.504 mm 取整为 1.50 mm 会让网格偏移，在一个节点上产生了 110,695 个表面上的格子冲突。

然后：

```bash
IMG2THREEJS_SHOWCASE_ROOT=<showcase> \
  integrations/glb_character_pipeline/build-character.sh --config <subject-id>.env
```

## Step 5——验证这次运行确实做了它打印的事

退出码 0 不代表各阶段都运行了。Stage 1 和 Stage 2 都会打印一条消息后跳过并返回成功。运行之后，断言以下四项：

```bash
ls -l public/head-<subject-id>/sdf-surfaces*.bin          # 非空，mtime 来自本次运行
grep -c "^" src/demos/<subject-id>/crossSections.ts        # 已重新生成，而不是原样保留
git diff --stat -- src/demos/<subject-id>/                 # 发生变化的档位
grep -A12 "Measured, on the level shipped here" src/demos/<subject-id>/surfaceData.ts
```

编排器在每次编码前运行 `verify_cells.mjs`，编码后运行 `verify_roundtrip.mjs`；两者都必须报告 **0 collisions, every quad rebuilt**。读取输出头部的 `nodes`、`vertices` 和 `bytes per vertex`，确认它们与 Step 3 和 Step 4 的决定一致——那个头部是机器打印的，是本流水线中唯一没人能糊弄的数字。

对每个写出的文件做 `git diff`。档位→目标文件的映射对调后，会写出有效但错误的数据，而且任何地方都不报错：tsc、往返检查和构建全都通过，因为该模块仍是有效的 TypeScript，携带的是一个有效但标错了的档位。

## Step 6——表面特征

头发是在任何渲染**之前**作用于几何的硬门禁：

```bash
python3 forge/stage4_review/scalp_exposure.py --rings <rings.json> --hair-points <points.json>
```

秃斑永远是失败；覆盖率不足是软信号，单凭它绝不能授权把发团加宽。

以薄片形式放置的面部特征（眼睛、睫毛）会被拟合为一个嵌入其眼窝的干净解析形体。不要在眼窝边缘追求零误差——让残差**单边化**（始终凸出，绝不凹陷）。追求零误差花了三次重建；两个常数就解决了。

左/右是**反射**，绝不是旋转：只对侧向轴取反，然后把三角形绕序翻回来，否则 `flatShading` 会把肢体照得像是从背后打光。两种缺陷需要两项检查，`validate_sculpt_spec.py <spec> --json` 两项都运行：`validate_chirality` 捕获被误当作反射的旋转；`medial_lateral_bias` 捕获两侧以*相同*方式出错的一对——任何镜像测试在构造上都会让它通过。

**绑定和动作不属于这个 pass。** 绑定到尚未过门禁表面的骨架会把表面缺陷伪装成美术问题。完成 Step 8，然后使用 [`GLB_CHARACTER_ANIMATION_PROMPT.md`](GLB_CHARACTER_ANIMATION_PROMPT.md)。

## Step 7——门禁。单一视角不构成证据。

```bash
python3 forge/stage4_review/turntable_gate.py \
  --capture 0=front.png --capture 90=right.png --capture 180=rear.png --capture 270=left.png --json
node $IMG2THREEJS_SHOWCASE_ROOT/pipelines/warrior/export_mesh_geometry.mjs --url <preview> --out meshes.json
python3 forge/stage4_review/self_intersection.py meshes.json --json
python3 forge/stage4_review/attachment_anchor.py <spec> --measured measured.json --json
python3 forge/stage4_review/interior_difference.py <baseline.png> <render.png> --json
python3 forge/stage4_review/diagnose_render_multi_angle.py ...
```

在轮廓**内部**测量。silhouette IoU 只读取约 11% 的人物格子：删掉脸的模型得分 0.8803，与完成的脸在小数点后四位上完全相同。

在相信干净的结论之前，先读 `sampledVertexCount`、`unmeasuredAttachments` 和 `missingAzimuths`——每一项都指出门禁没看的那部分模型。在这些门禁出现之前，颅骨上的一个洞、髋部高度的一顶帽子和一个悬浮的挂饰，都撑过了八轮只看正面的审查。

每个门禁回答一个问题，没有哪个门禁能覆盖另一个：

| 门禁 | 它回答的问题 |
|---|---|
| `self_intersection.py` | 网格是否与自身相交 |
| `pairwise_penetration.py <meshes> --allow A,B` | 两个部件是否相互穿插——每一对允许的部件都是它不再检查的一对 |
| `objectness.py --reference R --render X` | 渲染看起来到底是不是这个物体 |
| `check_part_coverage.py --spec S --manifest M` | spec 承诺的每个部件是否真的存在 |
| `vertex_region_gate.py --geometry G --palette P` | 每个区域是否落在声称的位置 |
| `swept_arc_gate.py --geometry G --component C` | 弯曲组件是否真的是那条曲线——silhouette IoU 会让一个直锥体通过 |
| `joint_loops.py <meshes>` | 每个关节处是否有足够的几何，以便日后经得起弯曲 |

即使现在还没有东西在动，也要在*这个* pass 运行 `joint_loops.py`。它失败的原因在表面构建，而不在绑定；等骨架绑定后才发现，就浪费了绑定工作。

## Step 8——证明没有获取任何东西，然后亲眼看

把二进制目录移开，重新构建，重新渲染。在该目录缺席的情况下仍能出现的渲染**就是**证明。

```bash
npx tsc --noEmit && npx vite build
```

**然后真正去看渲染，在 0°、40° 和一个掠射角度下。** 指标会掩盖结构性失败：一个表面可以拿到 2.49 mm 的中位精度，看起来却仍是凹凸不平、满是破洞的外壳，而不是一张脸。渲染与指标不一致时，以渲染为准。

## 常设规则

1. **GLB 是测量仪器，绝不是资产。** 把它软链接到 `public/mesh/`（已 gitignore）。不把任何拓扑、材质或纹理复制进工厂，运行中的 demo 也不获取任何 `.glb`/`.bin`。
2. **验证 magic bytes，绝不看 HTTP 状态。** 对于缺失的文件，开发服务器会以 HTTP 200 返回 `index.html`。检查 `glTF`。
3. **每个数值决定之前都先测量。** 任何你无法指向一条打印出的测量结果的 spoke 数量、格子尺寸、阈值或档位都是猜测——把它标注为猜测。
4. **颜色按 sRGB 解码为线性后烘焙**；Three.js 把顶点颜色属性视为已在工作空间中。保持 `material.color` 为白色，否则会给烘焙结果着色。
5. **开始时、恢复时以及每次修正之前都过状态门禁：**
   `python3 forge/next.py --state .img2threejs/state.json`。退出码 3 / `status=stopped` 是硬停止——报告并提问。
6. **"有改善"时绝不宣称"完成"。** 指出哪些地方仍不匹配。

## 报告格式

每一步：**测得**了什么（数字以及打印它的命令），据此**决定**了什么，还有什么**未验证**。最后给出逐区域置信度以及没有任何视角覆盖的区域；每一个你无法测量的数字，标明为假设；以及哪些地方仍与参考不匹配。

"无法从这个参考达到所要求的保真度"是一个有效结果。直接说出来，而不是产出一个自信却错误的表面。
````

---

如果本次运行完成后结果仍与参考不匹配，**不要**重跑本提示词——它会重建一切却定位不到任何问题。请改用 [`GLB_CHARACTER_POLISH_PROMPT.md`](GLB_CHARACTER_POLISH_PROMPT.md)。
