# 快速上手

Mr. Mak 是一个本地桌面工作区，用于同时与多个代理协作。它的文件就是普通的项目
文件，它的对话就是普通的 CLI 会话。你也可以在应用之外继续使用这些代理。

**配置前必须准备：已安装并用你自己的账号配置好的 Codex CLI、Claude Code CLI 或
OpenCode。** 至少用其中一个来引导完成下面的配置。可选的语音协调器只支持 Codex；
Kimi 是另一个可用的终端集成。

## 选择文件夹

从 GitHub 模板创建仓库并克隆你的副本。所选文件夹必须包含 `workspace/workspace.json`。
起初请把应用源码和项目内容放在一起，这样配置和代理交接都更简单。模板中不含前任
所有者的项目、账号或对话历史。

## 安装桌面应用

在 Windows x64 上，使用 GitHub 发布版本中的安装程序。它内置 Node 运行时和本地服务，
并为当前 Windows 用户安装。如有需要，WebView2 会由其引导程序安装。日常使用应用
不需要管理员终端。

在克隆的文件夹中运行 **Start Mr. Mak.cmd**。应用会记住所选仓库。它以两个独立窗口
打开“工作区”和“对话”，各自在任务栏中有独立图标。关闭对话会将其保存到“历史”；
恢复完整对话还依赖该 CLI 的原生会话文件。

## 连接一个代理

按当前官方 Windows 说明至少安装一个必需的 CLI：

- [Codex CLI](https://developers.openai.com/codex/cli)
- [Claude Code](https://code.claude.com/docs/en/setup)
- [OpenCode](https://opencode.ai/docs/)

完成基础配置后，[Kimi Code CLI](https://moonshotai.github.io/kimi-cli/en/) 可作为
额外的终端集成使用。

用你自己的账号完成 CLI 的登录流程。在“对话”中点击 **+**，选择服务商并填写一个
描述性的标题。可以从 `Dream Game Plan` 这样的任务开始。选择该仓库作为工作文件夹。
默认启用常规的 CLI 权限流程；跳过权限确认需要针对每个对话单独、慎重地选择。

试试：“阅读‘我的梦想游戏’示例，把它改成我的游戏的小型项目计划。替换示例之前，
先问我缺少的游戏创意。”

## 订阅、API 密钥与 OpenCode

Claude Code 可以使用 Claude Pro 或 Max 登录。Codex 可以使用符合条件的 ChatGPT
订阅登录。这些对话无需在 Mr. Mak 中添加 API 密钥：它启动的是本机已安装的真实 CLI，
保留其常规认证和限额。参见 [Claude 认证](https://code.claude.com/docs/en/authentication)
和 [Codex 认证](https://developers.openai.com/codex/auth)。

使用 OpenCode 时，先按它自己的服务商配置完成安装和设置。确认 `opencode` 能在终端
中运行，然后在 Mr. Mak 中选择 **+ > OpenCode**。所选服务商决定认证和计费方式。
原生 Claude Code 订阅不会自动为第三方客户端提供访问权限。

OpenCode 对话支持历史、置顶标签页、文件和剪贴板截图。应用通过监听原生会话事件
来保持正确的对话 ID；你的原生 OpenCode 数据必须保留，才能恢复会话。每个 Mr. Mak
标签页只保留一个对话，新任务请用新标签页。OpenCode 自行控制模型和推理设置。
自动批准默认关闭；启用后，显式的拒绝规则仍然生效。

OpenCode 1.x 和 2.x 使用不同的插件 API。Mr. Mak 在启动时选择对应的轻量会话监听器，
不会写入全局配置。OpenCode 2.x 为每个终端运行一个私有服务器，因此各标签页的历史
相互独立。MCP 检查器目前列出 Claude、Codex、Kimi 和 Cursor 的配置；请使用
OpenCode 原生的 MCP 控件查看它自己的连接。

## 浏览示例

置顶的游戏卡片是一个项目中心。研究类卡片是一份附来源链接、便于阅读的报告。
开发类卡片包含本指南和自定义思路。图像生成类卡片展示 Arachne 的设计迭代和动作参考。
它们都标记为示例，因此不会被按时间自动归档。不再需要时可将其归档。归档只修改
元数据，不会删除其媒体文件。

用“文件”查看 `projects`、`inbox`、`knowledge`、`processes` 和技能文件夹。
Markdown 文件会以“预览”模式打开；切换到“编辑”并“保存”即可修改。
“帮助”按钮会打开一份快速指南，不会新建对话。

## 可选：语音

把 `.env.example` 复制为 `.env`，并填入你自己的 `OPENAI_API_KEY`，以启用 OpenAI
Live 连接。切勿提交该文件。为协调器登录 Codex。其模型沿用你的账号配置；可选的
`MRMAK_COORDINATOR_MODEL` 可覆盖它。模型访问权限取决于你的账号。

语音请求可以聚焦某个对话、查看报告、更新卡片，或把较大的任务交给一个执行代理。
直接操作保持快速；可见的执行代理负责交付物。推理强度默认最低为 medium；困难的工作
可使用 high 或 xhigh。max 需要明确要求。应用会先报告工具结果，再宣布操作完成。

CLI 账号计费与 OpenAI 语音 API 计费相互独立。浏览示例或使用已登录的 CLI 都不需要
API 生成。向终端进行可选的语音听写，参见 [语音听写](../../knowledge/voice-dictation.md)。

## 从源码构建

安装 [Node.js](https://nodejs.org/en/download)、Rust 的 MSVC 工具链以及
[Tauri 的 Windows 前置条件](https://v2.tauri.app/start/prerequisites/#windows)：
Microsoft C++ Build Tools 和 WebView2。本模板要求 Node.js 22.20+。

```powershell
powershell -ExecutionPolicy Bypass -File .\Setup.ps1 -Mode Check
powershell -ExecutionPolicy Bypass -File .\Setup.ps1 -Mode Desktop
```

Check 只报告前置条件。Desktop 安装项目依赖，并在 `src-tauri/target/release/bundle/nsis`
中构建安装程序。它不会替你安装或重启应用。代理应先准备好更新，再在通过安装或重启
打断进行中的对话之前征询你的同意。

仅预览报告的浏览器模式：

```powershell
powershell -ExecutionPolicy Bypass -File .\Setup.ps1 -Mode Preview
```

这会启动 Vite，并把 `public/workspace` 链接到真实的工作区文件夹。
它不会启动受管终端或语音服务。

## 在另一台电脑上

克隆你自己的仓库，安装应用，选择文件夹，并重新登录各个 CLI。在本地重建 `.env`。
内容通过 Git 同步；凭据、本地应用状态和原生 CLI 历史不会同步。新克隆的仓库无法
恢复那些原生历史只存在于上一台电脑上的对话。
