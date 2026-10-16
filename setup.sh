#!/usr/bin/env bash
# macOS / Linux counterpart of Setup.ps1.  Usage: ./setup.sh [check|preview|desktop]
set -euo pipefail
mode="${1:-check}"
cd "$(dirname "$0")"
[ -f workspace/workspace.json ] || { echo "请在完整的仓库文件夹中运行 setup.sh。" >&2; exit 1; }
has() { command -v "$1" >/dev/null 2>&1 && echo true || echo false; }
echo "Mr. Mak Workspace 安装检查"
echo "Node: $(has node) | npm: $(has npm) | Rust（仅源码构建桌面版需要）: $(has cargo)"
echo "Codex CLI: $(has codex) | Claude Code CLI: $(has claude) | OpenCode: $(has opencode)"
if ! command -v codex >/dev/null && ! command -v claude >/dev/null && ! command -v opencode >/dev/null; then
  echo "请先安装并配置 Codex CLI、Claude Code CLI 或 OpenCode。参见 docs/getting-started.md。" >&2; exit 1
fi
case "$mode" in
  check)
    echo "源码预览：./setup.sh preview"
    echo "源码构建桌面版：./setup.sh desktop"; exit 0 ;;
  preview|desktop) ;;
  *) echo "用法：./setup.sh [check|preview|desktop]" >&2; exit 1 ;;
esac
command -v node >/dev/null && command -v npm >/dev/null || { echo "请安装 Node.js 22.20 或更新版本。" >&2; exit 1; }
node -e "const p=process.versions.node.split('.').map(Number);if(p[0]<22||(p[0]===22&&p[1]<20))process.exit(1)" \
  || { echo "需要 Node.js 22.20 或更新版本。" >&2; exit 1; }
if [ "$mode" = desktop ] && ! command -v cargo >/dev/null; then
  echo "请安装稳定版 Rust（https://rustup.rs）；macOS 上还需安装 Xcode Command Line Tools（xcode-select --install）。" >&2; exit 1
fi
npm ci
if [ "$mode" = preview ]; then
  echo "正在打开报告预览。完整的终端和语音功能请使用桌面应用。"
  exec npm run dev
fi
if [ "$(uname)" = Darwin ]; then
  npm run desktop:build -- --bundles app dmg
  echo "应用已生成于 src-tauri/target/release/bundle/macos（磁盘映像位于 bundle/dmg）。"
  echo "将 Mr. Mak Workspace.app 拖到“应用程序”，然后双击 'Start Mr. Mak.command'。"
else
  npm run desktop:build:appimage
  echo "AppImage 已生成于 src-tauri/target/release/bundle/appimage。"
fi
