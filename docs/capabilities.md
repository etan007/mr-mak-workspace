# Mr. Mak Workspace 能力全景

本文汇总当前版本（0.5.1）实际提供的能力，按模块列出，并注明前提条件和边界。细节以各
专题文档为准。

## 产品定位

Mr. Mak Workspace 是一个本地桌面工作区模板：用真实的 CLI 代理（Codex、Claude Code、
Antigravity、OpenCode、Kimi）干活，用可视化工作区查看成果，并可从手机跟进。

- **不是**代理本身：不附带任何 CLI、模型或账号，沿用你已登录的 CLI 订阅或 API。
- **不是** IDE：不提供代码编辑器，代码修改由代理在终端里完成。
- **仓库即上下文**：项目、知识、工作流、技能和报告都是仓库里的文件，可随 Git 管理和分享。

## 桌面应用

Tauri 2 外壳包裹两个窗口（对话、工作区），共用一个只监听回环地址的本地 Node 服务。
两个窗口共享会话和设置，可独立最小化。

| 能力 | 说明 |
| --- | --- |
| 对话窗口 / 多 CLI 代理 | 每个对话是一个真实 PTY 终端（xterm.js），用 **+** 新建 Codex、Claude Code、Antigravity（`agy`）、OpenCode 或 Kimi 对话。新的 Codex/Claude 对话默认 `xhigh` 推理强度；OpenCode 使用自己的模型与推理配置。 |
| 终端 | Ctrl+C 复制选中文字；网页链接和 OSC 8 链接用默认浏览器打开；全屏 Claude 鼠标滚轮可用。终端外观可选 Original CLI colors（默认）或 Mr. Mak Focus。 |
| 历史 | 关闭标签页即归档到历史，不删除原生 CLI 对话；可按名称、代理、文件夹搜索并恢复。应用重启时自动恢复上次打开的标签页。 |
| 标签页 | 置顶、重排、着色；显示哪些代理正在工作、哪些有未查看的回复。 |
| 附件 | 拖入文件/文件夹插入路径；剪贴板图片保存到 `inbox/attachments`。 |
| 文件浏览 | 右侧文件栏提供“主要文件夹 / 全部文件”两种树视图，可快速跳转到 `inbox`、`projects`、`workspace`、`knowledge`、`processes`；支持拖拽移动、复制进来、删除到回收站、在资源管理器中打开；可预览图片、视频、音频。 |
| Markdown 编辑 | Markdown 以排版后的文档打开，可切换到“编辑”并在同一窗口保存。 |
| 主题 | 设置 > 外观：深色（默认）/ 浅色 / 跟随系统，作用于导航、预览、Markdown 和标准报告。图片保留原色。 |
| 卡片管理 | 工作区以卡片组织项目，卡片内用标签页放报告、提示词、图片和视频。点状态圆点可改状态或分类、置顶、归档；可从搜索或“显示归档”恢复。注册表为 `workspace/workspace.json`。 |
| 报告 | HTML 报告使用共享样式（`data-mak-report="document"`），图片可原尺寸打开并下载；另有并排 3D 模型对比视图（Three.js）。 |
| MCP 面板 | 显示哪些 MCP 连接来自本项目（`.mcp.json`、`.codex/config.toml`），哪些来自代理的全局配置。模板中 MCP 配置为空。 |
| 设置 | 外观、终端文字与外观、语音转文字提供方、语音偏好、可选 Win 键快捷方式、跳过权限确认默认值等。 |
| 帮助 | 右侧栏打开内置帮助页（`workspace/_shared/`）。 |

## 手机访问

| 能力 | 说明 |
| --- | --- |
| 连接方式 | 手机通过 **Tailscale** 访问电脑上的 Mr. Mak；电脑需保持唤醒并运行应用。代理始终在电脑上运行。 |
| 配对 | 在对话窗口点手机按钮启用手机访问，扫描二维码，并在桌面确认匹配码。配对一次后可重复使用同一主屏幕快捷方式（PWA）。 |
| 对话 | 查看对话列表和回复，发送追问和图片；手机与桌面可显示不同对话。Antigravity 在手机上目前只有终端视图。 |
| 报告 | 打开工作区报告并回到保存的位置；放大图片、播放视频。 |
| 听写 | 点麦克风录音、停止后转写，确认后再发送。 |
| 朗读 | 可选的免费本地语音（Michael 美式男声、Emma 英式女声）朗读回复；需在电脑上运行一次 `scripts/setup-local-read-aloud.ps1`。 |

详见 [手机访问](mobile-access.md)。

## 语音

| 能力 | 提供方 | 费用与前提 |
| --- | --- | --- |
| 听写（语音转文字） | 本地 Whisper（faster-whisper，默认） | 免费；需运行一次 `scripts/setup-local-dictation.ps1` 安装 Python 环境和模型。 |
| 听写（语音转文字） | OpenRouter 或 OpenAI 转写 | 单独计费，需在 `.env` 中配置 API key。 |
| 朗读 | 本地语音模型 | 免费，无需云端 key。 |
| 语音协调器 | OpenAI Live（语音）+ 已登录的 Codex CLI（编排） | 需 Codex CLI 和你自己的 OpenAI API key，按 API 用量计费。默认关闭。 |

听写可用于桌面对话、Mak 输入框和已配对手机；提供方（免费/付费/关闭）在手机设置或
设置 → 语音转文字 中选择，并在桌面与手机间共享。语音协调器（悬浮小鼻子）能列出和搜索
对话、读取终端、打开或复用 worker 对话、管理卡片状态和语音偏好；较大的任务交给可见的
worker 终端执行。协调器模型可通过 `MRMAK_COORDINATOR_MODEL` 指定。

## 项目适配器

本地服务内置项目适配器注册表，用于识别对话工作目录所属的项目类型，通过
`/api/projects` 和 `/api/projects/capabilities` 提供。当前桌面 UI 尚未直接展示这些信息。

| 适配器 | 识别方式 | 提供内容 |
| --- | --- | --- |
| `godot` | 找到 `project.godot` | 项目名、主场景、相关文件（场景、脚本、资源、图片、glTF/GLB）、“打开 Godot 编辑器”和“运行 Godot 项目”命令 |
| `generic` | 任意本地目录（兜底） | 项目根目录 |

## 资产交付校验工具

`scripts/asset-delivery/` 是可选的离线 CLI：为卡片的输入/输出文件生成 SHA-256 清单
（`build`），之后校验文件是否缺失或被改动（`verify`）。只证明文件完整性，不代表视觉
认可或引擎就绪；清单无签名。详见 [资产交付凭证](../scripts/asset-delivery/README.md)。

## 技能（20 个）

技能维护源在 `.agents/skills`，`.claude/skills` 为完整副本，由 `npm run skills:sync`
同步。完整列表见 [项目技能](skills.md)。

| 类别 | 技能 | 一句话说明 |
| --- | --- | --- |
| 规划与协作 | `plan` | 把宽泛请求变成带交付物、依赖和验收检查的小计划。 |
| | `feature-handoff` | 为实现、续做或审查准备精确的交接。 |
| | `workspace-authoring` | 创建和维护工作区卡片、报告标签页和 Markdown 交付物。 |
| 图像与生成 | `image-reference-workflow` | 探索图像概念，忠实修改已接受的参考图。 |
| | `fal-ai-generation` | 通过 fal.ai 生成/编辑图片、视频、音频、3D 资产和材质贴图。 |
| | `higgsfield-workflow` | 用 Higgsfield CLI 或其 Blender 集成生成资产并恢复任务。 |
| | `character-sheet-pipeline` | 从认可的图片制作严格正视角色设定图、拆分部件和多视图参考。 |
| 3D 与材质 | `3d-production-routing` | 为 3D、动画、特效、UI、关卡、音频等选择合适的工作流。 |
| | `img2threejs` | 把参考图重建为带质量门禁、可动画的程序化 Three.js 模型。 |
| | `materials-to-game` | 创建/应用材质贴图，把高模烘焙到游戏网格并检查通道、UV 和导出。 |
| 动画与动作 | `blender-game-animation` | 在 Blender 中绑定和制作角色动画，交付可编辑源和游戏导出。 |
| | `motion-reference-workflow` | 准备和挑选动作参考，或把动作迁移到真人参考供后续动捕。 |
| | `game-animation-integration` | 把动画片段接入游戏移动与战斗系统，处理转身、步态相位和事件时机。 |
| | `video-watch` | 用采样帧、时间戳和报告检查视频，用于动作和 3D 参考分析。 |
| 游戏生产 | `game-vfx-workflow` | 从视觉参考到引擎交接开发特效（VFX）。 |
| | `game-ui-workflow` | 设计并实现 HUD、菜单、图标和头像系统。 |
| | `game-level-design` | 把关卡需求变成可审查的空间方案，再应用到场景并检查。 |
| | `game-audio-workflow` | 构建和审查音效库，映射到真实事件并检查运行时播放。 |
| | `gameplay-visual-review` | 用受控的原生截取和证据记录验证游戏视觉改动。 |
| 工具配置 | `voice-dictation-setup` | 配置可选的本地 Whisper 听写到终端和其他应用。 |

技能是给代理的说明，不会自行安装引擎、连接 MCP 或执行付费工作。发布版本另附可单独
使用的技能 ZIP（见 [技能包](skills-pack.md)）。

## 构建与测试

| 命令 | 作用 |
| --- | --- |
| `Setup.ps1 -Mode Check` | Windows：检查 Node、Rust 和代理 CLI 等前置条件。 |
| `Setup.ps1 -Mode Preview` | 在浏览器中预览报告（只需 Node.js 22.20+ 和 npm）。 |
| `Setup.ps1 -Mode Desktop` | 从源码构建桌面应用。 |
| `Setup.ps1 -Mode Update` | 构建、安装并重启（需在 Mr. Mak 之外的 PowerShell 窗口运行）。 |
| `./setup.sh [check\|preview\|desktop]` | macOS / Linux 对应脚本。 |
| `npm run dev` / `npm run build` | Vite 开发服务器 / TypeScript 检查加前端构建。 |
| `npm run lint` | ESLint 检查 `src`。 |
| `npm test` | 本地服务单元测试（`desktop/service/test/*.test.mjs`）。 |
| `npm run desktop:test:ui` | 桌面、链接、滚动、历史、主题、语音、听写、手机和编辑的 UI 测试（隔离仓库 + 模拟终端）。 |
| `npm run test:template` | 模板检查：示例卡片、媒体引用、技能副本一致、安全默认值、资产交付测试。 |
| `npm run test:preview` | 浏览器 Preview 检查。 |
| `npm run desktop:build` / `desktop:build:appimage` | 构建 Tauri 应用和安装程序 / Linux AppImage。 |
| `npm run skills:sync` / `skills:pack` | 同步技能副本 / 打包技能 ZIP。 |

## 平台支持

| 平台 | 状态 |
| --- | --- |
| Windows x64 | 主要平台；提供安装程序（发布版本）和源码构建。 |
| Linux | 源码构建（需 Node、Rust、WebKitGTK），可打包 AppImage/deb。 |
| macOS | 源码构建（`./setup.sh desktop`），已在 Apple Silicon 上验证；应用未签名，见 [macOS 说明](macos.md)。 |
| 手机 | 通过 Tailscale 访问的移动 Web 应用，可添加到主屏幕。 |

部分功能仅限 Windows，例如 Win 键快捷方式、任务栏标识和资源管理器/回收站集成。

## 安全默认值

- 跳过权限确认默认关闭；Win 键快捷方式默认关闭；语音协调器、付费提供方和 MCP 连接默认不启用。
- 本地服务只监听回环地址，不应通过公共代理或隧道暴露；手机访问只经 Tailscale。
- `.mcp.json` 为空，`.env.example` 只有变量名没有值；`npm run test:template` 会校验这些默认值。
- `.env`、登录信息、对话记录、运行时状态（`.mrmak/`）和任务回执不进入 Git。
- 协调器把终端输出和检索到的文档视为参考数据，不视为授权。

另见 [安全报告](../SECURITY.md)。
