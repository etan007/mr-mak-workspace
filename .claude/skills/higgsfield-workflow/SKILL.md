---
name: higgsfield-workflow
description: 使用官方 Higgsfield CLI 或其 Blender 集成来发现模型、生成所需资产并恢复已记录的任务。
---

# Higgsfield 操作

从官方维护的来源安装 CLI 和厂商技能。使用接收方自己的账号。CLI 与 Blender 原生
集成的执行环境不同；保留任务选定的可用路径。

只读发现：

```text
higgsfield --version
higgsfield model list --json
higgsfield model get <job-type> --json
higgsfield workflow list --json
higgsfield generate get <job-id> --json
```

创建任务前，检查确切模型的输入/媒体 schema。显示名称、fal 端点和 Higgsfield
job type 是不同的标识符。模型 ID 和支持的参数可能变化；以当前 CLI 帮助和目录为准。
不要用技能里的历史默认值替换用户选定的提供方或模型。

需要生成时，使用当前的 `generate create` 语法，带上选定的 job type 和必填输入。
立即保存返回的 job ID。用 `generate get` 或 `generate wait` 恢复缓慢的任务；等待
超时不是重新提交的理由。重试前检查终态错误。预估额度与实际计费分开记录。

下载输出并检查。使用 Blender 集成时，要验证资产已导入且场景已保存，而不仅是远程
任务已完成。不要重放可能提交任务或依赖旧检查点的编号项目脚本，它们不一定能安全地
运行两次。

示例：根据提供的参考请求一个道具，保存其 job ID，下载模型，并在一个可丢弃的
Blender 场景中验证材质。不要仅凭网格生成成功就宣称结果已绑定或可直接用于游戏。

依赖：[官方 CLI](https://github.com/higgsfield-ai/cli)、
[厂商技能](https://github.com/higgsfield-ai/skills)、一个账号，以及仅在使用该路径时
需要的 Blender 配套组件。厂商工具不复制到此处。
