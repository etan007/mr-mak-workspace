# img2threejs 1.5.2——角色绑定与动画流水线

**状态：** 已在 img2threejs 1.5.2 中实现（`forge/stage5_rig/`；模块地图见
`forge/stage5_rig/CONTRACT_1.5.2.md`，路由见 `grimoire/readiness/animation_contract.md`）。
**范围：** 为角色绑定计算和设计动画。
**来源：** 提炼自 Lee Sin showcase 构建（1.5.1）。该 demo 在这里只是只读证据；本文中没有任何内容专属于它。

下文所有阈值都以**人物高度 H** 的比例表示，从不使用绝对单位。Lee Sin 被归一化为 H = 1.0，因此其测量数字
可以直接读作比例；尺度不同的绑定必须换算。只来自单一主体的数字标记为 `single-subject`，应视为起始值，
而非常数。

---

## 0. 为什么需要这条流水线

1.5.1 中的绑定失败不是"动画看起来有点不对"。它们是**彻底且无声的**：十一个片段持有 action，mixer 持有状态，
按钮正常派发，但什么都没动。两个独立的 bug 各自产出了一个看起来合理、却零运动的场景。两者在代码评审中都
不可见；都是靠测量才发现的。

因此这条流水线围绕一条规则构建：

> **关于绑定的任何事，在它于某个采样时间被求值、并与轨道声称应有的值对比之前，都不可信。**
> 存在的片段不等于能播放的片段。

---

## 1. 测量词汇

一个特征向量支撑整条流水线。它既用来识别未知片段（Stage R3），**也**用来规定你将要编写的片段（Stage R4）。
同一份代码，双向使用。

在 `N = 25` 个均匀间隔的时间点对片段采样。每个时间点记录六个关键关节的**世界**位置：
`hip`、`head`、`hand.l`、`hand.r`、`foot.l`、`foot.r`。

| 特征 | 定义 |
|---|---|
| `duration` | 片段长度，秒 |
| `travel` | `max_t ‖hip_xz(t) − hip_xz(0)‖`——根节点的平面位移 |
| `rise` | `max_t hip_y − min_t hip_y`——根节点的垂直偏移 |
| `speed` | `travel / duration`，单位 H/秒 |
| `handRange` | 双手各轴范围中的最大值 |
| `footRange` | 双脚各轴范围中的最大值 |
| `headRise` | 头部的垂直范围 |
| `scaleDelta` | `max_t max_j |scale_j(t) − 1|` |
| `poseReturn` | `t = 0` 与 `t = duration` 之间逐关节变换差的最大值 |

`scaleDelta` 是绊线，不是描述量。Lee Sin 的十一个片段测得均为 `0.000`；非零值意味着源绑定会缩放关节，
这会改变 Stage R2 对蒙皮权重可合法进行的操作，必须在其他任何步骤之前先暴露出来。

---

## 2. 分类阈值

由单一主体上十一个测得片段推导而来。边界位于观测到的簇之间的空隙中，而不是取整数。

```
idle          travel < 0.02H  and  rise < 0.02H
in-place      travel < 0.30H
walk          0.30H/s ≤ speed < 0.60H/s
run           0.60H/s ≤ speed < 1.50H/s
dash          speed ≥ 1.50H/s
jump          rise ≥ 0.15H  and  travel < 0.50H
leap          rise ≥ 0.15H  and  travel ≥ 0.50H
planted       footRange < 0.10H            (feet do not participate)
gesture       handRange ≥ 0.40H  while in-place
```

用其来源片段做的验证：

| 片段 | travel | rise | speed | 归类为 |
|---|---|---|---|---|
| walk-forward | 1.133 | 0.019 | **0.400** | walk ✓ |
| run-forward | 1.465 | 0.021 | **0.799** | run ✓ |
| dash-forward | 2.906 | — | **2.250** | dash ✓ |
| jump-in-place | 0.272 | **0.248** | — | jump ✓ |
| leap-forward | 2.826 | **0.517** | — | leap ✓ |
| idle-still | 0.013 | 0.0001 | — | idle ✓ |
| arms-only | — | 0.008 | — | planted + gesture ✓ |

walk/run 的间隙（0.400 → 0.799）和 run/dash 的间隙（0.799 → 2.250）都很宽。`single-subject`：
在固化这些阈值之前，先确认这些间隙在第二个绑定上依然存在。

---

## 3. 命名与诚实标记

源片段到来时名为 `NlaTrack`、`NlaTrack.001`……——这是不携带任何信息的 Blender NLA strip 名称。
根据测量结果重命名，并记录**名称所依据的是哪项测量**。

描述运动的名称（`run-forward`、`arms-only-feet-planted`）是可证明的。暗示意图的名称（`strike`、`guard`、
`taunt`）则**不是**——没有任何运动学特征能区分一次出击和一次踉跄。这类名称带 `inferred: true`。

```ts
interface ClipName {
  sourceName: string;   // 绝不丢弃——保持 accessor 一致性链完整
  id: string;
  label: string;
  measured: string;     // 名称所依据的数字
  inferred: boolean;    // 措辞暗示了测量无法证明的意图时为 true
  loop: boolean;
}
```

十一个源片段中有两个只能靠推断命名。标记它们毫无成本，却能让下一个读者看清"测得的"与"猜的"之间的区别。

---

## 4. 循环规则（loop rule）——已修正

glTF 不携带循环标记，因此必须自行判定。

1.5.1 使用的是 *"既不位移也不上升的片段可以无缝重复。"* **这条规则与其自身数据不符**：`idle-gesture` 的
`travel = 0.121`——是 idle 阈值的六倍——却被正确地标记为可循环，因为让片段可循环的不是根节点保持不动，
而是**最后一帧姿势回到第一帧**。

**改用：**

```
loop  ⟺  poseReturn ≤ 0.5° per rotation joint
     AND  ‖hip(T) − hip(0)‖ ≤ 0.01H
```

`poseReturn` 直接在关节变换上测量，因此它能接受游走后又回来的片段（可循环），并拒绝在离起点一厘米处
停在半步中的片段（不可循环）。travel 和 rise 仍作为描述量保留；它们不再是循环判据。

---

## Stage R0——绑定导入

**输入：** 带局部 TRS 的关节层级、蒙皮（关节列表 + 逆绑定矩阵）、片段。
**输出：** 类型化的节点图，以及对每个节点的分类。

1. **形变节点 vs 技术节点。** 一个节点是 `Bone` **当且仅当它出现在 `skin.joints` 中**；其余都是 `Group`。
   不要根据名称推断。Lee Sin 的绑定在一个 113 节点的图中有 42 个形变关节，所以图远大于骨架，按遍历顺序
   得到的骨架会是另一副骨架——把非关节节点构建成骨骼会破坏索引空间。

   **更正，测量于 2026-08-25。** 1.5.2 最初写着"片段会驱动非关节的技术节点"，并引用了这个绑定作为依据。
   用 `stage5_rig/glb_rig_reference.py` 在流水线所提炼自的资产上重新测量：**全部 11 个片段的全部 1,353 个
   动画通道都指向形变关节；零个指向技术节点。** 规则保持不变——正是它保持了蒙皮索引空间的完整，而且
   确实驱动技术节点的绑定也是完全合法的 glTF——但为它提供的证据无法复现，因此该论断现在被表述为它所防范的
   风险，而不是一项观察。`deformVsTechnical` 会报告每个资产的真实计数；读取它，而不是做任何一种假设。
2. **先连接，再挂根。** 先构建所有节点，再挂接子节点，然后把场景根节点挂到同一个容器下。任何其他顺序都会
   产生一个在构建骨架时世界矩阵已过期的图。
3. **骨架。** `new THREE.Skeleton(bones, boneInverses)`，其中 `bones[i]` 是 `skin.joints[i]` 对应的节点，
   `boneInverses[i]` 是逆绑定 accessor 中的第 `i` 个矩阵。顺序以蒙皮为准，绝不以遍历为准。
4. **关键点。** 解析六个关键关节（§1）一次并缓存。优先用拓扑而非名称：hip 是离根最近、度数最高的节点；
   手和脚是链的叶子；左右由局部 X 的符号区分。

**Gate R0：** `maxSkinIndex ≤ bones.length − 1`。只要有一个越界索引，就会静默读取一个垃圾矩阵，把某个顶点
形变到无穷远。

---

## Stage R1——绑定空间

**1.5.1 中的每一次绑定失败都由这一阶段引起。编写任何绑定代码之前先读它。**

Three.js `SkinnedMesh` 默认使用 **attached** 绑定模式，在该模式下 `bindMatrixInverse` 会在*每次*
`updateMatrixWorld` 时根据网格的 `matrixWorld` 重新计算。因此蒙皮求值为：

```
v' = skinMatrix · bindMatrix · v          // matrixWorld 完全抵消
```

三个后果，每一个都实际踩到并测量过：

| 尝试的做法 | 渲染结果 |
|---|---|
| `mesh.bind(skeleton, armature.matrixWorld)` | **空白画面**——绑定被应用了两次 |
| 单位绑定 + 一个 `skinSpace` 包装 | 人物高 0.5 m，悬浮 |
| 单位绑定 + 把 armature 平移加到显示偏移上 | 人物恰好偏移了 armature 平移量 |

**规则：**

```ts
mesh.bind(skeleton, new THREE.Matrix4());   // attached 模式下始终用单位矩阵
group.position.copy(displayOffset);          // 仅用于展示
```

并且显示偏移必须**只根据网格包围范围**计算——`(−centre.x, −min.y, −centre.z)`，让人物落在 Y = 0 上——
**不加 armature 平移**。armature 的变换已经在 `skinMatrix` 里；再加一次就重复计算了。

**Gate R1（捕捉无声失效的那个门禁）：** 把每个片段 seek 到五个时间点，然后对每条轨道，将节点的实际变换与
`track.createInterpolant().evaluate(t)` 对比：

```
maxSampledBindingDelta ≤ 2^-23        (float32 epsilon)
```

这证明绑定路径*确实到达了节点*。一个片段可以存在、被加载、持有 action 并报告时长，却什么都不驱动——
这是唯一能区分两者的检查。

---

## Stage R2——蒙皮调理

适用于任何由**多个相互重叠的部件**构建的角色，大多数生成的角色都属于此类。

### 失败现象

在绑定姿势下重叠在一起、但绑定到*不同*关节的两个顶点，在这两个关节分开运动的那一刻**必然**分离。这不是
权重的 bug；这正是权重所表达的。它表现为片段播放中途蒙皮被撕开。

### 无效的做法

只焊接完全重合的顶点（1e-4 H 以内）。它闭合了颈部到锁骨的裂缝，但对 11 个片段 × 4 个时间点 × 3 个方位角
= 132 帧的扫描仍在 **28 帧中发现裂缝，共 1,410 px** 背景透出。相邻部件大多是**重叠**的；它们很少共享边缘，
所以重合焊接几乎找不到任何东西。

### 有效的做法——邻近权重混合

对每个在半径 `R` 内存在**另一部件**顶点的顶点：

```
w_mixed = w_own + Σ_q  w_q · (1 − d_q/R)²
w_final = renormalise( top4( w_mixed ) )
```

实现要求，每一条都不可省略：

- **稠密累积。** 混合前把 4 影响的绑定展开为覆盖所有关节的稠密向量，然后再归约回 4 个。直接混合稀疏的
  4 槽绑定会丢失影响。
- **所有读取之后再写入。** 先缓冲结果，最后统一提交，否则混合结果依赖迭代顺序，不再可复现。
- **每个半径一个单元的均匀网格哈希**，使一次查询最多触及 27 个桶。暴力法是 O(n²)，超过约 50k 顶点就无法使用。
- **内部顶点绝不触碰**——它们完全保留源绑定。

**半径：** `R = 0.006H` `single-subject`。对照关闭混合的控制组选定，扫描 11 个片段 × 4 个时间点 × 2 个肩部 ×
2 个方位角 = **176 帧**：

| | 裂缝中透出的背景 | 细暗褶痕 |
|---|---|---|
| 关闭混合 | 974 px，30 个斑块 | 31,316 px |
| 混合 R = 0.006H | **287 px，15 个斑块** | 36,470 px |

**这个取舍是真实存在的，运行本阶段时必须说明：** 平均两个部件的绑定会让它们一起移动，从而闭合孔洞，但会
把每个部件稍微拉离其自身关节应走的路径——因此褶痕会*加重*约 16%。这是有意接受的：**孔洞露出的是背景，
褶痕露出的是皮肤。** 不要让后续阶段通过关闭混合来"修复"褶痕数。

残留问题如实记录而非隐藏：此方法无法消除褶痕。要彻底去除，需要把部件焊接成一个连续网格并使用统一的权重场，
这会改变部件结构并破坏逐部件 UI。

**Gate R2：**
```
|1 − Σ w| ≤ 2e-7   for every vertex        (normalised)
maxSkinIndex ≤ bones.length − 1            (still in range after reduction)
```

---

## Stage R3——片段识别

用于**自带**片段的绑定。

1. 为每个片段采样特征向量（§1）。
2. 分类（§2）、命名、设置 `inferred` 标记（§3）、判定 `loop`（§4）。
3. 精确迁移轨道：关键帧时间和值逐字节一致，`STEP → InterpolateDiscrete`、`LINEAR → InterpolateLinear`，
   绑定字符串为 `${nodeName}.${property}`，其中 `rotation → quaternion`、`translation → position`、
   `scale → scale`。
4. 在 `track.userData` 上保留 `sourceName`、channel/sampler 索引和逐 accessor 哈希，使回溯到某一个源动画的
   一致性链在重命名后依然成立。

**Gate R3：** 轨道数、关键帧数、逐轨道字节相等、时长相等，以及整组中恰好两种不同的插值常量。

---

## Stage R4——动作设计

用于编写绑定**没有**的片段。测量词汇在这里得到双重回报：识别片段的同一个特征向量也能**规定**片段。

### 循环

```
target features  →  author tracks  →  measure with §1  →  compare  →  iterate
```

只有当设计片段的测量特征落在目标区间内时才被接受。"看起来对"不是判据；§2 的分类器必须认同该片段就是它
所声称的那样。

### 链解析

在**链**上编写，而不是单个关节。从拓扑解析：

- `spine`——根 → 通往头部的最高度数路径
- `arm.{l,r}`——锁骨 → 手部叶子
- `leg.{l,r}`——髋 → 脚部叶子
- 对称对：在容差内局部 X 镜像

**内侧/外侧约定门禁：** 解析之后，在模型空间断言 `leftAnchor.x > 0 > rightAnchor.x`。这一次比较就能捕捉
镜像绑定——即每个左手动作都在右边播放、而单独看任何一处都不显得错误的那种失败。

### 基元

| 基元 | 用途 | 参数 |
|---|---|---|
| **Gait** | walk / run / dash | 步频、步幅、接触比例、髋部起伏、手臂反向摆动 |
| **Ballistic** | jump / leap | 起跳速度、顶点高度、滞空时间、落地缓冲 |
| **Reach** | strike / gesture | 目标 socket、蓄力比例、随势动作、回位 |
| **Additive** | 呼吸、摇摆 | 幅度、周期、关节遮罩——叠加在任意基础动作上 |

Gait 是相位状态机，不是正弦波。每条腿有支撑期和摆动期；**接触约束**是区分动画与滑动的关键：脚处于支撑期时，
其世界位置不得移动。

```
footSlide = max over stance frames  ‖foot_world(t) − foot_world(t_contact)‖
require    footSlide ≤ 0.01H
```

这是本阶段最有价值的单项门禁。违反它的步态在每个观众看来都是"飘"或"滑冰"，却很难用肉眼说清问题所在。

### 设计目标，实例

为高度 H 的绑定编写 walk：

```
duration   ≈ 1.0–1.2 s per cycle
speed      target 0.40H/s      → travel = speed × duration
rise       0.015H–0.025H       (hips stay flat; more reads as a limp)
handRange  0.15H–0.25H         (counter-swing, opposite phase to the leg) — hip-relative
footRange  ≈ stride            ≈ travel / 2 per foot per cycle — hip-relative
contact    0.60 of cycle per foot, so both feet are down 0.20 of the time
poseReturn ≤ 0.5°              → loopable by §4
```

**坐标系更正——在实现时发现。** §1 把 `handRange` 和 `footRange` 定义为**世界空间**中的各轴范围，按这个定义，
上面两个区间在任何速度下都无法满足：向前行进的步态会带着四肢随身体移动，因此 `footRange ≈ travel`，
`handRange ≈ travel + swing`。只有去除根节点的平面运动后这些区间才有意义，所以本节中的肢体区间是
**相对髋部（hip-relative）**的，并已如此标注。全局特征——`duration`、`travel`、`rise`、`speed`、`scaleDelta`、
`poseReturn`——保持在世界空间，这是 §2 分类器唯一有意义的坐标系。明确说明两个坐标系，而不是用一个悄悄
站不住的坐标系。

`footRange ≈ travel / 2` 还比较了两个不同的量：`travel / 2` 是交替落脚之间的**步长**，而 §1 的 `footRange`
是**位置范围**。相位状态机会把相对髋部的脚部偏移设为 `contactFraction × travel`——在 walk 接触比例 0.60 时
是规格数值的 1.2 倍，在 run 的 0.40 时是 0.8 倍。实现把 `≈` 解读为 ±30%。

Run：把速度提高到 `[0.60H/s, 1.50H/s)`，把接触比例降到 0.5 以下以产生腾空期，把 `handRange` 提高到接近 0.35H。
此时分类器必须在不被告知的情况下报告 `run` 而不是 `walk`——这就是验收测试。

**Gate R4：**
```
classifier(authored) == intended class          (§2 agrees)
footSlide ≤ 0.01H during every stance frame
scaleDelta == 0                                  (never author joint scale)
poseReturn ≤ 0.5°  for any clip declared loop
no joint exceeds its measured range from the source clips, where source clips exist
```

---

## Stage R5——运行时装配

三个集成陷阱，在一个其他方面都渲染正确的场景中，它们全都导致了*零可见运动*。

### 5.1 Ticker 收集 vs 延迟加载的几何

一个只在 `start()` 时遍历一次场景来收集 `userData.tick` 的查看器，**会漏掉所有绑定晚到的 demo**。mixer 持有
action；没有任何东西调用 `mixer.update`；每个片段都在无声播放。

```ts
refreshTickers(): void { /* 重新遍历场景查找 userData.tick */ }
// 任何延迟几何就位后调用
```

任何延迟构建的角色都必须在其载荷解析完成时触发 ticker 刷新。动画 UI 同理：把面板挂载写成函数，以便在
控制器存在*之后*也能运行。

### 5.2 展示偏移 vs 动画姿势

如果查看器为爆炸/检查视图对部件做了偏移，它必须在绑定 tick 之前**减去上一帧施加的偏移**，之后再重新施加
——绝不恢复缓存的静止姿势。缓存的静止姿势会覆盖动画刚刚产出的结果：

```ts
removeExplodeOffset();      // 交还动画变换
for (const tick of tickers) tick(dt, elapsed);
applyExplodeOffset();       // 展示效果叠加在上面
```

### 5.3 控制器约定

```
play(name)   stopAllAction → restore bind pose → reset → set loop mode → play
seek(name,t) as play, then paused = true, time = t, mixer.update(0), updateMatrixWorld(true)
stop()       stopAllAction → restore bind pose → active = 'idle'
advance(dt)  mixer.update(dt) → updateMatrixWorld(true)
```

每次 play **之前**恢复绑定姿势，是阻止片段相互渗透的关键：停在姿势中途的片段会让关节保持位移，而下一个片段的
轨道只覆盖它所寻址的关节。循环模式来自测得的 `loop` 标记：`LoopRepeat, Infinity`，或 `LoopOnce, 1` 并设
`clampWhenFinished = true`。

---

## Stage R6——门禁

以下全部通过之前不得发布。每一项的存在，都是因为缺少它曾让一次真实失败漏了过去。

| # | 门禁 | 判据 | 捕捉 |
|---|---|---|---|
| G1 | 绑定到达节点 | 对所有片段 × ≥5 个时间点，`maxSampledBindingDelta ≤ 2^-23` | 无声播放的片段 |
| G2 | 形变有限 | 每网格每帧对 ≥64 个顶点做 `applyBoneTransform`，结果全部有限 | 错误索引、NaN 权重 |
| G3 | 绑定恢复 | `stop()` 后 `maxBindRestoreDelta ≤ 1e-12` | 片段间姿势渗透 |
| G4 | 权重归一化 | 每个顶点 `|1 − Σw| ≤ 2e-7` | 肢体收缩/膨胀 |
| G5 | 索引在范围内 | `maxSkinIndex ≤ bones−1` | 某个顶点飞到无穷远 |
| G6 | 每个可见网格都已绑定 | `visibleMeshCount == visibleSkinnedMeshCount` | 某部件被留在绑定姿势 |
| G7 | 内侧/外侧 | `leftAnchor.x > 0 > rightAnchor.x` | 镜像绑定 |
| G8 | 脚部接触 | 支撑期 `footSlide ≤ 0.01H` | 滑冰步态 |
| G9 | 无关节缩放 | 除非源数据有，否则 `scaleDelta == 0` | 权重混合失效 |
| G10 | 蒙皮完整性扫描 | 裂缝透出背景 ≤ 测得基线 | 运动中撕裂 |

### G10 是视觉门禁，需要专门的工具

扫描姿势不是可选项——**五个姿势不算覆盖**。找到真实缺陷的那次扫描是 11 个片段 × 4 个时间点 × 2 侧 × 2 个方位角
= **176 帧**。

方法：在模型不可能包含的饱和色背景上渲染，统计轮廓*内部*的背景像素，然后做距离变换，只保留足够细、可判定为
裂缝而非合理开口（腋下、带子之间的空隙）的斑块。两个数字都要报告——孔洞和褶痕——因为 Stage R2 是在两者之间
取舍，单一的综合评分会掩盖这一点。

---

## 附录（Appendix）——规则背后的失败

保留这些，是因为每一项都耗费了真实时间，且在评审中都不可见。

1. **Attached 绑定模式抵消了 `matrixWorld`。** 在正确方案之前发布过两次"修复"：一次空白画面，一次半高人物。
   规则：单位绑定，偏移仅由包围范围计算。→ R1
2. **在延迟几何就位前做 ticker 快照。** 每个片段都无声，UI 却完全正常。→ R5.1
3. **显示偏移重复计算了 armature 平移。** 恰好悬浮 0.5 m。→ R1
4. **用重合焊接代替邻近混合。** 闭合了一条裂缝，留下 28 帧裂缝。→ R2
5. **在顶点数不同的网格之间按索引配对比较。** 产出一个自信但完全无效的数字（29.08%，实际为 2.51%）。任何跨网格
   比较都需要空间连接。→ 测量纪律
6. **拿局部空间几何与世界空间参考比较。** 偏差 0.47 m，且自洽。始终说明坐标系。→ 测量纪律
7. **采样贴图时翻转了 V。** glTF 的 UV 原点在左上角。→ R2/材质
8. **把 `NlaTrack.00N` 作为面向用户的标签发布。** 十一个无法使用的按钮。→ R3
9. **一条与自身数据矛盾的循环规则。** `idle-gesture`，travel 0.121，被正确地循环。→ R4

---

## 本流水线不解决的问题

- **部件重叠处的褶痕。** R2 减少孔洞，同时略微加重褶痕。消除褶痕需要一个带统一权重场的连续网格——那是另一种
  拓扑约定。
- **骨架之间的重定向。** 这里的一切都假设只有一副骨架。跨绑定重定向需要关节对应关系和它自己的门禁。
- **意图。** 没有任何测量能区分出击和踉跄。`inferred: true` 是诚实的回答，而不是等待更好分类器的占位符。
