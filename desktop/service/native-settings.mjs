import { randomUUID } from 'node:crypto';

export class NativeSettings {
  constructor(send, changed) { this.send = send; this.changed = changed; this.value = { available: false, winKey: false }; this.pending = new Map(); }
  receive(event) {
    if (event.type !== 'native-settings') return;
    this.value = { available: event.available === true, winKey: event.winKey === true, ...(event.error ? { error: String(event.error) } : {}) };
    this.changed(this.value);
    const pending = this.pending.get(event.requestId);
    if (pending) { clearTimeout(pending.timer); this.pending.delete(event.requestId); event.error ? pending.reject(new Error(event.error)) : pending.resolve(this.value); }
  }
  set(winKey) {
    if (typeof winKey !== 'boolean') throw new Error('请选择快捷键是否显示 Mr. Mak。');
    if (!this.value.available) throw new Error('可选的系统快捷键不可用。');
    if (this.pending.size) throw new Error('快捷键修改已在进行中。');
    const requestId = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(requestId); reject(new Error('原生桌面未确认此修改。请重新检查快捷键设置。')); }, 5000);
      this.pending.set(requestId, { resolve, reject, timer });
      this.send({ type: 'native-settings', requestId, winKey });
    });
  }
  close() { for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new Error('Mr. Mak 正在关闭。')); } this.pending.clear(); }
}
