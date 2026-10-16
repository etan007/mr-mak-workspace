[CmdletBinding()]
param([ValidateSet('Check', 'Preview', 'Desktop', 'Update')][string]$Mode = 'Check', [string]$InstallDirectory)
$ErrorActionPreference = 'Stop'
$taskRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
. (Join-Path $taskRoot 'scripts/update-helpers.ps1')
# Quitting the app terminates its entire managed process tree, including an
# updater launched in its terminal. Reject before building or installing.
if ($Mode -eq 'Update') {
  $taskProcesses = @(Get-CimInstance Win32_Process -ErrorAction Stop)
  if ($env:MRMAK_PARENT_PID -or (Test-MakAncestor $taskProcesses $PID)) {
    throw '请在 Mr. Mak 之外、从开始菜单打开的独立 Windows PowerShell 窗口中运行 Setup.ps1 -Mode Update。退出 Mr. Mak 会中止在其对话中启动的更新程序。'
  }
  if (-not $InstallDirectory) { $InstallDirectory = Get-MakInstallDirectory }
  $InstallDirectory = [IO.Path]::GetFullPath($InstallDirectory)
  if ($InstallDirectory.Contains('"')) { throw '安装文件夹路径不能包含引号。' }
}
Push-Location -LiteralPath $taskRoot
try {
  if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'workspace/workspace.json'))) {
    throw '请在完整的仓库文件夹中运行 Setup.ps1。'
  }
  $taskNode = Get-Command node -ErrorAction SilentlyContinue
  $taskNpm = Get-Command npm.cmd -ErrorAction SilentlyContinue
  $taskCargo = Get-Command cargo -ErrorAction SilentlyContinue
  $taskCodex = Get-Command codex -ErrorAction SilentlyContinue
  $taskClaude = Get-Command claude -ErrorAction SilentlyContinue
  $taskOpenCode = Get-Command opencode -ErrorAction SilentlyContinue
  Write-Host 'Mr. Mak Workspace 安装检查'
  Write-Host ('Node: ' + [bool]$taskNode + ' | npm: ' + [bool]$taskNpm + ' | Rust（仅源码构建桌面应用需要）: ' + [bool]$taskCargo)
  Write-Host ('Codex CLI: ' + [bool]$taskCodex + ' | Claude Code CLI: ' + [bool]$taskClaude + ' | OpenCode: ' + [bool]$taskOpenCode)
  if (-not $taskCodex -and -not $taskClaude -and -not $taskOpenCode) {
    throw '配置本工作区前，请先安装并配置 Codex CLI、Claude Code CLI 或 OpenCode。见 docs/getting-started.md。'
  }
  if ($Mode -eq 'Check') {
    Write-Host 'Windows 安装包无需构建工具链。见 docs/getting-started.md。'
    Write-Host '源码预览：.\Setup.ps1 -Mode Preview'
    Write-Host '源码构建桌面应用：.\Setup.ps1 -Mode Desktop'
    Write-Host '构建、安装并重启：.\Setup.ps1 -Mode Update'
    exit 0
  }
  if (-not $taskNode -or -not $taskNpm) { throw '请安装 Node.js 22.20 或更高版本，然后重新打开 PowerShell。' }
  & node -e "const p=process.versions.node.split('.').map(Number);if(p[0]<22||(p[0]===22&&p[1]<20))process.exit(1)"
  if ($LASTEXITCODE -ne 0) { throw '需要 Node.js 22.20 或更高版本。' }
  if ($Mode -ne 'Preview' -and -not $taskCargo) { throw '请安装稳定版 Rust 和 Visual Studio C++ 构建工具。见 docs/getting-started.md。' }
  & npm.cmd ci
  if ($LASTEXITCODE -ne 0) { throw '依赖安装失败。' }
  if ($Mode -eq 'Preview') {
    Write-Host '正在打开报告预览。完整的终端和语音功能需使用桌面应用。'
    & npm.cmd run dev
  } else {
    & npm.cmd run desktop:build
    if ($LASTEXITCODE -ne 0) { throw '桌面应用构建失败。请保留输出，交给负责安装的代理排查。' }
    $taskBundle = Join-Path $taskRoot 'src-tauri/target/release/bundle/nsis'
    if ($Mode -eq 'Desktop') {
      Write-Host ('安装包已生成：' + $taskBundle)
      Write-Host '运行安装包，然后双击 Start Mr. Mak.cmd。'
      exit 0
    }
    $taskVersion = (Get-Content -LiteralPath (Join-Path $taskRoot 'src-tauri/tauri.conf.json') -Raw | ConvertFrom-Json).version
    $taskSetup = Get-ChildItem -LiteralPath $taskBundle -Filter ('*_' + $taskVersion + '_*-setup.exe') |
      Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $taskSetup) { throw ('在 ' + $taskBundle + ' 中未找到 ' + $taskVersion + ' 版安装包。') }
    # The silent installer closes a running app without asking, and agents may
    # still be working in it. Wait until the owner quits Mr. Mak and its service.
    $taskInstallDirectories = @($InstallDirectory)
    # Include custom installations already running, even if their service takes
    # a moment to exit after the native window disappears. Never kill processes.
    foreach ($taskProcess in @(Get-CimInstance Win32_Process -ErrorAction Stop)) {
      if ((Test-MakAppProcess $taskProcess) -and $taskProcess.ExecutablePath) {
        $taskInstallDirectories += Split-Path -Parent $taskProcess.ExecutablePath
      }
    }
    $taskRunning = {
      return @(Get-MakUpdateProcesses @(Get-CimInstance Win32_Process -ErrorAction Stop) $taskInstallDirectories).Count -gt 0
    }
    if (& $taskRunning) {
      Write-Host '请先完成进行中的代理任务，再从 Mr. Mak 托盘菜单选择“退出”。安装会自动继续。'
      while (& $taskRunning) { Start-Sleep -Seconds 2 }
    }
    Write-Host ('正在安装 ' + $taskSetup.Name)
    # NSIS requires /D to be last and unquoted, including paths with spaces.
    $taskInstaller = Start-Process -FilePath $taskSetup.FullName -ArgumentList @('/S', ('/D=' + $InstallDirectory)) -WindowStyle Hidden -Wait -PassThru
    if ($taskInstaller.ExitCode -ne 0) { throw ('安装程序以代码 ' + $taskInstaller.ExitCode + ' 退出。请从 ' + $taskBundle + ' 手动运行以查看提示。') }
    Write-Host '安装完成，正在启动 Mr. Mak。'
    $taskApp = Join-Path $InstallDirectory 'mrmak-workspace.exe'
    if (-not (Test-Path -LiteralPath $taskApp)) { throw ('在 ' + $InstallDirectory + ' 中未找到已安装的应用。请打开安装程序检查安装位置。') }
    Start-Process -FilePath $taskApp -ArgumentList @('--repo', ('"' + $taskRoot + '"')) -WorkingDirectory $taskRoot -WindowStyle Hidden
  }
} finally { Pop-Location }
