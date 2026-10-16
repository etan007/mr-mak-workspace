# Milestone 0 中不属于门禁报告的发现

这些是在构建 Milestone 0 绑定生成器（`forge/stage5_rig/`）过程中发现的事情。无论 Milestone 0
通过与否它们都成立，并且对日后负责绑定*集成*的人很重要。这些是只读发现——这里的内容不会改动
`forge/stage5_rig/` 或 `forge/tests/test_rig_milestone0.py` 之外的任何文件。

## `THREE.CapsuleGeometry` 的原始接缝是真实缺陷；"焊接后 66 条非流形边"这个数字则不是

> **2026-07-30 更正（致谢：worker-flatten）。** 下面的段落最初声称，即使对
> `THREE.CapsuleGeometry` 做"正确"的焊接，仍会留下 66 条非流形边，并以此论证该基本体需要手写
> 替代品，而不是更好的焊接。这一具体说法是错的——它是
> `BufferGeometryUtils.mergeVertices` 造成的测量伪差，而不是真实的拓扑缺陷。在编辑本文件之前，
> 我独立复现了 worker-flatten 的发现（见下文），而不是盲信这条更正。**原始边界边的发现（194 条）
> 仍然真实且经过验证**——只有故事中"焊接后非流形"那一半是错的。

**经直接验证、真正成立的事实：** 流水线过去生成的那个确切的胶囊调用
（`new THREE.CapsuleGeometry(0.35, 0.7, 16, 32)`，来自 `CAPSULE_CAP_SEGMENTS = 16` /
`CAPSULE_RADIAL_SEGMENTS = 32`——此后的变化见下文"真实流水线的更新"），在其未焊接的原始形态下
确实存在 UV 接缝缺陷：

| 方法 | 顶点 | 三角形 | 边界边 | 非流形边 |
|---|---|---|---|---|
| 原样，未焊接 | 2178 | 4160 | **194** | 0 |
| 仅保留 position + `BufferGeometryUtils.mergeVertices(geometry, 1e-5)` | 2050 | 4160 | 0 | 66 *（伪差——见下文）* |
| 按 position 键去重 + **丢弃退化三角形**（不用 `mergeVertices`） | 2050 | 4096（丢弃 64 个） | 0 | **0** |

**"66" 伪差的根因：** `mergeVertices` 按位置重新索引顶点，但不会丢弃重新索引后变得退化（两个或
更多角塌缩到同一顶点）的三角形。退化三角形 `(a, a, b)` 会把无向边 `(a, b)` 计入统计**两次**，
悄悄地把一条正常的 2 次关联（普通、非非流形）边变成看似 4 次关联——朴素的 `count > 2` 检查就会把
它标为非流形，尽管实际几何在同样丢弃退化三角形之后，是一个完全普通的闭合 2-流形。这种配置下恰好
有 64 个这样的退化三角形——即上面更正后那一行的"丢弃 64 个"，这是我亲自测得的，与 worker-flatten
的数字完全一致。该结果在 `1e-4` 到 `1e-10` 的焊接容差范围内保持稳定（排除了容差大小的解释），并且
在两个不同实现（我的，在此复现；worker-flatten 的，在 `generate_threejs_factory.py` 的上下文中单独
完成）之间独立吻合，数字完全相同。

**因此，原始边界的发现（194 条边）成立，但由此得出的结论并不完全成立：**
`THREE.CapsuleGeometry` 用普通焊接就能修好——只是需要一种同时丢弃退化三角形的焊接，而单靠
`mergeVertices` 做不到这一点。手写的水密基本体（Milestone 0 所用的方案；见下文）是*一种*有效修复，
但并不像我最初暗示的那样，是*唯一*可行的修复。

**对我先前给 team-lead 报告的更正（保留以备查，就其本身而言仍然准确）：** 我之前写道，
`createRiggedDragon.ts:422-432` 中仅保留 position 的 `rawGeometry` 先剥离后合并模式，"正是因为"
下文所述的 UV 接缝属性匹配问题而存在。那是从代码*形态*推断出来的，并不是代码本身陈述的内容；
team-lead 说得对，它出现得更晚，用途也不同（在缩放/平移之前，从 `MarchingCubes` 结果中复制顶点）。
真正经过独立验证、而非推断的是：`mergeVertices` 只合并**所有**属性都在容差内匹配的顶点——我对
*未改动*的几何（所有属性完好）运行 `mergeVertices`，得到同样的 194 条边界边，毫无变化；而剥离到
只剩 position 后则确实发生了变化，以此确认了这一点。至于 dragon 文件的作者当时是否有同样的考虑，
无论哪种说法都未能确立。

**复现（上表三行，一次运行）：**
```bash
cd img2threejs-showcase
node --input-type=module -e "
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
function edgeStats(idxArr, triCount) {
  const edges = new Map();
  for (let o = 0; o < triCount; o++) {
    const tri = [idxArr[o*3], idxArr[o*3+1], idxArr[o*3+2]];
    for (let e = 0; e < 3; e++) {
      const u = tri[e], v = tri[(e+1)%3];
      const k = u < v ? u+':'+v : v+':'+u;
      edges.set(k, (edges.get(k) ?? 0) + 1);
    }
  }
  return { boundary: [...edges.values()].filter(c=>c===1).length, nonManifold: [...edges.values()].filter(c=>c>2).length };
}
const raw = new THREE.CapsuleGeometry(0.35, 0.7, 16, 32);
console.log('raw:', edgeStats(raw.index.array, raw.index.count/3));
const posOnly = new THREE.BufferGeometry();
posOnly.setAttribute('position', raw.getAttribute('position').clone());
posOnly.setIndex(raw.index.clone());
const merged = mergeVertices(posOnly, 1e-5);
console.log('mergeVertices (artifact):', edgeStats(merged.index.array, merged.index.count/3));
const pos = raw.getAttribute('position');
const keyOf = (i) => Math.round(pos.getX(i)*1e5)+':'+Math.round(pos.getY(i)*1e5)+':'+Math.round(pos.getZ(i)*1e5);
const remap = new Int32Array(pos.count); const seen = new Map(); let next = 0;
for (let i = 0; i < pos.count; i++) { const k = keyOf(i); if (!seen.has(k)) seen.set(k, next++); remap[i] = seen.get(k); }
let dropped = 0; const kept = [];
for (let o = 0; o < raw.index.count/3; o++) {
  const a = remap[raw.index.array[o*3]], b = remap[raw.index.array[o*3+1]], c = remap[raw.index.array[o*3+2]];
  if (a===b||b===c||a===c) { dropped++; continue; }
  kept.push(a,b,c);
}
console.log('dedup + drop-degenerate (correct):', edgeStats(kept, kept.length/3), 'dropped', dropped);
"
```

**Milestone 0 采用了什么，以及为什么在 `THREE.CapsuleGeometry` 被证明可修复之后，它仍是合理选择：**
`forge/stage5_rig/emit_rig.py` 的 `buildWatertightCapsule()` 从零构建自己的网格——极点顶点只共享
一次（不为每个扇形三角形重复），径向索引取 `mod radialSegments`，使接缝列从一开始就不会作为独立
顶点存在。这是由构造保证的水密，而不是靠焊接步骤（在尝试过的每种配置下都是 0 边界边 / 0 非流形边，
也没有可能设错的容差参数）。对于一个 kill test 来说，依赖这一性质仍比"调用 `mergeVertices`，然后
记得除了只保留 position 之外还需要一个丢弃退化三角形的 pass"更简单。它并不能直接替代流水线中通用
场景下使用的 `THREE.CapsuleGeometry`（通过 `component.geometryDescriptor` 任意摆放/定向），我也没有
尝试把它做成那样。

**真实流水线的更新：** 本节最初撰写时，`generate_threejs_factory.py:1025` 直接生成未焊接的原始
`THREE.CapsuleGeometry` 调用，因此 194 条边界边的缺陷在真实输出中是存在的。此后 `worker-flatten`
已把 `buildWatertightCapsule` 的一个改编副本移植进 `generate_threejs_factory.py`，用于通用的
"capsule" 基本体（见 `forge/tests/test_primitive_watertightness.py`），所以截至撰写时，该具体缺陷在
真实流水线中已修复——本节现在是这次调查的历史记录，而不是未解决的阻塞项。关于保留两份各自独立验证
的构建器副本（我这里的一份，worker-flatten 在工厂中的一份）而不是共享一个运行时模块的决定：见与
worker-flatten 的消息线程，2026-07-30——`stage5_rig` 在 WS-C 集成之前有意保持独立，而且两份副本
存在正当的、针对各自用途的差异（UV 属性、法线计算时机）。

## Gate (b) 要求网格在关节附近确实有几何

已在正式的门禁报告（给 team-lead 的消息）中记录，这里不再完整重复：`buildWatertightCapsule()`
的第一个版本在整个圆柱轴身上只有一条四边形环带，因此在内部关节的 pivot 附近没有任何顶点。修复方法
是添加 `heightSegments`，其值由当前最小的包络半径推导（每个半径 `RING_RESOLUTION_DIVISOR = 3.0`
个环），而不是硬编码环数，这样当胶囊或骨骼间距变化时，分辨率也会随之缩放。
