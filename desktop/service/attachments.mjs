import path from 'node:path';
import { mkdir, open, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { within } from './util.mjs';

export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
function imageExtension(data) {
  if (data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return '.png';
  if (data[0] === 255 && data[1] === 216 && data[2] === 255) return '.jpg';
  if (/^GIF8[79]a/.test(data.subarray(0, 6).toString())) return '.gif';
  if (data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP') return '.webp';
  if (data.subarray(0, 2).toString() === 'BM') return '.bmp';
  throw new Error('请附加 PNG、JPEG、WebP、GIF 或 BMP 图片。');
}
export class Attachments {
  constructor(repo) { this.repo = repo; }
  async save(data, name = 'Screenshot') {
    if (!data.length || data.length > MAX_IMAGE_BYTES) throw new Error('请选择小于 25 MB 的图片。');
    const extension = imageExtension(data);
    const date = new Date().toISOString();
    const folder = path.join(this.repo, 'inbox', 'attachments', date.slice(0, 10));
    await mkdir(folder, { recursive: true });
    const actual = await realpath(folder);
    if (!within(await realpath(this.repo), actual)) throw new Error('附件文件夹必须位于 MR-MAK 内。');
    const basename = path.basename(String(name), path.extname(String(name))).replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 65) || 'Screenshot';
    const file = path.join(actual, `${basename}-${date.slice(11, 19).replaceAll(':', '')}-${randomUUID().slice(0, 8)}${extension}`);
    await writeFile(file, data, { flag: 'wx' });
    return { path: file, name: path.basename(file), size: data.length };
  }
  async copyImage(file) {
    const actual = await realpath(path.resolve(file));
    const info = await stat(actual);
    if (!info.isFile() || info.size > MAX_IMAGE_BYTES) throw new Error('请选择小于 25 MB 的图片文件。');
    return this.save(await readFile(actual), path.basename(actual));
  }
  async coordinatorImages(files = []) {
    if (!Array.isArray(files) || files.length > 12) throw new Error('每条消息最多附加 12 张图片。');
    if (!files.length) return [];
    const repo = await realpath(this.repo);
    const root = await realpath(path.join(repo, 'inbox', 'attachments'));
    if (!within(repo, root)) throw new Error('附件文件夹必须位于 MR-MAK 内。');
    const result = [];
    for (const file of files) {
      if (typeof file !== 'string' || !path.isAbsolute(file) || /[\x00-\x1f\x7f]/.test(file)) throw new Error('请选择通过 Mr. Mak 上传的图片。');
      const actual = await realpath(file);
      if (!within(root, actual)) throw new Error('请选择通过 Mr. Mak 上传的图片。');
      const handle = await open(actual, 'r');
      try {
        const info = await handle.stat();
        if (!info.isFile() || !info.size || info.size > MAX_IMAGE_BYTES) throw new Error('请选择小于 25 MB 的图片文件。');
        const header = Buffer.alloc(12);
        await handle.read(header, 0, header.length, 0);
        imageExtension(header);
      } finally { await handle.close(); }
      if (!result.includes(actual)) result.push(actual);
    }
    return result;
  }
  async paths(files) {
    if (!Array.isArray(files) || !files.length || files.length > 100) throw new Error('请选择 1 到 100 个文件或文件夹。');
    const result = [];
    for (const file of files) {
      if (typeof file !== 'string' || !path.isAbsolute(file) || /[\x00-\x1f\x7f]/.test(file)) throw new Error('请用绝对路径选择已存在的文件或文件夹。');
      // Keep the dropped spelling, including a folder junction or symlink alias.
      // Only inspect metadata; references never read, copy or expand a folder.
      const absolute = path.resolve(file);
      const info = await stat(absolute);
      if (!info.isFile() && !info.isDirectory()) throw new Error('请选择普通文件或文件夹。');
      result.push(absolute);
    }
    return result;
  }
}
export function attachmentText(paths, agent) {
  // In a shell, literal single quotes prevent an attachment path from expanding.
  // PowerShell escapes a quote inside them as '', POSIX shells (zsh, bash) as '\''.
  const quote = process.platform === 'win32' ? "''" : "'\\''";
  return paths.map(file => agent === 'shell' ? "'" + file.replaceAll("'", quote) + "'" : '"' + file.replaceAll('"', '') + '"').join(' ') + ' ';
}
