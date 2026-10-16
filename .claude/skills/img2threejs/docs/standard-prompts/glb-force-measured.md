# Force-measured——把构建锁定到 GLB 的实测值

适用于参考图旁另有 GLB 的构建。GLB 是一件**测量仪器**：流水线读取它的参数、编码测得的表面，并输出携带
这些数字的 TypeScript。运行时不发布也不 fetch 任何 `.glb` 和 `.bin`，也不复制任何贴图图像——本流水线
输出的是代码，这个约定不会因为恰好有网格可用而变通。

规则与 [`build.md`](build.md) 以及 `main` 上的 GLB 提示词相同。本提示词只多加了一个词：**force**（强制）。

## "force" 是什么意思，"1:1" 指什么

没有它时，构建会测量 GLB，然后*近似*——直径变成"差不多"，粗糙度变成一个看似合理的猜测，比例向模板漂移。
而这些值，GLB 本来都已给出了精确答案。

> **1:1 指的是测得的参数（PARAMETERS），而不是文件。** GLB 真正携带的每个参数都被强制采用其测量值而非
> 推断值，并且每个都附带一项检查，证明它确实落进了输出代码。

强制采用测量值的项：

| | |
|---|---|
| 尺寸与比例 | 整体大小、逐带宽度、质心、部件包围范围 |
| 外观标量 | 基础色、粗糙度、金属度、自发光、alpha mode |
| 结构 | 部件数量与层级、socket 与 pivot 位置 |
| 绑定（若存在） | 骨架、蒙皮关节顺序、逆绑定矩阵、关节权重 |
| 动作（若存在） | 片段名称、时长、关键帧 |

## GLB 无法交出的内容——在评审之前说明，而不是之后

以下都不是缺陷，也都没有商量余地：

- **贴图图像和法线贴图被有意不复制。** 纯代码约定正是本项目的意义所在，而不是障碍。外观以逐顶点颜色
  携带，在每个顶点 UV 处从基础色贴图采样，因此比顶点间距更细的细节不会被携带。若金属度或粗糙度由贴图
  驱动，输出值是测得的中位数，并按中位数记录，而不是当作编写的常量呈现。
- **比节点自身单元尺寸更细的东西都不会保留**，因为没有测量到更细的东西。
- **绑定和动画通常不存在。** `skinCount: 0` 和 `animationCount: 0` 是常见情况；此时没有可强制的内容，
  改用 Stage R 编写。
- 量化，统一说明一次，以免评审时有人重新发现：位置在模型自身包围盒上用 16 位表示（2 m 人物约 0.03 mm，
  比源三角形更精细），法线用 16 位八面体编码（约 1°，且编写的硬边得以保留，因为法线是携带而非重新计算的），
  索引无损，关键帧保持 float32——量化后的四元数在循环片段中会明显漂移。

## 为什么常规质量门禁在这里是错误的工具

`--strict-quality` 的存在是为了阻止**浅薄的 spec** 进入代码生成：未评估的 `objectClass`、空的
`detailInventory`、无人推导的 `colorMaterialRecipe`。它们问的都是*"你是否负责任地推断了这个值？"*

在强制构建中，答案是这个值根本不是推断的——它是测量的。所以门禁是**被替换，而不是被降低**：一致性门禁
把输出代码与测量值对比，这比"判断是否站得住"是更严格的问题。

## 提示词

````text
构建这个主体，并把 GLB 测得的每个参数都 FORCED（强制）为其测量值。

## 输入
- GLB (measurement instrument): <ABSOLUTE_PATH_TO_GLB>
- Reference image (optional):   <PATH_OR_NONE>
- Subject name:  <SubjectName>
- Demo id:       <subject-id>
- Overwrite:     <yes | no>     # yes = 原地替换该 id 的现有 demo

## 约定

GLB 只被测量，绝不发布。把它软链接到某个被 gitignore 的位置；运行中的 demo 不得 fetch 任何
`.glb` 和 `.bin`。贴图图像不复制——外观以逐顶点颜色携带。交付物是 TypeScript。

部件名称是根据测得包围范围得出的假设（HYPOTHESES），必须注明这一点。在已绑定的网格上，骨骼名称是
绑定自带的，不得附加这一说明。

## Step 1——先问字节这是什么文件，再解码

    python3 forge/stage1_intake/probe_glb.py <glb> --out glb-probe.json

`skinCount` 和 `animationCount` 决定路线：
  · skinCount == 0        静态：部件保持分离，允许 LOD 阶梯
  · skinCount >= 1        已绑定：读取蒙皮，绝不在旁边另外编写一套。见 Step 3。
  · skinCount > 1         明确选择其一并说明原因
  · animationCount > 0    片段也要测量，以骨骼索引（BONE INDEX）为键，绝不用骨骼名称

## Step 2——测量，然后强制

从 GLB 中取出上表中的每个参数，把测量值写入 spec。流水线通常会推断的地方，这里一律不得推断：
列出每个被强制的字段及其取得的数值。

顶点保持在文件放置它们的空间中。对已绑定网格，那是 BIND 空间——逆绑定矩阵所表达的空间。归一化是一个
TRANSFORM，绝不是对缓冲区的编辑：缩放放在网格上，使挂在其下的骨骼随蒙皮一起缩放；偏移放在组上。
通过编辑顶点来归一化，会把网格从它自己的骨架下面移开。

逐顶点颜色在每个顶点 UV 处从基础色贴图（TEXTURE）采样，而不是来自 `color` 属性。已绑定的 GLB 通常
带有 UV 和贴图，完全没有顶点色；只读取该属性会让每个顶点都回退到平面基础色，人物就变成白色。
贴图是 sRGB 字节，材质因子是线性的：在线性空间应用因子，再转换回去。

## Step 3——如果已绑定，四条规则，均无商量余地

1. 只有一个细节层级。不要减面。减面会重写顶点列表，而 `skinIndex` / `skinWeight` 是逐顶点的——
   每个权重都会指向一个已不存在的顶点，片段一播放人物就会撕裂。在那之前看起来完美无缺。
2. 一个蒙皮外壳，而不是命名部件。绑定会合并网格；宣称有逐部件 pivot 就是几何无法兑现的约定。
   改为暴露骨架。
3. 骨骼父级优先排列，`parent` 为索引（INDEX），根节点为 `-1`，片段轨道以骨骼索引为键。
   若片段引用了骨架中没有的骨骼，则丢弃（DROPPED）该片段并在报告中列出——绝不绑定到恰好位于该索引的骨骼。
4. 构造 Skeleton 之前先 `updateMatrixWorld(true)`。`calculateInverses()` 读取每根骨骼当前的世界矩阵；
   顺序错误时它捕获的是单位矩阵，静止姿势永远无法抵消，模型会渲染成一具"尸体"，同时却报告 `bound: true`。

## Step 4——一致性门禁。它们替换保真门禁，且更严格，而不是更宽松。

每项以数字报告，而不是结论：

    vertex count        emitted vs measured     EQUAL
    triangle count      emitted vs measured     EQUAL
    bounding box        emitted vs measured     within the quantisation step
    base colour         per part                within the stated tolerance
    roughness/metalness per part                EQUAL to the measured value or median
    Σ skin weights      per vertex              |Σw - 1| < 1e-5
    skinIndex range     every index             < bone count
    bone count          emitted vs measured     EQUAL
    clip count          emitted vs measured     EQUAL, or the difference named clip by clip
    clip duration       per clip                EQUAL
    binding delta       seek each clip to >= 5 times    <= 2^-23

最后一项是唯一能区分"能播放（PLAYS）的片段"与"仅仅存在、能加载、持有 action、报告时长却什么都不驱动的
片段"的检查。

无法求值的一致性门禁报告 `unevaluated`，并指明缺少的输入。绝不算通过。

## Step 5——输出

工厂函数、内嵌表面数据、编解码器和 spec——全部是 TypeScript，运行时不 fetch 任何东西。若
`Overwrite: yes`，替换该 demo id 的文件并保留（KEEP）其 id、相机和注册表条目；不要重新争论已定下的决策。

## 这条路线上不要做的事

  · 不要运行 `--strict-quality`；它问的是推断，而这里没有推断。一致性才是门禁。
  · 不要为 GLB 已测量的几何列举 `detailInventory`。
  · 不要平滑、重拓扑、焊接或减面。这些会改变你正在测量的东西。
  · 不要重命名文件已经命名的东西。
  · 不要因为保真门禁不满意就停下。只在一致性（PARITY）门禁失败时停下。

## 报告

被强制的参数及各自取值 · 输出 vs 测量的顶点/三角形数 · 包围盒差值 · 骨骼数 · 片段及时长 ·
每片段的 maxSampledBindingDelta · LOD 数量 · 再用一行指出 GLB 无法交出的内容（取自上面的列表）。
````
