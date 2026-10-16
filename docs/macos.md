# macOS 上的 Mr. Mak Workspace

桌面应用最初为 Windows（及 Linux）构建。本文介绍 macOS 移植：改了什么、如何构建和运行、
如何验证，以及尚未解决的问题。
贡献者报告应用可在 Apple Silicon 上原生运行，并为 PR #25 完成了下列检查。
合并后的 0.5.1 更新增加了 CI 验证和有超时上限的 login shell 探测；
其构建状态由仓库的 Checks 工作流跟踪。

## 构建和运行

前置条件：Node.js 22.20+、[Rust](https://rustup.rs)、Xcode Command Line Tools
（`xcode-select --install`），以及至少一个代理 CLI（Claude Code、Codex 或 OpenCode）。

```bash
./setup.sh check      # report prerequisites
./setup.sh desktop    # npm ci + build Mr. Mak Workspace.app and a .dmg
```

产物：`src-tauri/target/release/bundle/macos/Mr. Mak Workspace.app`（以及 `bundle/dmg/`）。
把应用复制到"应用程序"，然后双击仓库中的 **Start Mr. Mak.command**，
它会在本仓库上打开应用。构建未签名：首次启动需要
右键 › 打开；每次重新构建后 macOS 都会再次请求权限（如麦克风），
因为 ad-hoc 签名每次构建都会变化。

开发：`./node_modules/.bin/tauri dev -- -- --repo "$PWD"`。不带 `--repo` 时，
`tauri dev` 在 `src-tauri/` 中启动，并等待一个（隐藏的）仓库选择器。开发模式提供
`dist/` 的内容；请先运行 `npm run build`。

## 改动内容

### 原生应用（`src-tauri/`）
| 改动 | 原因 |
|---|---|
| `app` 和 `dmg` 打包目标、`icons/icon.icns`、带 `NSMicrophoneUsageDescription` 的 `Info.plist` | Mac 打包；语音需要麦克风用途说明 |
| 服务使用 login shell 的 `PATH` | 从 Finder/Dock 启动时也能找到已安装的 CLI；shell 两秒无响应时回退到继承的 PATH 加常见 CLI 目录 |
| `mac_key.rs`：⌃⌥Space 唤回快捷键（`tauri-plugin-global-shortcut`），与 Win 键设置共用 | Win 键唤回在 macOS 上的对应实现 |
| `RunEvent::Reopen` 恢复两个窗口 | 关闭窗口只是隐藏它；点击 Dock 必须能恢复 |
| macOS 上启用原生文件拖出（`drag` crate） | 把文件从工作区拖到 Finder 和其他应用 |
| "在 Finder 中显示"使用 `open -R` | Finder 会选中该文件，而不只是打开所在文件夹 |
| **Chats** 菜单，⌘1–⌘9 对应 Chat 1–9 | WKWebView 收不到 ⌘+数字，所以标签页切换放在菜单中（与其他 Mac 应用一致） |

### 打包（`desktop/prepare.mjs`、`scripts/fix-pty-permissions.mjs`）
- Homebrew 的 `node` 是链接到 `libnode.dylib` 的启动器，无法从应用包中运行
  （服务崩溃并报 `Library not loaded: libnode.*.dylib`）。现在 macOS 构建会从 nodejs.org
  下载同版本的官方独立 Node，按 `SHASUMS256.txt` 校验其 SHA-256，缓存到 `.cache/node-download`
  后打包。该副本设为可写，因此重新构建可以替换它。
- npm 解包 node-pty 的 `spawn-helper` 时不带执行位，导致所有终端都以
  `posix_spawnp failed` 失败。现在会在 `npm install` 之后（postinstall）以及应用包中修复。

### 服务（`desktop/service/`）
- Tailscale CLI 位于 `Tailscale.app` 内；Claude Code 的托管 MCP 文件位于
  `/Library/Application Support/ClaudeCode/managed-mcp.json`（Linux：`/etc/claude-code/`）。
- 拖入 shell 的路径按 POSIX 方式加引号（单引号写作 `'\''`）；PowerShell 仍用 `''`。
- 错误文本与平台无关（在其他系统上不出现 "Windows"/"Explorer"）。

### 界面（`src/`）
- `src/desktop/platform.ts`：集中处理平台约定。
- macOS 上快捷键使用 ⌘（⌘⇧T/P/H/W、⌘1–9）；Ctrl+Tab 仍可循环切换。
- 终端：⌘C/⌘V 复制粘贴；Ctrl+C 传给 CLI（与 Terminal.app 一致）；
  代理捕获鼠标时可用 Option+拖动选择文本；使用 SF Mono/Menlo 字体。
- 用 Finder/废纸篓/macOS 措辞替代 Explorer/回收站/Windows；设置中显示
  ⌃⌥Space 快捷键。
- WebKit 修复：语音释放请求使用 `keepalive`（WebKit 会取消正在关闭页面发出的请求）；
  仅在同源时才访问报告 iframe；手机录音以字节而非 Blob 形式存入 IndexedDB
  （Safari 无痕浏览）。

### 脚本
`setup.sh`（`Setup.ps1` 的 macOS/Linux 对应版本）、`Start Mr. Mak.command`
（`Start Mr. Mak.cmd` 的对应版本）、`scripts/check-macos-native.sh`。

## 验证

| 测试集 | 方式 | 结果 |
|---|---|---|
| UI 测试集（8 个）+ 预览/模板检查 | Playwright 无头模式；macOS 上默认 **WebKit**（`desktop/service/test/browser.mjs`），也测 Chromium | 20/20 通过 |
| 服务测试 | `npm run desktop:test` | 90 通过，0 失败，2 跳过 |
| Rust 测试 | 在 `src-tauri` 中运行 `cargo test` | 2/2 |
| 模板检查 | `npm run test:template` | 9/9 |
| 原生检查 | `scripts/check-macos-native.sh`（辅助功能；需占用屏幕约 30 秒） | Chats 菜单、⌘1/⌘2、菜单切换、⌘⇧W、Dock 重新打开、⌃⌥Space：全部通过 |
| 在发布版应用上手动测试 | — | macOS 标签文字；拖入带单引号的路径 + `ls`；在 Finder 中显示（文件夹和文件）；把文件拖出到 Finder；把文件拖入终端 |

UI 测试现在在各平台应用所用的引擎中运行（Windows 上为 WebView2/Edge，
macOS 上为 WKWebView/WebKit）；可用 `MRMAK_TEST_BROWSER=chromium|webkit|msedge` 覆盖。若干测试
需要针对引擎的修复（平台复制快捷键、WebKit 剪贴板权限、原型层的麦克风桩、
服务端模拟"丢失回复"——因为 Playwright 的 WebKit 无法路由 service worker 请求，
以及两处时序竞争）。

## 已知限制 / 未测试
- 未签名，仅支持 Apple Silicon（`aarch64`）；未公证（notarisation）。Intel 或通用构建需要
  `--target universal-apple-darwin` 和两个 Rust 目标。
- Live 语音协调器需要在被忽略的 `.env` 中设置 `OPENAI_API_KEY`。
  语音听写可改用可选的本地 Whisper。贡献者的原生检查未实际触发
  真实的麦克风权限提示。
- 通过 Tailscale 的手机访问只做了自动化测试（WebKit 即 iPhone Safari 的引擎），
  未用真机测试。
- 托盘（菜单栏）菜单无法通过辅助功能访问，因此不在原生检查范围内。
- 在此工具链上 `rust-objcopy` 无法 strip 发布版二进制（无害警告）。
