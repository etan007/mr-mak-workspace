# 实验 1——把三个 intake 步骤写成插件行

分支 `lab/pipeline-as-data`，`img2threejs` 在 v1.5.1（`dede590`）时的 worktree。
受测 harness：`img2` v0.2.0，契约修订版 14。
在一个一次性的 `$HOME` 中运行；没有向真实的技能目录安装任何东西。

## 做了什么

`plugin.json`（`name: img2threejs-lab`，能力 `image → threejs-code-lab`——一条刻意设计的
非产品边，确保它永远不会与真实技能争抢）加上 `steps.json`，后者承载了
`forge/_shared/workflow_state.py` 中前三行 `SETUP_STEPS`，**命令逐字复制**：

| id | 产品中目前实际存在的命令 |
|---|---|
| `image-analysis` | `Read grimoire/intake/image_analysis.md and analyze {reference}` |
| `reference-suitability` | `Read grimoire/intake/validation_rubric.md and record a pass, conditional, or reject verdict for {reference}` |
| `reference-admission` | `python3 forge/stage1_intake/check_reference_admission.py {reference}` |

没有为了让它通过而做任何改动。目的是看 harness 会拒绝什么。

## 发现 1——符合预测：占位符集合拒绝了每一行

`img2 doctor` → **3 个 FAIL，exit 1**，每行一个：

```
FAIL img2threejs-lab steps.json "image-analysis": command uses unrecognised
     placeholder {reference}; only {plugin_dir}, {workspace} and {image} are permitted
```

正确且响亮。这是防护在起作用。解决它是一个策略决定，而不是新增字段：
要么放宽封闭集合（削弱一个三天前才发布的检查），要么在流水线的步骤数据中把 `{reference}`
统一改名为 `{image}`。

## 发现 2——未被预测，而且是 harness 的缺陷，不是流水线的

在**同一**安装上、在 `doctor` 正让三行全部失败的同一时刻，运行
`img2 capabilities --from-kind image --to-kind threejs-code-lab --json`：

```json
{ "status": "answered", "problems": [],
  "providers": [ { "steps": [
    { "id": "image-analysis",
      "argv": ["Read", "grimoire/intake/image_analysis.md", "and", "analyze", "{reference}"] } … ] } ] }
```

**exit 0。`status: "answered"`。`problems: []`。**

也就是说，这个查询交给调用方一个 `argv[0]` 为 `Read` 的 argv，里面还留着未替换的 `{reference}`，
却完全不报告任何问题。契约要求调用方依据 `status` 分支、绝不依据 stderr——严格照做的调用方
就会执行它。

而且在 macOS 上它甚至不会响亮地失败。文件系统不区分大小写，所以 `Read` 会解析到一个真实的
二进制文件：

```
$ python3 -c "import shutil; print(shutil.which('Read'))"
/usr/bin/Read                     # i.e. /usr/bin/read
$ Read grimoire/intake/image_analysis.md and analyze '{reference}'
/usr/bin/Read: line 4: read: `grimoire/...': not a valid identifier
$ echo $?
0
```

**Exit 0。** 调用方会断定该步骤成功。在一个第一原则是"响亮失败，不允许静默的部分激活"的系统里，
这是一条静默的错误成功路径——而且在 v0.2.0 上，任何 `steps.json` 被 doctor 拒绝的插件今天就能
触达它。

根因：`img2 doctor` 与 `img2 capabilities` 采用了不同的校验。doctor 运行
`commandFinding`；查询则不参考它。评审者 C 在评审期间恰好指出了这一缺口
（"argv[0] resolvability … belongs in problems[] rather than as a runtime surprise"），但没有被
实现——当时记录为缺失的需求，现在被证实为一个现存缺陷。

**必需的修复，在 harness 中，且在任何调用方消费该查询之前完成：** `cmdCapabilities` MUST 对它
即将返回的每一行运行与 doctor 相同的静态检查，未通过检查的行应放入 `problems[]`——绝不放入
`providers[]`。如果被查询的边已没有干净的提供者，状态应为 `data-fault`，而不是 `answered`。

## 发现 3——字段数量的实测

在这三行上，预测的四个字段中只有两个是真正被迫需要的：

| 预测字段 | 这 3 行是否迫使需要？ | 证据 |
|---|---|---|
| `actor: agent \| tool` | **是** | 3 行中有 2 行是给模型的指令，不是程序。没有它，harness 无法知道不应 exec 它们。 |
| `mustRead: [paths]` | **是** | `grimoire/intake/image_analysis.md` 正是这些行的实际负载；没有别的东西能承载它。 |
| `when` / `profiles` | 暂未 | CS2/角色的拼接位于后面的步骤（`workflow_state.py:110-118`）。 |
| `config` | 暂未 | 阈值出现在评审/构建步骤中，不在 intake 中。 |

所以诚实的得分是 **3 行迫使出 2 个字段，待 CS2/角色拼接和携带阈值的评审步骤被转换后，预计还有
2 个**——即对全部 27 行而言，四字段的估计看起来是对的，并没有高估。

## 决策门禁

门禁是：0-1 个新字段 → 增量推进；4 个字段全部需要外加 harness 改动 → 答案是"暂不"。实测结果是
**在 27 行中最容易的 3 行上就迫使出 2 个字段、一项占位符策略变更，以及一个无论如何都必须修复的
harness 缺陷**。这落在门禁的"暂不"一侧。

由此指向的顺序：
1. **现在就在 harness 中修复发现 2**，与上述其他事项无关。它是已发布版本中一条现存的静默成功
   路径，不需要任何 schema 决定，而且改动很小：在查询中复用 doctor 的检查。
2. 然后走捷径——基础技能查询 `img2 capabilities`，`plugin-img2glb` 获得一个离线步骤——这既交付了
   最初的需求，也产生了该查询的第一个真实消费者。
3. 之后才设计行 schema，此时 `actor`/`mustRead` 已是实测而非猜测，`when`/`config` 则通过转换一个
   CS2 步骤和一个携带阈值的评审步骤来确认。

## 本实验没有测试的内容

流水线是否仍能产出良好的几何。这些只是结构性检查。没有运行重建、没有截取渲染、没有记录基线——
这笔欠账没有变化。
