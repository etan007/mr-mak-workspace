import { realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { projectMatch, projectRef } from './contracts.mjs';

const rootName = root => path.basename(root) || root;

export const genericProjectAdapter = {
  id: 'generic',
  label: '通用项目',
  async detect({ start }) {
    const root = await realpath(path.resolve(start));
    if (!(await stat(root)).isDirectory()) throw new Error('项目起点必须是目录。');
    return projectMatch({ adapterId: 'generic', root, confidence: 0.01, reason: '适用于任意本地仓库的兜底适配器。', name: rootName(root) });
  },
  async describe(project) {
    return projectRef({ adapterId: 'generic', root: project.root, name: rootName(project.root), metadata: { source: 'filesystem' } });
  },
  capabilities: {
    files: { async relevantFiles(project) { return [{ path: project.root, kind: 'directory', label: rootName(project.root) }]; } },
    artifacts: { async artifacts() { return []; } },
  },
};
