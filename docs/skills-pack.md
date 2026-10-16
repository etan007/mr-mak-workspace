# Mr. Mak 代理技能

本技能包包含 20 个面向 Codex CLI 和 Claude Code 的项目本地工作流。
无需安装 Mr. Mak 桌面应用，即可在游戏或创意项目中使用。请先登录其中至少一个 CLI。

完整索引见 `docs/skills.md`。六个新的游戏工作流涵盖
特效（VFX）、UI、动画集成、关卡、音频和原生画面审查。已有技能涵盖
规划、交接、图像/3D 制作、Blender 动画、视频检查、工作区报告和本地语音听写设置。

## 向项目添加选定的技能

1. 把 ZIP 解压到临时文件夹。项目文件保持原位不动。
2. 让你的代理查看索引，挑选对本项目有用的技能。Codex 从 `.agents/skills/`、
   Claude 从 `.claude/skills/` 复制每个完整文件夹。两种代理都用则两边都复制。
3. 合并下表列出的必需支持文件。保留你自己的指令、改过的技能和报告样式。
   不要替换 `AGENTS.md`、`CLAUDE.md`、上下文、MCP 配置或现有工作区卡片。
4. 如果新添加的技能没有列出，请在项目中开启新的 CLI 会话。
   让代理先阅读所选的 `SKILL.md` 并检查你的实际项目，再进行修改。

请求示例：

> 阅读 game-vfx-workflow 技能，检查我们当前的战斗事件和游戏镜头，
> 准备一个小型护盾受击效果方案。保持玩法不变。
> 展示所选图层、挂载点、取消规则和原生审查计划。

## 支持文件

| 技能 | 额外文件或工具 |
| --- | --- |
| 六个游戏工作流、Blender 动画、动作参考 | 保留技能自带的参考资料。实现时需要项目的源资产和可用的引擎/编辑器连接。 |
| 图像与生成工作流 | 保留所引用的同级提供方技能。自行配置可选的提供方，并阅读其当前能力说明。 |
| img2threejs | 复制整个文件夹，包括代码、资源和 Apache-2.0 许可证。可选的上游集成需另行处理。 |
| workspace-authoring | `processes/workspace-authoring.md` 和 `workspace/_shared/{report.css,report.js,examples.css}`。如有需要，与你自己的样式合并。报告查看器/应用需单独获取。 |
| video-watch | `knowledge/video-watch.md`、`scripts/video-watch/` 和共享报告资源。在本地虚拟环境中安装可选的 Python 依赖。 |
| voice-dictation-setup | `knowledge/voice-dictation.md`。语音听写应用及其模型需单独安装。 |
| 制作路线选择 | 从索引中挑选并复制相关的同级技能；路线名称本身不会安装对应工作流。 |

安装技能包不需要任何生成操作。工具、账号、API 访问、
Blender 和 Unity 均未捆绑。运行辅助脚本前请先查看依赖要求。
如需离线做首次检查，可检查一个提供的本地资源并准备方案，
不提交付费任务。

## 包含内容

完整的 Codex 和 Claude 技能副本、上述支持文件、许可证声明，
以及包含每个载荷文件 SHA-256 校验和的 `manifest.json`。不含
私有项目、原始游戏资源、对话、凭据或任务回执。
该技能包不会更改全局代理设置。

应用和示例项目可在
[Mr. Mak Workspace](https://github.com/witnesstodark/mr-mak-workspace) 单独获取。
