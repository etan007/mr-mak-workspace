# 隐式 SDF 建模

这是 WS1。它为生成器提供一条代码侧的隐式曲面路径，用于需要单个焊接有机主体、
而不是一堆分离基本体的形状。

当参考图需要平滑并集、融合的肢体、柔和过渡，或其他一旦持续堆叠方块和胶囊体就会
失真的形体时使用它。

## spec 携带的内容

规格（spec）同时使用 `component.topologyClass: "implicit"` 和
`geometryDescriptor.sdf`。

描述符仅限以下基本体类型：

```json
{
  "primitives": [
    { "id": "torso", "type": "capsule", "radius": 0.28, "height": 1.1 },
    { "id": "head", "type": "sphere", "radius": 0.34 }
  ],
  "operations": [
    { "type": "smooth-union", "left": "torso", "right": "head", "radius": 0.12, "id": "body" }
  ],
  "resolution": 32,
  "bounds": { "min": [-1.2, -1.6, -1.2], "max": [1.2, 1.6, 1.2] }
}
```

支持的基本体有 `sphere`、`capsule`、`box`、`cone` 和 `ellipsoid`。
支持的运算有 `smooth-union`、`subtract` 和 `intersect`。

## 限制

- `primitives` 不能为空，且不超过 64 项。
- `operations` 可选，但如果提供，不超过 128 项。
- `resolution` 必须在 4 到 64 之间。
- 可选的 bounds 如果提供，`min` 和 `max` 向量必须有序。

## 生成器行为

生成器对 SDF 采样、将其多边形化，并重新计算结果几何体的法线。输出仍是程序化代码，
而不是导入的网格。

没有 SDF 块时，生成的几何体保持默认管线不变。生成的 `implicit sdf` 路径不支持细分。

## 校验规则

- `geometryDescriptor.sdf` 必须在代码生成前结构有效。
- `sdf` 和 `visualHull` 不能位于同一个组件上。
- 隐式路径不能同时使用 `sdf` 和 `subdivide`。
- 基本体和运算的 id 必须保持唯一。

## 验收标准

- 躯干加肢体的测试夹具生成一个法线连续的焊接几何体。
- 默认的纯物体 spec 保持逐字节一致。
- Forge 单元测试通过，showcase TypeScript 冒烟测试保持干净。
