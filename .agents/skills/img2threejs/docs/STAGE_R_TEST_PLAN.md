# Stage R 测试计划——动画流水线是否仍会破坏网格？

> **检查清单权威说明（extract-animated-character，2026-09-03）：** `animated-character`
> profile 由已安装的 **plugin-character**（`img2 add img2threejs/plugin-character`）提供；
> 其 `domain.json` 掌管绑定步骤顺序，并调用插件的 `tools/` 移植版本。下文的
> `forge/stage5_rig/...` 命令仍可作为输出器所用的基础库运行，但检查清单运行的是插件中的副本——二者不一致时，以插件为准。

一份针对 img2threejs 1.5.2 的操作手册，目的是**证伪**修复，而不是确认它。

**所测内容的现状：** Stage R 模块有单元测试（1343 个测试，`OK (skipped=30)`），其中几个在真实数据上跑过——`glb_rig_reference.py` 跑过真实 GLB，`mesh_parity` 经过一次真实浏览器往返。但**这条流水线从未在真实角色上端到端运行过，也从未渲染过任何东西。** 这项工作背后的三种网格损坏机制，都是通过读代码推断出来的，而不是通过重现失败得到的。

这就是 Phase 0 存在的原因，也是它不可选的原因。

---

## 唯一的规则

> **Phase 0 是让其他所有 phase 具有意义的那个 phase。**

还没有人亲眼见过损坏的网格，也没有人见过它被修好。如果你直接跳到 Phase 3 而一切通过，这个结果是无法证伪的——全绿的运行只证明门禁彼此一致，而不证明你的网格不再撕裂。先把损坏记录下来。

---

## 如何解读结果

| 状态 | 含义 |
|---|---|
| `pass` | 检查在真实数据上运行了，数值在容差内。 |
| `fail` | 检查运行了，数值超出容差。是真实缺陷，或输入确实发生了变化。 |
| `unevaluated` | **没有任何东西测量它。这不是通过。** 按设计，它会让整份报告变为非 ok。 |

---

## 开始之前——有四个门禁没有生产者

`rig_gates.py` **在今天的任何运行上都会报告非 ok。** 这是系统在说实话，不是测试失败。依据其余八个门禁加上 mesh-parity 结论来评判这次运行。

| 门禁 | 捕获什么 | 输入的生产者 |
|---|---|---|
| `G1` | 静默播放的动画片段 | **暂无**——需要通过 CLI 暴露 `runGateR1()` |
| `G2` | 错误索引、NaN 权重 | 宿主 harness |
| `G3` | 动画片段之间的姿态渗漏 | **暂无** |
| `G4` `G5` | 权重和、索引范围 | `export_mesh_buffers.mjs` |
| `G6` | 停留在绑定姿态的部件 | **暂无** |
| `G7` | 镜像的绑定 | 在 Python 中计算 |
| `G8` `G9` | 滑步步态、关节缩放 | `glb_rig_reference.py --sample-clips` |
| `G10` | 运动中的撕裂 | **暂无**——需要 176 帧扫描 |
| `G11` | **改写几何的绑定** | `export_mesh_buffers.mjs` |
| `G12` | 寻址到另一个骨架的动画片段 | `glb_rig_reference.py` |

设置 `I=~/Documents/personal/img2threejs`，所有命令都在该目录下运行。**保留每一个 JSON 和每一段录像**——产物才是结果，终端输出不是。

---

## Phase 0——重现损坏

**约 30 分钟。人人都会跳过的 phase。不要跳过。**

**目标：** 一份保存下来、带日期的网格实际损坏的记录。没有它，"已修复"就无法被测试，只能被声称。

### 0.1——指明损坏的主体

选出你看到撕裂的那个 demo。写下是哪一个，以及你看到了什么。

> **两种相反的症状，两种不同的成因。** "什么都不动"是绑定失败（`G1`：动画片段存在、持有 action、报告时长，却什么都不驱动）。"部件四散飞开"是几何被改写（`G11`）。如果你两者都看到了，就说明——1.5.1 构建有两个独立的 bug，每一个都产生了看似合理的场景。

### 0.2——录下视频，三个角度

播放导致损坏的动画片段。录制正面、40° 和一个掠射角度。

指标会掩盖结构性失败：一个表面可以拿到 2.49 mm 的中位精度，看起来却仍是凹凸不平、满是破洞的外壳。**渲染与指标不一致时，以渲染为准。**

### 0.3——把损坏的几何冻结为证据

```bash
node $I/runtime/scripts/export_mesh_buffers.mjs \
  --url <preview-url> --out baseline-broken.json

python3 $I/forge/stage5_rig/mesh_parity.py freeze baseline-broken.json \
  --out baseline-manifest.json
```

**保留：** `baseline-broken.json`、`baseline-manifest.json` 和三段录像。这就是其他一切据以测量的"之前"。

---

## Phase 1——单独冒烟测试各模块

**约 10 分钟。不需要浏览器。在接线错误耗掉你一小时之前把它们揪出来。**

**目标：** 证明每个模块能在*你的环境*中以真实输入运行。这些在开发期间都跑过；重跑一遍可以证明你的 checkout 一致。

### 1.1——测试套件

```bash
cd $I && python3 -m unittest discover -s forge/tests -p 'test_*.py'
```

- **预期：** `Ran 1343 tests` · `OK (skipped=30)`
- **否则：** 停下。checkout 中有东西与经过验证的版本不同。继续之前先报告失败项的名称。

### 1.2——诚实规则，用空载荷验证

```bash
echo '{"figureHeight":1.0}' > empty.json
python3 $I/forge/stage5_rig/rig_gates.py empty.json; echo "exit=$?"
```

- **预期：** 12 个门禁，每一个都是 `unevaluated`，`ok: false`，`exit=1`。
- 任何门禁都不得显示 `pass`——什么都没测量。

### 1.3——从真实 GLB 中读出真实绑定

```bash
python3 $I/forge/stage5_rig/glb_rig_reference.py \
  ~/Documents/personal/img2threejs-showcase/public/mesh/tripo.glb \
  --out glb-rig.json
```

- **预期：** `skinCount: 1`、`clipCount: 11`、42 个关节，且 `joints[0]` 指向 `nodeIndex 40`——**不是** 0。这个差距正是重点所在：顺序以蒙皮为准，绝不以遍历为准。
- **检查 `deformVsTechnical.channelsTargetingTechnicalNodes`。** 在这个资产上它是 0。如果在*你的*资产上它非零，说明动画片段驱动的是并非关节的节点——绑定任何东西之前先读它，因为把那些节点建成骨骼会破坏骨架的索引空间。

### 1.4——mesh-parity 门禁，三种结果

这是回应最初抱怨的门禁。证明它能说"是"，**也**证明它能说"否"——只会通过的门禁毫无价值。

```bash
# a：未改变 → pass
python3 $I/forge/stage5_rig/mesh_parity.py verify m.json before.json; echo "exit=$?"

# b：绑定新增了 skinIndex/skinWeight → 也必须 pass
python3 $I/forge/stage5_rig/mesh_parity.py verify m.json after-rig.json; echo "exit=$?"

# c：手动挪动一个顶点 → 必须 fail，并指出位置
python3 $I/forge/stage5_rig/mesh_parity.py verify m.json damaged.json; echo "exit=$?"
```

- **预期：** a → `exit=0` · b → `exit=0`，蒙皮属性被列为 *added (legal)* · c → `exit=1`，指出网格、属性和第一个不同的元素。
- **如果 b 失败：** 那是设计 bug，不是数据问题。这个门禁会让每一次成功的绑定都失败，一天之内就会被关掉。立即报告。

---

## Phase 2——工作流真的会推进到 Stage R 吗？

**约 5 分钟。正是这处接线曾经坏掉过，却以绿色状态发布了。**

**目标：** 确认 `next.py` 会要求执行绑定步骤。这项工作的第一版在检查清单上放了九个步骤，却没有任何分派器返回过它们——构建报告 `complete`，而九个步骤仍都是 `pending`；测试之所以通过，是因为它们断言的是*列表*而不是*行为*。

### 2.1——用 animated profile 初始化

```bash
python3 $I/forge/state.py init --state .img2threejs/state.json \
  --reference <your>.glb --profile animated-character \
  --spec object-sculpt-spec.json
```

- **预期：** 32 个检查清单步骤，其中 9 个 scope 为 `rig`。
- 用 `--profile character` 会得到 0 个绑定步骤，门禁永远不会运行。这就是 profile 带来的差别，而选错 profile 正是动画过去以损坏状态发布的原因。

### 2.2——逐步推进

```bash
python3 $I/forge/next.py --state .img2threejs/state.json
```

- **预期：** 九个绑定步骤出现在 `pending` 中。静态构建完成后，`currentStep` 变为 `rig-contract-read`，状态保持 `active`。
- **危险信号：** 如果在任何绑定步骤仍为 `pending` 时状态变成 `complete`，说明分派回归又出现了。这是本 phase 要找的最重要的一件事。

---

## Phase 3——让真实角色走完全程

**耗时最长的一个。顺序至关重要。**

**目标：** 让 Phase 0 的主体走完整个流程。每一步都跟随 `next.py`；硬停止（退出码 3）说明系统在正常工作——回答它，而不是强行越过。

以 `docs/GLB_ANIMATED_CHARACTER_PROMPT.md` 作为驱动。下面的顺序不能调换：**冻结前修复，绑定前冻结，绑定后验证。**

### 3.1——修复，然后冻结

**现在**就修好网格中损坏的部分，并写下你修了什么。然后冻结。冻结一个已损坏的网格等于为损坏背书，而不是捕获它。

```bash
node $I/runtime/scripts/export_mesh_buffers.mjs \
  --url <preview> --out meshes.json

python3 $I/forge/stage5_rig/mesh_parity.py freeze meshes.json \
  --out mesh-manifest.json
```

> 用 `export_mesh_buffers.mjs`，**不要**用 `export_mesh_geometry.mjs`。后者把每个顶点乘以 `matrixWorld`——对自相交检测是对的，在这里则两个方向都错：摆姿态会改变 `matrixWorld` 而不触碰 buffer（假阳性），被补偿变换抵消掉的真实 buffer 修改会读作未改变（假阴性）。

### 3.2——绑定，只做加法

绑定可以新增 `skeleton`、`skinIndex` 和 `skinWeight`。从这里开始，位置、法线、uv 和索引都是证据。三条规则，每一条都曾导致过真实的失败：

- `mesh.bind(skeleton, new THREE.Matrix4())`——始终使用单位矩阵，采用 attached 绑定模式。attached 模式每帧从 `matrixWorld` 重新计算 `bindMatrixInverse`，所以 `matrixWorld` 会被完全抵消。用 armature 的矩阵绑定时渲染出一帧空白。
- 显示偏移**只**来自网格包围盒：`(−centre.x, −min.y, −centre.z)`。加上 armature 的平移会把它重复计算——人物恰好偏移这段平移。
- 在 `new THREE.Skeleton(...)` **之前**调用 `updateMatrixWorld(true)`。`calculateInverses()` 读取每根骨骼当前的世界矩阵；若先构造骨架，它捕获到的是单位矩阵，静止姿态永远不会被抵消，每个顶点都被其骨骼的偏移量推开。这种失败能编译、能绑定、报告 `bound: true`，渲染出来却是一具尸体。

### 3.3——对最初抱怨的裁决

```bash
node $I/runtime/scripts/export_mesh_buffers.mjs \
  --url <preview> --out meshes-after.json

python3 $I/forge/stage5_rig/mesh_parity.py verify \
  mesh-manifest.json meshes-after.json; echo "exit=$?"
```

- **Pass：** 绑定没有触碰任何几何。蒙皮属性显示为 *added (legal)*。
- **Fail：绑定有错。** **绝不能为了让它通过而重新冻结**——那等于为损坏背书，而不是捕获它。失败块会指出网格、属性和顶点；原样保留它。

### 3.4——测量动画片段，然后运行门禁

```bash
python3 $I/forge/stage5_rig/glb_rig_reference.py <glb> \
  --sample-clips --landmarks landmarks.json --out sampled-clips.json

python3 $I/forge/stage5_rig/clip_features.py sampled-clips.json

python3 $I/forge/stage5_rig/rig_gates.py rig-gate-payload.json
```

- **预期：** 非 ok，`G1 G3 G6 G10` 为 unevaluated。依据其余八个评判这次运行。**如果这八个中有任何一个 *fail*，那是一个真实发现。**
- **留意：** 任何动画片段上的 `scaleDelta ≠ 0` 都是绊线，不是描述符——源绑定对关节做了缩放，这会改变蒙皮调理在合法范围内能做的事。在其他任何事继续之前先把它暴露出来。
- 动画片段名称：描述运动的名称是可证明的；暗示意图的名称则不是。任何带 `inferred: true` 的都是猜测，这样标注就是诚实的答案，而不是等待更好分类器的占位符。

---

## Phase 4——与 Phase 0 比较并做出判断

**唯一回答你真正提出的问题的 phase。**

播放同一个动画片段，录制与 Phase 0 相同的三个角度。然后**以书面形式**回答三个问题：

1. **网格还会撕裂吗？** 会 / 不会 / 以不同方式——如果是不同方式，是怎样的。
2. **在你看到之前，有门禁捕获它吗？** 如果你的眼睛发现了某个没有任何门禁标记的问题，那是整次运行中最有价值的结果：它指出了一个缺失的门禁。
3. **有门禁标记了你的眼睛看不到的东西吗？** 反方向上同样有价值——要么是低于视觉阈值的真实缺陷，要么是过于严格的门禁。

> **"有改善"不等于"已修复"。** 如果撕裂变少了，就说撕裂变少了。指出仍不匹配的地方，比一个干净的结论更有价值。

---

## 需要回传的内容

这些让结果可以据以行动，而不是一个猜测：

- Phase 0 和 Phase 4 的录像——同一个动画片段，同样的三个角度。
- `glb-rig.json`，尤其是 `deformVsTechnical` 和关节顺序。
- `mesh_parity verify` 的输出，无论通过还是失败，原样提供。
- 完整的 `rig_gates` 报告——未评估的门禁和失败的门禁同样重要。
- 你在 `mesh-repair` 步骤中修复的每一项，每项一行。
- 你不得不偏离本计划的地方，以及原因。

---

## 已知缺口，免得被当成 bug

- **四个门禁没有生产者**（`G1` `G3` `G6` `G10`）。它们报告 `unevaluated`，按设计会让报告变为非 ok。
- **没有任何东西以 `validate_rig_payload.py` 期望的结构写出 `rig-payload.json`。** `new_sculpt_spec.py` 产出的 `spec["rig"]` 结构不同；不存在转换器。
- **`mesh-repair` 和 `rig-bind` 是散文式步骤**，没有脚本，也没有可验证的产物。`rig-bind` 创建骨架；它唯一的下游检查是 `mesh-parity-verify`，而那只证明 buffer 未被触碰，**并不**证明绑定正确。
- **GLB 快速通道的 worktree 仍停留在 1.5.1**，没有 1.5.2 的任何动画技术栈。在它 rebase 之前，两个分支无法合并。
- **`single-subject` 阈值**（混合半径 `R = 0.006H`、§2 的分类边界）仍来自同一个绑定。把它们当作起始值，而不是常数。

**最便宜的下一项修复**——如果你想要 `G1`（捕获静默播放的动画片段的门禁，也是唯一能区分"会播放的动画片段"和"存在、能加载、持有 action、报告时长却什么都不驱动的动画片段"的检查）——是给 `emit_animation_runtime.py` 加一个 CLI。它已经包含产出该输入的 `runGateR1()` harness；只是没有东西把它暴露给 shell。

---

## 相关文档

- `docs/GLB_ANIMATED_CHARACTER_PROMPT.md`——本计划所测试的一次性提示词。
- `docs/pipelines/character-rigging-animation-1.5.2.md`——推导过程和失败日志。
- `grimoire/readiness/animation_contract.md`——Stage R 阶段读取的路由文件。
- `forge/stage5_rig/CONTRACT_1.5.2.md`——模块地图和载荷结构。
