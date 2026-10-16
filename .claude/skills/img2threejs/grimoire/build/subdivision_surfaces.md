# 细分曲面

这是 WS3。它添加一个可选启用的 Catmull-Clark 细化步骤，让粗糙的控制笼无需离开代码
管线就能变成平滑、密集的曲面。

当控制笼正确，但曲面仍需要更干净的观感或更均匀的密度时使用它。

## spec 结构

规格（spec）使用 `geometryDescriptor.subdivide.iterations`。

```json
{
  "geometryDescriptor": {
    "subdivide": { "iterations": 2 }
  }
}
```

`iterations` 可选。缺失时，生成器不会生成该辅助函数。

## 限制

- `iterations` 必须是 0 到 4 的整数。
- 预计的四边形面数必须不超过 100000。
- 无法安全估算预算的基本体路径（如开放平面或隐式 SDF 输出）会被拒绝。

## 生成器行为

生成器生成 `subdivideCatmullClark`，应用所请求的迭代次数，并在每次细分后重新计算
法线。

该辅助函数是确定性的。相同的输入 spec 产生相同的输出源码。

## 校验规则

- `subdivide` 无法挽救本身已无效的拓扑。
- 非流形边、开放边界边和不相连的面扇会被拒绝。
- `implicit sdf` 输出不使用这条路径。

## 验收标准

- 有效的控制笼在每次迭代中获得预期的四边形增长。
- UV2 数据与细分后的曲面保持同步。
- 生成后 showcase TypeScript 冒烟测试保持干净。
