# 为 img2threejs 做贡献

感谢关注。img2threejs 把一张参考图转换为纯代码、程序化、经过质量门禁的 Three.js 模型。
欢迎任何能让这一定位更鲜明的贡献。

## 适合入手的方向

- 在 `grimoire/build/geometry_patterns.md` 中新增程序化材质或几何配方。
- 物体领域模板与细节清单（detail-inventory）分类体系的改进。
- `forge/stage3_build/generate_threejs_factory.py` 中的生成器基元、倒角、实例化与表面色带调优。
- 在 `forge/tests/test_pipeline.py` 中补充更多流水线测试。
- 文档与完整示例。

## 项目的强项与如实说明的局限

- 强项：硬表面物体、道具、风格化/低多边形资产。
- 仅限风格化：角色与生物呈现为游戏/手办风格的化身，而非照片级相似度。
- 目前不在范围内：从单张图片对特定人物、动物或风景做照片级重建。那需要照片纹理投影或 ML
  图像转 3D，会打破纯代码的承诺。分析与分级路线图见 `docs/UPGRADE_PLAN.md`。

请不要添加静默下载网格或美术资源包的代码——核心承诺是用代码完成重建。如果你需要投影或生成式
辅助路径，请将其作为显式、带标志、需主动开启的模式来提议。`integrations/glb_character_pipeline/`
就是这样一种模式：一条以 GLB 为基线的角色重建流水线（SDF 点云 splat + Surface Nets），通过
`IMG2THREEJS_SHOWCASE_ROOT` 在配套 showcase checkout 上运行，并以自己的 `pyproject.toml`/`uv.lock`
和 `node/package.json` 隔离，使 `forge` 核心保持零依赖。它只在角色构建确实有可供测量的 GLB 参考时
适用——否则完全跳过。详见其 `README.md`。

## 开发

- `forge/` 下的脚本只使用纯 Python 3.10+ 标准库，那里不引入 pip 依赖。`integrations/<name>/` 下的
  可选集成可以在各自的 `pyproject.toml`/`package.json` 中声明自己的 pip/npm 依赖，与核心隔离。
- 在技能根目录运行测试套件：`python3 -m unittest discover -s forge/tests -p 'test_*.py'`。
  将 `IMG2THREEJS_SHOWCASE_ROOT` 设为一个 showcase checkout 可纳入 TypeScript 类型检查门禁；
  未设置时它们会跳过，因此全绿的运行并不能证明生成的 Three.js 可以编译。
- 生成前先校验 spec：`python3 forge/stage2_spec/validate_sculpt_spec.py spec.json --strict-quality`。
- 保持变更向后兼容：现有物体 spec 必须继续通过校验。
- 源码、文档和生成输出中不使用 emoji。

## 提交 issue 之前

- 先搜索已有 issue。
- 报告 bug 时，请附上参考图的特征、确切命令、相关 spec 或生成输出、预期与实际行为，必要时附上
  渲染截图。不要发布私人图片、凭据或其他敏感材料。
- 提出建议时，请描述问题、可观察的结果，以及它如何维持本项目"纯代码程序化重建"的约定。
- 有讨论区或其他合适论坛时，使用问题请发到那里；issue 应当是可处理的 bug 或聚焦的提议。

## 分诊与贡献者意向

- issue 本身就是分诊讨论记录。`triage: needs-review` 标签表示该 issue 正在等待维护者评审；
  标签并不承诺一定会实现。
- 维护者在设置优先级、贡献者状态或关闭之前，会先记录一条决定评论。`priority: low` 会让 issue
  保持打开，且必须附带理由和重新评估的触发条件。
- 想提供修复，请使用 **Contribution intent** 表单。它记录你提议的范围，但不会预留或分配该工作。
  维护者会讨论，并在合适时把目标 issue 标记为 `contribution: claimed`。
- 用 `Refs #<number>` 或 `Related to #<number>` 关联实现 PR。不要使用关闭关键字。维护者只会在
  最终评论中记录已合并的 PR、验证情况和关闭理由之后，才手动关闭 issue。

## Pull request

- 保持 PR 聚焦，描述行为变化以及你是如何验证的。
- 为新的门禁、schema 字段或模板新增或更新测试。
- 落地路线图条目时，更新 `docs/UPGRADE_PLAN.md` 中的状态。
- 适用时用 `Refs #<number>` 关联 issue。
- 对影响视觉保真度的变更，附上相关渲染图或对比图证据及其评审结果。
- 不要在 PR 描述、提交或附件中包含私人参考图、凭据或其他敏感材料。

## 报告问题

请附上参考图的特征、你运行的命令、spec 或生成输出，以及预期与实际得到的结果。渲染截图
非常有帮助。
