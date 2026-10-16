import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);

// Use a dedicated HTTPS port. Never reset or replace someone else's Serve setup.
export class TailscaleTransport {
  async command(args) {
    let executable = 'tailscale';
    if (process.platform === 'win32') {
      const installed = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Tailscale', 'tailscale.exe');
      try { await access(installed); executable = installed; } catch { /* Try PATH. */ }
    }
    if (process.platform === 'darwin') {
      // The Mac App Store / standalone Tailscale app does not put its CLI on PATH by default.
      const installed = '/Applications/Tailscale.app/Contents/MacOS/Tailscale';
      try { await access(installed); executable = installed; } catch { /* Try PATH. */ }
    }
    return execute(executable, args, { windowsHide: true, timeout: 12000, maxBuffer: 1024 * 1024 });
  }
  async probe() {
    try {
      const { stdout } = await this.command(['status', '--json']);
      const status = JSON.parse(stdout);
      const hostname = String(status.Self?.DNSName || '').replace(/\.$/, '');
      return { installed: true, ready: status.BackendState === 'Running' && /^[a-z0-9.-]+\.ts\.net$/i.test(hostname), hostname, message: status.BackendState === 'Running' ? '' : '请在此电脑上打开 Tailscale 并登录。' };
    } catch (error) {
      return { installed: error.code !== 'ENOENT', ready: false, message: error.code === 'ENOENT' ? '请在此电脑和手机上安装 Tailscale，并登录同一账户。' : '请打开 Tailscale 并登录，然后重新检查连接。' };
    }
  }
  async config() { return JSON.parse((await this.command(['serve', 'status', '--json'])).stdout || '{}'); }
  owns(config, saved) {
    if (!saved?.hostname || !saved?.port || !saved?.target) return false;
    const handlers = config.Web?.[`${saved.hostname}:${saved.port}`]?.Handlers;
    return Object.keys(handlers || {}).length === 1 && handlers['/']?.Proxy === saved.target;
  }
  async enable(target, previous) {
    const status = await this.probe();
    if (!status.ready) throw new Error(status.message || 'Tailscale 需要 HTTPS 设备名。请在 Tailscale 账户中启用 MagicDNS。');
    const config = await this.config();
    let port = previous?.hostname === status.hostname && this.owns(config, previous) ? previous.port : null;
    if (!port) port = [8443, 8444, 8445, 8446].find(value => !config.TCP?.[value] && !Object.keys(config.Web || {}).some(key => key.endsWith(`:${value}`)));
    if (!port) throw new Error('Tailscale HTTPS 端口 8443–8446 均已被占用。请释放其中一个端口后重试。');
    if (config.AllowFunnel?.[`${status.hostname}:${port}`]) throw new Error('此 Tailscale 端口已公开共享。连接 Mr. Mak 前请关闭此端口的 Funnel。');
    try { await this.command(['serve', '--bg', '--yes', `--https=${port}`, target]); }
    catch { throw new Error('Tailscale Serve 无法启动。请在 Tailscale 中为此设备启用 HTTPS，并检查 Serve 权限。Windows 首次设置 Serve 可能需要管理员终端。请参阅下方的设置说明。'); }
    const saved = { port, hostname: status.hostname, target };
    const verified = await this.config();
    if (!this.owns(verified, saved) || verified.AllowFunnel?.[`${saved.hostname}:${port}`]) throw new Error('无法验证私有 Tailscale 路由。手机访问保持关闭。');
    return { ...saved, origin: `https://${status.hostname}:${port}` };
  }
  async disable(saved) {
    if (saved && this.owns(await this.config(), saved)) await this.command(['serve', '--yes', `--https=${saved.port}`, 'off']);
  }
}
