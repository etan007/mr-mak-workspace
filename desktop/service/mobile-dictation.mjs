import path from 'node:path';
import { localAvailable, localConfig, localTranscribe } from './local-dictation.mjs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'dotenv';

export const AUDIO_LIMIT = 8 * 1024 * 1024;
export const RECORDING_SECONDS = 120;
const PROMPT = 'Transcribe speech verbatim in its original language(s). Preserve code-switching, names and technical terms. Do not translate or summarize.';
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const formats = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/wav': 'wav' };

export class MobileDictation {
  constructor(repo, { fetcher = fetch, env = process.env, localRunner = localTranscribe, localStatus = localAvailable, providerChoice = () => null } = {}) {
    this.providerChoice = providerChoice; this.localRunner = localRunner; this.localStatus = localStatus;
    this.repo = repo; this.fetcher = fetcher; this.env = env;
    this.jobs = new Map(); this.controllers = new Map(); this.rates = new Map(); this.closed = false;
  }
  async config() {
    const keys = { ...this.env, ...parse(await readFile(path.join(this.repo, '.env'), 'utf8').catch(() => '')) };
    const router = keys.OPENROUTER_API_KEY || keys.OPENROUTER_KEY;
    const openai = keys.OPENAI_API_KEY || keys.OPENAI_KEY;
    const provider = this.providerChoice() || keys.MRMAK_TRANSCRIBE_PROVIDER?.trim().toLowerCase() || 'local';
    const key = provider === 'openrouter' ? router : provider === 'openai' ? openai : null;
    const configuredProvider = keys.MRMAK_TRANSCRIBE_PROVIDER?.trim().toLowerCase() || (router ? 'openrouter' : 'openai');
    const modelOverride = configuredProvider === provider ? keys.MRMAK_TRANSCRIBE_MODEL?.trim() : null;
    return { provider, key, local: localConfig(this.repo, keys), model: modelOverride || (provider === 'openrouter' ? 'openai/gpt-4o-transcribe' : 'gpt-4o-transcribe') };
  }
  async initializeProvider(settings, existing) {
    if (['local', 'openai', 'openrouter', 'off'].includes(settings.transcribeProvider)) return false;
    const keys = { ...this.env, ...parse(await readFile(path.join(this.repo, '.env'), 'utf8').catch(() => '')) };
    const explicit = keys.MRMAK_TRANSCRIBE_PROVIDER?.trim().toLowerCase();
    // Preserve the effective pre-0.5.1 provider. New installations never choose
    // a billed service merely because an API key exists for another feature.
    const previous = keys.OPENROUTER_API_KEY || keys.OPENROUTER_KEY ? 'openrouter' : keys.OPENAI_API_KEY || keys.OPENAI_KEY ? 'openai' : 'off';
    settings.transcribeProvider = explicit ? (['local', 'openai', 'openrouter', 'off'].includes(explicit) ? explicit : 'off') : existing ? previous : 'local';
    return true;
  }
  async status() {
    const config = await this.config();
    const keys = { ...this.env, ...parse(await readFile(path.join(this.repo, '.env'), 'utf8').catch(() => '')) };
    const providers = [
      { id: 'local', label: 'Local Whisper · 免费', available: await this.localStatus(config.local), detail: '在你的电脑上运行，不产生 API 费用。' },
      { id: 'openai', label: 'OpenAI · 付费', available: !!(keys.OPENAI_API_KEY || keys.OPENAI_KEY), detail: '使用你的 OpenAI API 额度。' },
      { id: 'openrouter', label: 'OpenRouter · 付费', available: !!(keys.OPENROUTER_API_KEY || keys.OPENROUTER_KEY), detail: '使用你的 OpenRouter API 额度。' },
      { id: 'off', label: '关闭', available: true, detail: '已禁用麦克风听写。' },
    ];
    return { available: config.provider !== 'off' && !!providers.find(item => item.id === config.provider)?.available, provider: config.provider, providers, maxSeconds: RECORDING_SECONDS, maxBytes: AUDIO_LIMIT };
  }

  async transcribe(request, deviceId, authorized = () => true) {
    if (this.closed || !authorized()) fail('此手机已断开连接。', 401);
    const id = request.headers['x-transcription-id'];
    if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) fail('需要录音 ID。');
    const mime = String(request.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!formats[mime]) fail('不支持此音频格式。请改用键盘麦克风。', 415);
    if (Number(request.headers['content-length'] || 0) > AUDIO_LIMIT) fail('录音过大。请录制更短的消息。', 413);
    const chunks = []; let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > AUDIO_LIMIT) fail('录音过大。请录制更短的消息。', 413);
      chunks.push(chunk);
    }
    const audio = Buffer.concat(chunks);
    const valid = audio.length >= 12 && (mime === 'audio/webm' ? audio.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
      : mime === 'audio/mp4' ? audio.toString('ascii', 4, 8) === 'ftyp'
      : mime === 'audio/ogg' ? audio.toString('ascii', 0, 4) === 'OggS'
      : audio.toString('ascii', 0, 4) === 'RIFF' && audio.toString('ascii', 8, 12) === 'WAVE');
    if (!valid) fail('录音为空或已损坏。请重新录制。', 415);
    if (!authorized() || this.closed) fail('此手机已断开连接。', 401);
    const now = Date.now(), key = `${deviceId}:${id}`;
    for (const [key, job] of this.jobs) if (!job.pending && job.expires < now) this.jobs.delete(key);
    for (const [id, rate] of this.rates) if (rate.at + 60000 < now) this.rates.delete(id);
    const hash = createHash('sha256').update(mime).update(audio).digest('hex');
    const previous = this.jobs.get(key);
    if (previous) {
      if (previous.hash !== hash) fail('此录音 ID属于另一段音频。', 409);
      return previous.promise;
    }
    if (this.controllers.has(deviceId)) fail('另一段录音正在转写。请稍后重试。', 429);
    if (this.controllers.size >= 2) fail('转写正忙。请稍后重试。', 429);
    const rate = this.rates.get(deviceId) || { at: now, count: 0 };
    if (rate.count >= 6) fail('请等一分钟再转写下一段录音。', 429);
    const config = await this.config();
    if (config.provider === 'local' && !await this.localStatus(config.local)) fail('未安装 Local Whisper。请在电脑上运行本地听写设置。', 503);
    if (config.provider !== 'local' && !config.key) fail('语音输入需要在电脑工作区 .env 中配置 OPENROUTER_API_KEY 或 OPENAI_API_KEY。键盘麦克风仍可使用。', 503);
    // Recheck after the asynchronous config read, before reserving a paid request.
    if (!authorized() || this.closed) fail('此手机已断开连接。', 401);
    const completed = this.jobs.get(key);
    if (completed) {
      if (completed.hash !== hash) fail('此录音 ID属于另一段音频。', 409);
      return completed.promise;
    }
    if (this.controllers.has(deviceId)) {
      const existing = this.jobs.get(key);
      if (existing?.hash === hash) return existing.promise;
      fail('另一段录音正在转写。请稍后重试。', 429);
    }
    if (this.controllers.size >= 2) fail('转写正忙。请稍后重试。', 429);
    while (this.jobs.size >= 64) {
      const oldest = [...this.jobs].find(([, job]) => !job.pending);
      if (!oldest) break;
      this.jobs.delete(oldest[0]);
    }
    const currentRate = this.rates.get(deviceId) || rate;
    if (currentRate.count >= 6) fail('请等一分钟再转写下一段录音。', 429);
    currentRate.count++; this.rates.set(deviceId, currentRate);
    const controller = new AbortController(); this.controllers.set(deviceId, controller);
    const job = { hash, pending: true, expires: now + 10 * 60 * 1000 };
    job.promise = this.call(config, audio, mime, controller.signal).then(result => {
      if (!authorized() || this.closed) fail('此手机已断开连接。', 401);
      return result;
    }).catch(error => { this.jobs.delete(key); throw error; }).finally(() => {
      job.pending = false; this.controllers.delete(deviceId);
    });
    this.jobs.set(key, job);
    return job.promise;
  }
  async call({ provider, key, model, local }, audio, mime, signal) {
    if (provider === 'local') {
      const result = await this.localRunner(local, audio, formats[mime], signal);
      const text = typeof result?.text === 'string' ? result.text.trim() : '';
      if (!text) fail('未识别到语音。请重新录制。', 422);
      if (text.length > 60000) fail('转写文本过长，无法放入一条消息。', 413);
      return { text };
    }
    const form = new FormData();
    form.append('file', new Blob([audio], { type: mime }), `recording.${formats[mime]}`);
    form.append('model', model); form.append('response_format', 'json');
    if (model.includes('gpt-4o')) form.append('prompt', PROMPT);
    const url = provider === 'openrouter' ? 'https://openrouter.ai/api/v1/audio/transcriptions' : 'https://api.openai.com/v1/audio/transcriptions';
    let response, result;
    try {
      response = await this.fetcher(url, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.any([signal, AbortSignal.timeout(65000)]) });
      result = response.ok ? await response.json() : null;
    } catch { fail('转写未能完成。录音已保留在此手机上；请重试。', 502); }
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) fail('转写 API 密钥被拒绝。请在电脑上检查。', 502);
      if (response.status === 402 || response.status === 429) fail('转写账户已达到额度或用量上限。请稍后重试。', 429);
      fail('转写提供方无法处理此录音。请重试或录制更短的消息。', 502);
    }
    const text = typeof result?.text === 'string' ? result.text.trim() : '';
    if (!text) fail('未识别到语音。请重新录制。', 422);
    if (text.length > 60000) fail('转写文本过长，无法放入一条消息。', 413);
    return { text };
  }
  revoke(deviceId) {
    this.controllers.get(deviceId)?.abort();
    for (const key of this.jobs.keys()) if (key.startsWith(`${deviceId}:`)) this.jobs.delete(key);
  }
  close() { this.closed = true; for (const controller of this.controllers.values()) controller.abort(); this.jobs.clear(); }
}
