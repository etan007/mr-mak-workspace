# 视觉外壳（Visual Hull）重建

这是 WS2。它从干净的轮廓视图重建几何体，并把隐藏区域视为低置信度，而不是凭空
捏造细节。

当你至少有两张干净的近似正交遮罩，且轮廓是拖累模型的主要因素时使用它。

## spec 携带的内容

规格（spec）使用 `geometryDescriptor.visualHull`，包含以下字段：

```json
{
  "projection": "orthographic",
  "boundsSpace": "component-local",
  "bounds": { "min": [-1, -1, -1], "max": [1, 1, 1] },
  "resolution": 32,
  "triangleBudget": 400000,
  "views": [
    { "axis": "front", "confidence": 0.9, "mask": ["11110000"] },
    { "axis": "side", "confidence": 0.8, "mask": ["11100000"] }
  ],
  "hiddenRegions": ["back", "underside"]
}
```

`views` 数组中的轴必须互不相同。有效轴为 `front`、`side` 和 `top`。
每个遮罩是一个二进制字符串网格。

## 限制

- 至少需要两个视图。
- `resolution` 必须在 4 到 32 之间。
- `triangleBudget` 必须为正数，且不超过 400000。
- 该预算还必须覆盖所选分辨率下最坏情况的三角形数。
- 遮罩必须在支持的尺寸范围内，且包含前景像素。

## 生成器行为

生成器根据轮廓雕刻体积、焊接结果，并把视觉外壳元数据存到运行时几何体上。生成的
源码在元数据中保留隐藏区域信息，以便审查循环将其标记为低置信度。

这条路径不能与同一组件上的 `sdf` 或 `subdivide` 组合使用。

## 校验规则

- `projection` 必须是 `orthographic`。
- `boundsSpace` 必须是 `component-local`。
- 重复的轴会被拒绝。
- 相互矛盾的遮罩会在运行时以带类型的占用错误失败。

## 验收标准

- 两张干净的轮廓生成一个焊接网格，其轮廓与每个视图一致。
- 隐藏区域保持标记为低置信度。
- 环视（turnaround）路径改善参考基线，而不是退化成噪声。
