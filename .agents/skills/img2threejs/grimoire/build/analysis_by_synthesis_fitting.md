# 合成分析拟合（Analysis-By-Synthesis Fitting）

这是 v1.5 的 WS4 拟合循环。它把确定性参数搜索与 Divine Eye 绑定在一起，使循环表现得像一次
有界的美术修正迭代，而不是自由运行的猜测器。

`forge/stage4_review/fit_params.py` 为合成分析参数提供纯标准库、确定性的有界坐标下降。
仅当调用方能提供确定性目标函数时，才用它来调优一个小型渲染或场景向量。

## API 与限制

```python
result = fit(initial, bounds, objective, FitConfig())
```

- `initial` 包含 1 到 15 个有限、非布尔的数值参数。
- `bounds` 为每个参数提供一个有限的 `[lower, upper]` 数对。下界严格小于上界，且每个初始值
  都在范围内。
- `objective(parameters)` 返回一个有限分数。分数越高越好。
- 候选顺序固定：对每个坐标，先评估有界的向下移动，再评估有界的向上移动。`seed` 仅为元数据；
  不使用任何随机源。
- `max_iterations` 与 `max_evaluations` 是硬性上限。拟合器还会在达到配置的平台期，或出现连续的
  坐标方向来回抖动（thrashing）时停止；翻转跟踪只作用于净增益低于 `min_improvement` 的连续迭代。
  每个至少包含一次反向的不稳定迭代会让抖动连续计数加一；遇到稳定迭代或不含反向的迭代时，跟踪
  重置。这样可使正常的区间细化、单次多坐标反向，以及非连续的翻转都不会触发 `oscillation` 停止
  条件。
- 如果评估预算不足以评估某个坐标的第二个方向，则在返回 `max-evaluations` 结果之前，会先提交并
  记录已评估过且更优的第一方向候选。

`FitResult` 包含最终的 `parameters`、目标函数的 `best_score`、`status`、评估与迭代总数、`seed`，
以及逐迭代的 `FitTelemetry`（含目标分数、是否改进标记、累计评估次数和步长）。`to_json()` 为兼容
保留 `bestScore`，并新增显式的 `bestObjectiveScore` 字段。

`fit_against_divine_eye()` 用一个渲染回调包装 `fit()`，对每个候选调用 Divine Eye 评估器，存储
原始结果，并把候选元数据回写到每条已评估记录上。干净的候选保持其 `[0, 1]` 范围内的原始保真度。
触发硬门禁的候选在目标函数中计为 `-1.0`，但其原始保真度仍会单独保留为 `bestRawFidelity`，并保留
在复制出的 `divineEyeResults` / `correctionHistory` 载荷中。

## CLI 夹具目标函数

CLI 只运行一个确定性的二次夹具目标函数。其顶层对象必须恰好包含 `initial`、`bounds`、`target`
和 `config`；它读取：

```json
{
  "initial": [0.0],
  "bounds": [[-1.0, 1.0]],
  "target": [0.5],
  "config": {"maxIterations": 20, "maxEvaluations": 200, "seed": 7}
}
```

`config` 只接受 `maxIterations`、`maxEvaluations`、`minImprovement`、`plateauIterations`、
`oscillationFlips` 和 `seed`。未知键会以退出状态 2 被拒绝。生产调用方直接用自己的目标函数调用
`fit()`。

## 可执行的 Divine Eye 拟合

`fit_against_divine_eye(initial, bounds, render_for_parameters, reference_png, evaluator=None, config=FitConfig())`
把一个确定性的"参数到渲染"回调转换为有界的保真度目标函数。每次评估时，它调用
`render_for_parameters(parameters)`，将渲染结果与 `reference_png` 对比评估，并最大化一个感知门禁的
目标分数。干净的结果使用其 `[0, 1]` 范围内的原始 Divine Eye 保真度；`hardGateFailures` 非空的结果
使用 `-1.0`，低于任何干净分数。原始保真度在评估器结果和修正历史中原样保留，因此全部触发门禁的
运行仍然有界且可审计，同时不会让一个原始分数很高但触发门禁的结果顶替干净的拟合。

可选的评估器接收 `(reference_path, render_path)`，默认惰性导入 `divine_eye.evaluate`，因此导入
拟合模块不会加载图像分析依赖。其 `DivineEyeFitResult` 返回 `fit_result`、每个评估器结果的复制
记录，以及带硬门禁和完整 Divine Eye 溯源信息的规范化 `correction_history`。该集成不会修改评估器
返回的结果映射。每个复制出的结果会获得由适配器持有的 `fitCandidateParameters`、`fitReferencePng`
和 `fitRenderPath` 字段。

`DivineEyeFitResult.fit_result.best_score` 和 `bestObjectiveScore` 是目标分数，不一定是原始保真度：
全部触发门禁的运行会报告 `-1.0`。对选中的干净候选，使用可选的 `best_raw_fidelity` / JSON
`bestRawFidelity`。其 `correction_history` / JSON `correctionHistory` 派生自复制出的原始 Divine Eye
记录，绝不来自目标分数，因此对全部触发门禁的运行也保持有效且可审计。

## Divine Eye 与修正循环

`divine_eye_fidelity(result)` 仅在原始 Divine Eye `fidelity` 有限且位于 `[0, 1]` 内时，才将其读作
标量目标分数。`divine_eye_correction_history(results)` 保留每个结果的 `hardGateFailures`，并把相同
的值复制到修正循环的 `defectTags` 中。每条规范化记录还带有一个深拷贝的 `divineEye` 映射，包含原始
结果上下文：保真度、门禁失败、动作、信号，以及存在时的参考图或渲染图路径。只有当结果没有硬门禁，
且其存在的路由字段为 `action="continue"` 和 `verdict="pass"` 时，才视为通过；仅含保真度的映射为
兼容起见仍视为通过。相对上一个已通过的最佳分数出现保真度下降时，记录 `reverted=True`；待定
（`probe`/非 pass）、已回退或触发硬门禁的尝试不会替换该基线，也不会在感知门禁的拟合中胜出。
源映射及其嵌套的溯源信息都不会被修改。

`correction_loop.decide()` 是停止策略。它依次检查：硬门禁、待定评审路由、成功、重复缺陷、振荡、
平台期，以及硬性上限。这个顺序很重要，因为硬门禁总是路由到 `refine-code`，而上限总会停止循环，
即使分数仍在上升。

当修正历史包含嵌套的 `divineEye` 溯源信息时，其中的有限保真度、硬门禁、动作和判定（verdict）具有
权威性。镜像到顶层的保真度和路由字段必须与之一致，否则校验会拒绝该条目；仅含保真度的历史条目仍受
支持。

`budget_exceeded(spent_tokens, budget)` 接受有限非负的数值开销和非负整数预算；格式错误的值会抛出
`ValueError`。
