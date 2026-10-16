# 项目技能

本项目包含二十个技能。`.agents/skills` 是供 Codex 使用的维护源；`.claude/skills`
包含供 Claude Code 使用的完整、一致的副本，包括脚本和参考资料。两处的技能部分都会
打开完整说明。这些是本地项目文件，不是全局安装。

Claude 使用某个技能时读取其自身 `SKILL.md` 中的说明；Markdown 链接只是请求读取
另一个文件，不会自动继承。模板包含完整文件夹，因此普通的 Windows 克隆不需要符号
链接。参见 [Claude 的技能格式](https://code.claude.com/docs/en/skills)。

共享改动请编辑 `.agents/skills`，然后运行 `npm run skills:sync`。如果你直接编辑了
Claude 副本，先把预期的改动移到维护源中。`npm run test:template` 会检查两份副本
是否一致。

| 技能 | 用途 |
| --- | --- |
| [3d-production-routing](../.agents/skills/3d-production-routing/SKILL.md) | 为 3D 概念、生成网格、材质贴图、程序化 Three.js 重建和游戏动画选择实用的工作流。 |
| [blender-game-animation](../.agents/skills/blender-game-animation/SKILL.md) | 在 Blender 中为提供的角色做绑定和动画，依据参考修改动作，交付可编辑源文件和经过验证的游戏导出。 |
| [character-sheet-pipeline](../.agents/skills/character-sheet-pipeline/SKILL.md) | 从已认可的图片制作严格正视的角色设定图、拆分部件和可选的多视图参考，用于 3D 建模。 |
| [fal-ai-generation](../.agents/skills/fal-ai-generation/SKILL.md) | 通过 fal.ai MCP 或 Python 队列客户端生成和编辑图片，创建视频、音频、3D 资产或材质贴图。用于 fal 模型发现、参考上传、生成、任务恢复和本地交付。 |
| [feature-handoff](../.agents/skills/feature-handoff/SKILL.md) | 为实现功能、继续任务或审查已完成改动的代理或开发者准备精确的交接。 |
| [game-animation-integration](../.agents/skills/game-animation-integration/SKILL.md) | 把已认可的动画接入游戏，包括动画片段映射、转身退出、移动相位和玩法事件时机。 |
| [game-audio-workflow](../.agents/skills/game-audio-workflow/SKILL.md) | 试听、挑选并集成声音，使用稳定的资产 ID、接触事件、混音规则和原生试听检查。 |
| [game-level-design](../.agents/skills/game-level-design/SKILL.md) | 制作可审查的关卡草稿，验证比例和通行，并把已接受的改动应用到实际场景。 |
| [game-ui-workflow](../.agents/skills/game-ui-workflow/SKILL.md) | 把 HUD 或菜单从视觉研究推进到实时游戏数据、输入行为和原生审查。 |
| [game-vfx-workflow](../.agents/skills/game-vfx-workflow/SKILL.md) | 开发特效层、事件时机、挂点、清理和游戏内视觉对比。 |
| [gameplay-visual-review](../.agents/skills/gameplay-visual-review/SKILL.md) | 用受控的原生截取验证游戏改动，并把实现、视觉审查和验收分开。 |
| [higgsfield-workflow](../.agents/skills/higgsfield-workflow/SKILL.md) | 使用官方 Higgsfield CLI 或其 Blender 集成来发现模型、生成所需资产并恢复已记录的任务。 |
| [image-reference-workflow](../.agents/skills/image-reference-workflow/SKILL.md) | 为 3D 或创意生产探索图像概念，并对已接受的参考做忠实修改，明确模型选择并做视觉审查。 |
| [img2threejs](../.agents/skills/img2threejs/SKILL.md) | 把物体或角色参考图转换为经过质量门禁、可用于动画、用代码构建的程序化 Three.js 模型。用于图像转 3D 重建、细节精确的物体重建、风格化/最大化相似度的人物角色、雕刻规格和分阶段代码生成。 |
| [materials-to-game](../.agents/skills/materials-to-game/SKILL.md) | 创建或应用材质贴图，把带纹理的高模烘焙到游戏网格上，并检查通道、UV 和导出。 |
| [motion-reference-workflow](../.agents/skills/motion-reference-workflow/SKILL.md) | 准备和挑选角色动作参考，或把已认可的动作迁移到真人参考上，供后续动捕流程使用。 |
| [plan](../.agents/skills/plan/SKILL.md) | 把宽泛的项目请求变成一份小而可执行的计划，包含具体交付物、依赖和验收检查。 |
| [video-watch](../.agents/skills/video-watch/SKILL.md) | 通过场景采样帧、时间戳和可视化报告检查本地或公开可访问的视频，尤其用于动作和 3D 参考分析。 |
| [voice-dictation-setup](../.agents/skills/voice-dictation-setup/SKILL.md) | 帮助配置可选的本地 Whisper 听写，输入到终端和其他应用，并检查语言、快捷键以及 CPU 或 GPU。 |
| [workspace-authoring](../.agents/skills/workspace-authoring/SKILL.md) | 创建或维护工作区卡片、报告标签页和 Markdown 交付物，保持样式一致、媒体预览可用、项目组织清晰。 |

## 0.4.14 中的游戏生产

六个新的游戏工作流把概念工作和实现连接起来。它们说明如何检查现有项目、保留已
接受的工作、交接确切的事件标记，以及在引擎中审查结果。其中不包含私有游戏资产、
角色名、固定的平衡数值或个人工作偏好。示例仅作说明；接收项目自身的规则具有最终
效力。

Blender 动画现已涵盖多个 Action 所有者、slot、绑定基准检查和可移植的动画片段导出。
动作参考保留稳定的拍摄记录表，并把外观迁移与动捕分开。交接把选定方案、实现、
代理验证和用户验收分开。路由技能帮助代理在这些工作流之间做选择。

这些是给代理的说明，不是附带的编辑器集成。使用你现有的 Unity 或 Blender 连接，
并检查其可用操作。生成是可选的。技能本身不会安装引擎、连接 MCP 服务器或执行
付费工作。

## 在其他项目中使用技能

发布版本包含单独的 **Mr-Mak-Skills-0.4.14.zip**。解压到临时文件夹，然后让代理阅读
`SKILLS-README.md`，只把选中的模块及其依赖复制到你的项目中。保留完整的技能文件夹，
包括脚本、参考资料和许可证。ZIP 包含完整的 Codex 和 Claude 副本；不需要全局安装或
符号链接。

八个原有创意模块和六个新的游戏工作流可以连同各自的本地资源一起复制。选择使用某个
被引用的同级技能时，一并保留它。保留完整的 img2threejs 文件夹及其许可证。

工作区撰写、视频检查和听写配置还引用了本仓库的流程、知识和脚本。提取模块时一并
复制这些被引用的文件；ZIP 包含这些支持文件和共享报告资源。把它们合并到现有项目中，
而不是替换其说明、报告或共享样式。规划和交接技能使用接收项目的约定。独立技能包
不包含工作区卡片或应用。

技能不会为提供方完成认证，也不会安装工具。按其配置参考操作，并使用你自己的账号。
凭据和原始付费任务回执必须放在共享技能包之外。

对于已安装的 Mr. Mak，参见
[更新指南](https://github.com/witnesstodark/mr-mak-workspace/blob/main/docs/updating.md)。
只安装桌面更新不会把新技能放进你的仓库。
