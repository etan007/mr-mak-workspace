# Stage R——1.5.2 实现契约

spec 是 `docs/pipelines/character-rigging-animation-1.5.2.md`。本文件固定**模块边界和 payload
结构**，使 R 阶段各模块无需导入 three.js、也无需渲染器即可组合。这里的每个模块都只用 Python 3.10+
标准库。

一切都以**人物身高 H** 的比例表示。payload 显式携带 `H`；任何模块都不得假设 `H == 1.0`。

## 采样动画片段 payload（唯一的动画输入格式）

由能对绑定求值的宿主产出（three.js、Blender、测试夹具）。位置为**世界**空间，且未做任何除法——
各模块自行按 `H` 归一化。

```json
{
  "figureHeight": 1.0,
  "landmarks": ["hip", "head", "hand.l", "hand.r", "foot.l", "foot.r"],
  "clips": [
    {
      "sourceName": "NlaTrack.003",
      "duration": 2.833,
      "sampleTimes": [0.0, "... N = 25 evenly spaced ..."],
      "landmarkPositions": {
        "hip": [[x, y, z], "... N entries ..."],
        "head": [[x, y, z], "..."]
      },
      "jointScaleDelta": [0.0, "... N entries, max |scale_j(t) - 1| over joints ..."],
      "poseReturn": 0.0,
      "stance": {"foot.l": [[t0, t1]], "foot.r": [[t0, t1]]}
    }
  ]
}
```

- `sampleTimes` 的长度 == 每个 `landmarkPositions[*]` 的长度 == `jointScaleDelta` 的长度。
- `poseReturn` 单位为度：`t = 0` 与 `t = duration` 之间各关节旋转差的最大值。无法测量它的宿主
  省略该键；此时模块必须报告 `loop: null`（"无法判定"），绝不能猜测为 `false`。
- `stance` 可选；只有 Gate G8 需要它。区间单位为秒。

## 模块对照表——每个文件一个负责方，不交叉写入

| 文件 | 负责 | 公共 API |
|---|---|---|
| `clip_features.py` | §1 词汇、§2 分类器、§3 命名、§4 循环规则 | `measure_clip`、`ClipFeatures`、`classify`、`decide_loop`、`name_clip`、`ClipName`、`load_payload` |
| `skin_conditioning.py` | §R2 邻近权重混合 + Gate R2 | `blend_weights`、`SkinBinding`、`BlendReport`、`validate_binding` |
| `action_design.py` | §R4 目标、基元、链解析、footSlide | `walk_targets`、`run_targets`、`TargetBand`、`accepts`、`resolve_chains`、`foot_slide` |
| `rig_gates.py` | §R6 G1–G10 运行器 | `run_gates`、`GateResult`、`GateReport` |
| `emit_animation_runtime.py` | §R5 控制器/ticker TS 生成器 | `emit_animation_runtime` |

`rig_gates.py` 从 `clip_features`、`skin_conditioning` 和 `action_design` 导入。没有任何文件从
`rig_gates` 导入。这些模块不会编辑 `forge/` 中的任何其他文件。

## Shared numeric conventions

（共享数值约定）

- 容差是以 spec 中名称命名的模块常量：`BINDING_EPSILON = 2 ** -23`、
  `WEIGHT_SUM_TOLERANCE = 2e-7`、`BIND_RESTORE_TOLERANCE = 1e-12`、`FOOT_SLIDE_LIMIT = 0.01`、
  `POSE_RETURN_DEGREES = 0.5`、`LOOP_HIP_TOLERANCE = 0.01`、`BLEND_RADIUS = 0.006`。
- spec 中每个带 `single-subject` 标记的阈值，都以**调用方可覆盖的具名默认值**导出，并由 dataclass
  记录实际使用的值。
- 模块从不打印。CLI（`if __name__ == "__main__"`）把 JSON 写到 stdout，门禁失败时以退出码 1 退出，
  与 `validate_rig_payload.py` 一致。

## 起承重作用的诚实性规则

- `classify` 返回**所有**匹配的标签（一个动画片段可以同时是 `in-place` + `planted` + `gesture`），
  外加一个主要运动类别。匹配为空时，它绝不凭空编造类别。
- 只要标签措辞暗示了意图，`name_clip` 就设置 `inferred: true`，并原样保留 `sourceName`。
- 任何因输入缺失而无法求值的门禁，都报告 `status: "unevaluated"` 并附原因。它绝不会静默地算作通过。
