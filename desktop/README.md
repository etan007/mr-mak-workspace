# 桌面端架构

桌面应用是包裹两个 webview 的 Tauri 2 外壳。它启动一个本地 Node 服务，绑定到
回环地址，并把经过认证的本地 URL 交给每个窗口。工作区渲染 React UI 和报告文件。
对话窗口通过 xterm.js 渲染真实的 PTY。两个窗口共享会话和设置，但可独立最小化。

| 路径 | 职责 |
| --- | --- |
| `src/` | React 工作区、文档预览、文件、对话和语音 UI |
| `desktop/service/` | HTTP/WebSocket 服务、PTY、会话历史、工具、语音连接 |
| `src-tauri/src/` | 跨平台外壳集成，以及 Windows 任务栏标识、原生拖拽和可选的系统快捷键 |
| `workspace/workspace.json` | 卡片注册表 |
| `workspace/_shared/` | 报告 CSS、图片查看器和帮助 |
| `.mrmak/` | 本地运行时状态；被 Git 忽略 |

`npm run desktop:build` 运行 `desktop/prepare.mjs`，构建 React 前端，把服务与
Node 可执行文件和生产依赖一起打包，然后构建 Tauri 可执行文件和各平台安装程序。
在 Linux 上，用 `npm run desktop:build:appimage` 生成可分发的 AppImage。接收者
自行选择仓库；仓库内容从磁盘读取，而不是打包进安装程序。

服务以当前用户身份运行 CLI。CLI 可访问的文件和权限取决于其启动选项和原生账号
设置。跳过权限确认默认关闭。不要把本地服务暴露为公共 Web 服务器。

可选的语音前端使用 OpenAI Live。日常操作调用本地工具；Codex app-server 协调器
用用户配置的模型处理更广泛的编排。较大的执行任务交给可见的 worker 终端。提供方
的原生对话 ID 在可用时会被记录，以便之后恢复。Codex 发现逻辑会同时检查本地日期
和 UTC 日期文件夹，在首个提示延迟时持续等待，并读取大于一个小缓冲区的有界元数据
记录。关闭或恢复标签页时，可从其确切的 Mr. Mak 来源标记找回缺失的 ID。仅共享
工作目录不能证明归属。

新的 Codex 和 Claude 对话默认使用 `xhigh`；显式保存的推理强度选择会保留。终端
URL 和 OSC 8 链接使用 xterm 链接处理器。两个应用窗口发出的新窗口请求，会通过
Windows 默认浏览器关联打开 HTTP(S) 链接，当前应用视图保持打开。

全屏 Claude 自行滚动其对话。终端快照会保留鼠标跟踪和所请求的 SGR 编码（包括已
保存的屏幕），因此切换标签页或重连不会禁用其鼠标滚轮。经典 Claude 和 Codex
继续使用本地终端滚动缓冲。

## 本地麦克风听写

桌面对话、Mak 输入框和已配对的手机对话支持免费的本地 Whisper 听写。按
[配置与审阅行为](../docs/mobile-access.md#语音输入) 操作。本地引擎是默认值。
在右上角手机按钮（**手机设置**）或 **设置 → 语音转文字** 中选择免费/付费/关闭。
该选择会保存并与已配对手机共享。付费提供方需要在电脑上配置 API key。

## 终端外观

设置 → 对话 → 终端外观提供 **Original CLI colors**（默认）和 **Mr. Mak Focus**
（柔和配色）。Original 保留 CLI diff 中新增和删除行的颜色。该选择对所有桌面对话
生效并保存，无需重启会话即可立即应用到已打开的终端。已有的保存偏好会保留。每个
对话的选项菜单中也有同样的选择。

## OpenCode 终端

服务会检测已安装的 OpenCode 1.x 或 2.x 并启动其真实 TUI。模型选择、提供方认证
和推理配置由 OpenCode 自己负责。可选的 `--auto` 参数会保留 OpenCode 的显式权限
拒绝。

`desktop/service/opencode/` 包含针对两种插件 API 的无依赖事件观察器。每个进程的
内联配置会加入匹配的观察器，同时保留已配置的插件、模型和提供方。不修改任何全局
配置。OpenCode 2.x 使用 `--standalone` 为每个托管终端隔离服务器。

观察器只在 `.mrmak/` 下保存原生会话 ID、启动标识和活动/完成元数据。不保存提示词
或提供方凭据。根会话标识取自实际的原生事件，而不是从共享工作目录推断。恢复时用
记录的 ID 传入 `--session`。按启动区分的标记可防止过期事件改变新终端的活动状态。
原生 CLI 历史必须保留在磁盘上，才能恢复对话。

## 检查

```powershell
npm ci
npm run lint
npm test
npm run test:template
npm run build
npm run desktop:test:ui
npm run test:preview
```

根目录安装也会安装锁定版本的 `desktop/service` 依赖。如果有意使用
`npm ci --ignore-scripts`，在运行测试或本地服务之前先运行
`npm --prefix desktop/service ci`。

UI 测试使用隔离的仓库和模拟终端。Windows 上需要有 Edge，或把
`MRMAK_TEST_BROWSER` 设为你已安装的 Playwright 浏览器通道。Live 语音和订阅冒烟
检查是单独的脚本，需要显式的启用参数；它们从不属于默认测试命令。

OpenCode 有一个单独的免账号集成测试，针对本地 mock 模型运行：

```powershell
node desktop/service/test-opencode-native.mjs --binary C:\path\to\opencode.exe --tui
```

它隔离 CLI 的 home 和数据目录，验证两份独立的原生历史，然后关闭并恢复一个真实
终端。已在 Windows 上用 OpenCode 1.18.3 和 2.0.21 测试。不产生付费模型调用。

Windows x64 和 Linux 是受支持的原生目标。macOS 仍是未来目标；共享的平台边界
避免让 Linux 行为成为其前提。

朗读使用固定的免费本地语音：Michael（美式男声）和 Emma（英式女声）。在 Windows
上运行一次 `powershell -ExecutionPolicy Bypass -File scripts/setup-local-read-aloud.ps1`。
模型和 CPU Python 环境保存在被忽略的 `.cache/read-aloud` 文件夹中；不需要云端
语音 key 或付费账号。手机设置保存语音选择。移动服务按需启动自己的语音 worker，
空闲后释放；更新服务文件需要用户批准重启应用。
