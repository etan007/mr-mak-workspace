# 表面拓扑分类

在为任何组件指定 `primitive` 之前使用本参考。先判定表面的*种类*，可以避免最常见的几何不匹配
失败：选了一个在结构上与轮廓实际形态不符的基本体（见 Plan 1.3 Workstream A/F——把连续的有机
鼓包建成一摞盒子，或因为从未尝试 `extrude` 而把刀身建成盒子）。

## 六个类别

- **`continuous-sculpt`**——单一、平滑变化的体积，没有内部接缝或面板断口：角、平滑的有机鼓包、
  磨圆的石头、回转容器。绝不使用 `box`/`cylinder`/`cone`——应使用 `lathe`（旋转对称）、
  `extrude`（带深度的轮廓）或 `curve-sweep`（沿 3D 路径）。
- **`assembled-solid`**——离散的刚性部件，面是平面或简单曲面，确实由基本体构成：板条箱、圆柱
  罐、方正的底盘面板。`box`/`cylinder`/`cone`/`capsule`/`torus` 在这里都可以。
- **`conforming-shell`**——贴合下方某物形态的薄表面，自身没有独立体积：机身蒙皮面板、薄的弧形
  整流罩、贴身覆盖在躯体上的布料层。通常需要一个弯折/塑形以贴合下方形态的 `plane-card`，或一个
  浅 `extrude`。
- **`surface-relief`**——改变表面、但不改变决定整体轮廓的体积的细节：棱线、面板线、铆钉、浮雕
  logo。只有当起伏大到在预期观看距离下会影响轮廓时，才用几何体表现（见
  `grimoire/feedback/shading_realism.md` 中的"几何起伏"规则）——否则这属于材质问题
  （normal/bump），而不是 `topologyClass` 问题，该组件也不需要单独的条目。
- **`fiber-strand`**——细长、常重复出现的线状形态：线缆、绳索、发束、根须、藤蔓、金属丝。绝不
  使用 `box`/`plane-card`——应使用 `tube`（沿路径）或 `instanced-cluster`（大量重复的线束）。
- **`material-only`**——自身没有独立的几何占位；纯粹是附着在父级表面上的材质/贴花层（印刷 logo
  面板、平贴纸）。这里任何基本体都可以，因为"几何体"只是材质的薄载体。

## 决策树

1. 该组件有自己的体积，还是只在父级表面上承载材质/贴花？→ 若是后者，`material-only`，到此为止。
2. 它是否细长，并且沿路径延伸或大量重复？→ `fiber-strand`。
3. *轮廓本身*是否受细小细节（棱线/铆钉/面板线）影响，且没有其他独立体积？→ `surface-relief`。
4. 它是否有清晰、可指认、可数出的硬面（"这个立方体、那个圆柱"）？→ `assembled-solid`。
5. 它是否是贴合另一形体曲率的薄蒙皮，自身没有体积？→ `conforming-shell`。
6. 否则——一个连续、平滑变化的整体——`continuous-sculpt`。

## 示例

| 物体 | 组件 | 类别 | 原因 |
| --- | --- | --- | --- |
| Gerber 刀 | 刀身 | `continuous-sculpt` | 平滑渐缩至尖端的楔形——用刀尖轮廓只含 `lineTo()` 的 `extrude`，而不是盒子。 |
| Gerber 刀 | 伞绳缠绕 | `fiber-strand` | 重复缠绕的绳索——`instanced-cluster` 或沿螺旋路径的 `tube`。 |
| 哆啦A梦的房子 | 墙板 | `assembled-solid` | 平整的刚性面板，确实是盒状。 |
| Sony 耳机 | 充电盒外壳 | `conforming-shell` | 贴合下方耳机凹槽的薄弧形外壳——并非整体实心。 |
| 角色 | 衬衫胸前 logo | `material-only` | 附着在躯干表面的平面贴花；自身没有几何体。 |
| Warhauler | 天线导线 | `fiber-strand` | 细线缆——用 `tube`，绝不用 `box`。 |

## 常见错误

按"它有多大"而不是"它是哪种表面"来分类。一块大而光滑的石头和一颗小而光滑的卵石都是
`continuous-sculpt`；一块大的平整墙板和一块小的平板都是 `assembled-solid`。尺寸不改变类别——
表面行为才决定类别。
