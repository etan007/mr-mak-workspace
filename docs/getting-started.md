# 快速开始

Mr. Mak 是一个用于协同多个代理工作的本地桌面工作区。它的文件就是普通的项目文件，
它的对话就是普通的 CLI 会话。你可以在应用之外继续使用同样的代理。

**配置前必需：已安装 Codex CLI、Claude Code CLI 或 OpenCode，并用你自己的账号
完成配置。** 至少用其中一个来引导下面的配置。可选的语音协调器必须使用 Codex；
Kimi 是另一个可用的终端集成。

## 选择文件夹

用 GitHub 模板创建仓库，并克隆你自己的副本。所选文件夹必须包含
`workspace/workspace.json`。起初请将应用源码和项目内容放在一起；这样配置和
代理交接都更简单。模板中不含前任所有者的项目、账号或对话历史。

## 安装桌面应用

在 Windows x64 上，使用 GitHub Releases（发布版本）中的安装程序。它内置 Node
运行时和本地服务，并为当前 Windows 用户安装。如有需要，其引导程序会安装 WebView2。
日常使用应用不需要管理员终端。

在克隆的文件夹中运行 **Start Mr. Mak.cmd**。应用会记住所选仓库。
它会以两个独立窗口打开工作区和对话，在任务栏中也是两个独立项。关闭对话会将其
保存到历史；恢复完整对话还依赖该 CLI 的原生会话文件。

## 连接一个代理

按各 CLI 当前的 Windows 官方说明，至少安装一个必需的 CLI：

- [Codex CLI](https://developers.openai.com/codex/cli)
- [Claude Code](https://code.claude.com/docs/en/setup)
- [OpenCode](https://opencode.ai/docs/)

[Kimi Code CLI](https://moonshotai.github.io/kimi-cli/en/) 可在基础配置完成后作为
额外的终端集成使用。

用你自己的账号完成 CLI 的登录流程。在对话窗口中按 **+**，选择服务商并填写一个
描述性的英文标题。可以从 `Dream Game Plan` 这样的任务开始。将仓库选为工作文件夹。
默认启用 CLI 的常规权限确认流程；跳过权限确认需要在每个对话中单独主动选择。

新建的 Codex 和 Claude 对话默认使用 `xhigh` 推理强度。已保存的推理强度选择
保留在已有对话中。终端输出中的网页链接点击即可在默认浏览器中打开。

可以试试：“阅读‘我的梦想游戏’示例，把它改写成我这款游戏的小型项目计划。
在替换示例之前，先问我缺少的游戏创意。”

## 订阅、API key 与 OpenCode

Claude Code 可以使用 Claude Pro 或 Max 登录。Codex 可以使用符合条件的 ChatGPT
订阅登录。这些对话无需在 Mr. Mak 中添加 API key：它启动的是真实安装的 CLI，
沿用其常规认证和额度限制。参见 [Claude 认证](https://code.claude.com/docs/en/authentication) 和
[Codex 认证](https://developers.openai.com/codex/auth)。

对于 OpenCode，请先按其自身的服务商配置完成安装和配置。确认 `opencode`
能在终端中运行，然后在 Mr. Mak 中选择 **+ > OpenCode**。认证和计费由你选择的
服务商决定。原生 Claude Code 订阅不会自动授权第三方客户端访问。

OpenCode 对话支持历史、置顶标签页、文件和剪贴板截图。应用通过监听原生会话事件
来保持正确的对话 ID；你的原生 OpenCode 数据必须保留，才能继续对话。每个
Mr. Mak 标签页只保留一个对话。新任务请用新标签页。OpenCode 自行控制模型和
推理设置。自动批准默认关闭，启用后显式的拒绝规则仍然有效。

OpenCode 1.x 和 2.x 使用不同的插件 API。Mr. Mak 在启动时选择对应的小型会话观察器，
不会写入全局配置。OpenCode 2.x 为每个终端运行一个私有服务器，使各标签页的历史互不干扰。
MCP 检查器目前列出 Claude、Codex、Kimi 和 Cursor 的配置；
OpenCode 自己的连接请用其原生 MCP 控件查看。

## 浏览示例

置顶的游戏卡片是项目中心。Research 是一份带来源链接的可读报告。Dev 包含本指南
和自定义思路。Image Gen 展示 Arachne 的设计迭代和动作参考。它们都被标记为示例，
不会被按时间自动归档。不再需要时可手动归档。归档只修改元数据，不会删除其媒体文件。

用“文件”查看 `projects`、`inbox`、`knowledge`、`processes` 和技能文件夹。
Markdown 文件会以预览模式打开；切换到“编辑”并“保存”即可修改。
“帮助”按钮会打开快速指南，不会新建对话。

## 可选语音

将 `.env.example` 复制为 `.env`，填入你自己的 `OPENAI_API_KEY`，即可启用
OpenAI Live 连接。切勿提交该文件。语音协调器需要登录 Codex。其模型跟随你的
账号配置；可选的 `MRMAK_COORDINATOR_MODEL` 可覆盖它。可用模型取决于你的账号。

语音请求可以聚焦某个对话、查看报告、更新卡片，或将较大的任务交给工作代理。
直接操作响应迅速；交付物由一个可见的工作代理处理。针对具体任务的语音请求可使用
medium、high 或 xhigh 推理强度。直接请求新建对话时，使用与 **+** 按钮相同的
`xhigh` 默认值。Max 需要明确要求。应用会先报告工具结果，再宣布操作完成。

CLI 账号计费与 OpenAI 语音 API 计费相互独立。浏览示例或使用已登录的 CLI 不需要
调用 API 生成。向终端进行可选语音听写的说明见[语音听写](../knowledge/voice-dictation.md)。

## macOS

没有预构建的 Mac 下载包；需从源码构建一次（约五分钟）。安装 Node.js 22.20+、
[Rust](https://rustup.rs) 和 Xcode Command Line Tools（`xcode-select --install`），
然后运行：

```bash
./setup.sh check      # report prerequisites
./setup.sh desktop    # build Mr. Mak Workspace.app and a .dmg
```

将 `src-tauri/target/release/bundle/macos/Mr. Mak Workspace.app` 拖到
“应用程序”，然后在克隆的文件夹中双击 **Start Mr. Mak.command**。
构建产物内置独立的 Node 运行时，因此使用 Homebrew 安装的 Node 也没问题。
应用未签名：首次打开时，右键点击它并选择“打开”。

与 Windows 的差异：

- 快捷键用 ⌘ 代替 Ctrl（⌘⇧T 新建对话，⌘⇧P 查找，⌘⇧H 历史，
  ⌘1–9 切换对话，也可在“对话”菜单中找到；Ctrl+Tab 仍可循环切换）。在终端中 ⌘C/⌘V 复制和粘贴，
  Ctrl+C 会像在 Terminal.app 中一样传给 CLI。
- 设置 > 快捷键：**⌃⌥Space** 可从任意应用唤回窗口（相当于 Windows 上的
  Win 键组合）。点击 Dock 图标也会恢复已关闭的窗口。
- 两个窗口共用一个 Dock 图标；菜单栏图标提供“显示工作区”、“显示对话”和“退出”。
- 首次录音时会请求麦克风权限。
- `./scripts/check-macos-native.sh` 通过辅助功能检查原生部分（菜单、快捷键、
  Dock 重新打开、⌃⌥Space）；运行期间约 30 秒需要占用屏幕。

移植细节、验证方式和已知限制见 [macOS 说明](macos.md)。

## 从源码构建

在全新克隆中，`npm ci` 会同时安装前端和本地桌面服务的依赖。之后运行 `npm test`
执行服务检查；无需单独安装服务。如果禁用了 npm 生命周期脚本，请在运行测试或服务前
显式执行 `npm --prefix desktop/service ci`。

安装 [Node.js](https://nodejs.org/en/download)、Rust 的 MSVC 工具链和
[Tauri 的 Windows 前置依赖](https://v2.tauri.app/start/prerequisites/#windows)：
Microsoft C++ Build Tools 和 WebView2。本模板要求 Node.js 22.20+。

```powershell
powershell -ExecutionPolicy Bypass -File .\Setup.ps1 -Mode Check
powershell -ExecutionPolicy Bypass -File .\Setup.ps1 -Mode Desktop
```

Check 只报告前置依赖情况。Desktop 安装项目依赖，并在
`src-tauri/target/release/bundle/nsis` 中构建安装程序。它不会替你安装或重启应用。
代理应先准备好更新，然后在通过安装或重启打断进行中的对话前征得同意。

```powershell
powershell -ExecutionPolicy Bypass -File .\Setup.ps1 -Mode Update
```

请在 Mr. Mak 之外、从“开始”菜单打开的独立 Windows PowerShell 窗口中运行 Update。
在受管对话中运行的更新程序会在你退出应用时被终止；Setup 会在构建前检测这种情况。
Update 会等待你从托盘退出，确认内置服务已退出，静默安装新版本，然后重新打开同一个仓库。
退出前请先完成进行中的对话。已注册的安装文件夹会被复用。如需显式指定，可传入
`-InstallDirectory 'D:\Apps\Mr. Mak Workspace'`。更新本身永远不会终止你的对话。

如果只需要在浏览器中预览报告，除上述 CLI 前置条件外，只需 Node.js 22.20+ 和 npm。
**Preview 模式和下载的 Windows 安装程序都不需要 Rust、Cargo 和 C++ Build Tools。**
它们只用于从源码编译桌面应用。

```powershell
powershell -ExecutionPolicy Bypass -File .\Setup.ps1 -Mode Preview
```

这会启动 Vite，并将 `public/workspace` 链接到真实的 Workspace 文件夹。
它不会启动受管终端或语音服务。

## 在另一台电脑上

克隆你自己的仓库，安装应用，选择文件夹，并重新登录各个 CLI。在本地重新创建 `.env`。
内容通过 Git 同步；凭据、本地应用状态和原生 CLI 历史不会同步。全新克隆无法恢复
原生历史只存在于之前那台电脑上的对话。
