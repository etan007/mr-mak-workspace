@echo off
setlocal
set "MRMAK_LAUNCH_ROOT=%~dp0"
if exist "%LOCALAPPDATA%\Mr. Mak Workspace\mrmak-workspace.exe" (
  start "" "%LOCALAPPDATA%\Mr. Mak Workspace\mrmak-workspace.exe" --repo "%MRMAK_LAUNCH_ROOT%."
  exit /b 0
)
if exist "%MRMAK_LAUNCH_ROOT%src-tauri\target\release\mrmak-workspace.exe" (
  start "" "%MRMAK_LAUNCH_ROOT%src-tauri\target\release\mrmak-workspace.exe" --repo "%MRMAK_LAUNCH_ROOT%."
  exit /b 0
)
chcp 65001 >nul
echo 请从本项目的 GitHub Releases 安装 Mr. Mak Workspace。
echo 或自行构建：powershell -NoProfile -ExecutionPolicy Bypass -File Setup.ps1 -Mode Desktop
echo 由代理引导的安装步骤见 docs\getting-started.md。
pause
