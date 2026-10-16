import path from 'node:path';
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const worker = fileURLToPath(new URL('./local-read-aloud.py', import.meta.url));
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
export const readingVoices = [{ id: 'am_michael', label: 'Michael · 美式男声' }, { id: 'bf_emma', label: 'Emma · 英式女声' }];
export class LocalReadAloud {
  constructor(repo) { this.root = path.join(repo, '.cache', 'read-aloud'); this.python = path.join(this.root, 'venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'); }
  async status() {
    let available = false;
    try { await Promise.all([this.python, path.join(this.root, 'kokoro-v1.0.int8.onnx'), path.join(this.root, 'voices-v1.0.bin')].map(file => access(file))); available = true; } catch { /* Optional local setup. */ }
    return { available, voices: readingVoices };
  }
  start() {
    if (this.child) return;
    const child = spawn(this.python, ['-u', worker, this.root], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] }); this.child = child;
    let text = '';
    child.stdout.on('data', chunk => {
      text += chunk.toString();
      if (text.length > 16 * 1024 * 1024) { this.close(); return; }
      const end = text.indexOf('\n'); if (end < 0) return;
      const line = text.slice(0, end); text = text.slice(end + 1);
      const pending = this.pending; if (!pending) return;
      try { const result = JSON.parse(line); if (!result.audio || result.error) throw Error(); pending.resolve(Buffer.from(result.audio, 'base64')); }
      catch { pending.reject(fail('本地语音生成失败。请重试。', 502)); }
    });
    const ended = () => { if (this.child === child) { this.child = null; this.pending?.reject(fail('本地语音已停止。请重试。', 502)); } };
    child.on('error', ended); child.on('exit', ended); child.stdin.on('error', ended);
  }
  async synthesize(deviceId, { voice, text }, signal) {
    if (!readingVoices.some(item => item.id === voice) || typeof text !== 'string' || !text.trim() || text.length > 2000) throw fail('请选择 Michael 或 Emma，并提供一段简短文本。');
    if (this.pending) throw fail('语音正忙。请稍后重试。', 429);
    if (!(await this.status()).available) throw fail('请先在电脑上设置本地朗读。', 503);
    if (this.pending) throw fail('语音正忙。请稍后重试。', 429);
    if (signal?.aborted) throw fail('播放已取消。', 499);
    clearTimeout(this.idle); this.start();
    let abort, timeout;
    try {
      return await new Promise((resolve, reject) => {
        this.pending = { deviceId, resolve, reject };
        abort = () => { reject(fail('播放已取消。', 499)); this.close(); };
        signal?.addEventListener('abort', abort, { once: true });
        timeout = setTimeout(() => { reject(fail('本地语音超时。请对更短的回复重试。', 504)); this.close(); }, 90000);
        this.child.stdin.write(JSON.stringify({ voice, text }) + '\n');
      });
    } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); this.pending = null; this.idle = setTimeout(() => this.close(), 60000); this.idle.unref(); }
  }
  revoke(id) { if (this.pending?.deviceId === id) this.close(); }
  close() { clearTimeout(this.idle); this.pending?.reject(fail('播放已停止。', 499)); this.child?.kill(); this.child = null; }
}
