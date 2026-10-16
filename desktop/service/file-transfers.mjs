import { open, realpath, stat, lstat, unlink, link, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { within } from './util.mjs';
import { invalidFilename, samePath } from './platform.mjs';

export const MAX_FILE_BYTES = 1024 * 1024 * 1024;
const invalid = message => Object.assign(new Error(message), { status: 400 });

export async function importFile(source, folder, name, maxBytes = MAX_FILE_BYTES) {
  if (typeof folder !== 'string' || !folder) throw invalid('请选择目标文件夹。');
  if (invalidFilename(name)) {
    throw invalid('此文件名在这台电脑上不可用。');
  }
  const destination = await realpath(path.resolve(folder));
  if (!(await stat(destination)).isDirectory()) throw invalid('请选择要复制文件到的文件夹。');
  const extension = path.extname(name), stem = name.slice(0, name.length - extension.length);
  let handle, target;
  for (let copy = 1; copy <= 9999; copy++) {
    target = path.join(destination, copy === 1 ? name : `${stem} (${copy})${extension}`);
    try { handle = await open(target, 'wx'); break; }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  if (!handle) throw invalid('同名副本过多。请重命名文件后重试。');
  let size = 0;
  try {
    // Stream directly to the new file; large assets never accumulate in memory.
    for await (const chunk of source) {
      size += chunk.length;
      if (size > maxBytes) throw Object.assign(new Error('请选择不超过 1 GB 的文件。'), { status: 413 });
      await handle.writeFile(chunk);
    }
    await handle.close();
    return { path: target, name: path.basename(target), size, renamed: path.basename(target) !== name };
  } catch (error) {
    await handle.close().catch(() => {});
    await unlink(target).catch(() => {});
    throw error;
  }
}

export async function dragFiles(paths) {
  if (!Array.isArray(paths) || !paths.length || paths.length > 100 || paths.some(file => typeof file !== 'string' || !file)) {
    throw invalid('请选择 1 到 100 个文件或文件夹进行拖动。');
  }
  return Promise.all(paths.map(async file => {
    const actual = await realpath(path.resolve(file));
    const info = await stat(actual);
    if (!info.isFile() && !info.isDirectory()) throw invalid('请从文件树拖动普通文件或文件夹。');
    return actual;
  }));
}

export async function entryPath(value) {
  if (typeof value !== 'string' || !value.trim()) throw invalid('请选择文件或文件夹。');
  const absolute = path.resolve(value);
  if (path.dirname(absolute) === absolute) throw invalid('不能在这里修改驱动器根目录。');
  // Resolve the parent, never the last link: recycling a junction must not delete its target.
  const actual = path.join(await realpath(path.dirname(absolute)), path.basename(absolute));
  await lstat(actual);
  return actual;
}

export async function recyclePath(value, repo) {
  const actual = await entryPath(value);
  if (within(actual, repo)) throw invalid('不能在这里删除 MR-MAK 仓库及其上级文件夹。');
  return actual;
}

export async function moveFile(value, folder) {
  const source = await entryPath(value);
  if (typeof folder !== 'string' || !folder) throw invalid('请选择目标文件夹。');
  const destination = await realpath(path.resolve(folder));
  if (!(await stat(destination)).isDirectory()) throw invalid('请选择目标文件夹。');
  const target = path.join(destination, path.basename(source));
  if (samePath(source, target)) return { path: source, moved: false };
  const before = await lstat(source);
  if (!before.isFile() || before.isSymbolicLink()) throw invalid('这里只能移动单个文件。移动文件夹或链接请使用文件管理器。');
  try {
    // A same-volume hard link is an exclusive, constant-time move reservation.
    // Neither this path nor the cross-volume fallback can overwrite another file.
    try { await link(source, target); }
    catch (error) {
      if (!['EXDEV', 'EPERM', 'ENOTSUP', 'EACCES'].includes(error.code)) throw error;
      await copyFile(source, target, constants.COPYFILE_EXCL);
    }
  } catch (error) {
    if (error.code === 'EEXIST') throw Object.assign(new Error('该文件夹中已存在同名文件，未移动任何内容。'), { status: 409 });
    throw error;
  }
  try {
    const current = await lstat(source);
    if (current.ino !== before.ino || current.size !== before.size || current.mtimeMs !== before.mtimeMs) throw invalid('移动过程中源文件发生了变化。请等其保存完成后重试。');
    await unlink(source);
  } catch (error) { await unlink(target).catch(() => {}); throw error; }
  return { path: target, moved: true };
}
