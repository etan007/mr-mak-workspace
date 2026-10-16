// Isolated workspace, fake microphone and transcription; no real agent input.
import { expect } from '@playwright/test';
import { launchBrowser } from './browser.mjs';
import { mkdtemp, mkdir, cp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createService } from '../server.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
await mkdir(path.join(root, '.cache'), { recursive: true });
const repo = await mkdtemp(path.join(root, '.cache/desktop-dictation-ui-'));
await mkdir(path.join(repo, 'workspace'));
await writeFile(path.join(repo, 'workspace/workspace.json'), '{"entities":[]}');
await cp(path.join(root, 'dist'), path.join(repo, 'ui'), { recursive: true });
await cp(path.join(root, 'public/assets'), path.join(repo, 'ui/assets'), { recursive: true });
const service = await createService({ repo, uiDir: path.join(repo, 'ui'), mcpOptions: { home: repo, env: {} } });
const session = service.sessions.make({ id: 'dictation-test', createdAt: new Date().toISOString(), cols: 90, rows: 32, name: 'Dictation test', agent: 'claude', cwd: repo, open: true });
const writes = [];
session.status = 'running'; session.process = { write: data => writes.push(data), resize() {}, kill() {} };
service.sessions.items.set(session.id, session);
let browser;
try {
  browser = await launchBrowser({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.addInitScript(() => {
    const original = MediaDevices.prototype.getUserMedia;
    MediaDevices.prototype.getUserMedia = async function (options) {
      try { return await original.call(this, options); } catch {
        const audio = new AudioContext(), tone = audio.createOscillator(), output = audio.createMediaStreamDestination();
        tone.connect(output); tone.start(); return output.stream;
      }
    };
  });
  await page.route('**/api/dictation', route => route.fulfill({ json: { available: true, provider: 'local', maxSeconds: 120, maxBytes: 8388608 } }));
  let selectedProvider = 'local';
  await page.unroute('**/api/dictation');
  await page.route('**/api/dictation', async route => { const data = route.request().postDataJSON(); if (data?.provider) selectedProvider = data.provider; return route.fulfill({ json: { available: true, provider: selectedProvider, maxSeconds: 120, maxBytes: 8388608, providers: [{ id: 'local', label: 'Local Whisper · Free', available: true, detail: 'Runs locally.' }, { id: 'openai', label: 'OpenAI · Paid', available: true, detail: 'Uses API credit.' }] } }); });
  let transcriptions = 0;
  await page.route('**/api/transcribe', route => { transcriptions++; return route.fulfill({ json: { text: 'Please review this draft.' } }); });
  await page.goto(service.urls.chats);
  await expect(page.getByRole('button', { name: '听写消息', exact: true })).toBeEnabled();
  await expect(page.getByRole('textbox', { name: '听写草稿' })).toHaveCount(0);
  await page.getByRole('button', { name: '听写消息', exact: true }).click();
  await expect(page.getByRole('button', { name: '停止录音并转写' })).toBeVisible();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: '停止录音并转写' }).click();
  await expect(page.getByRole('button', { name: '听写消息', exact: true })).toBeEnabled();
  assert.equal(transcriptions, 1);
  assert.ok(writes.includes('\x1b[200~Please review this draft.\x1b[201~'));
  assert.ok(!writes.includes('\r'));
  await page.getByRole('button', { name: '听写消息', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消录音' })).toBeVisible();
  await page.getByRole('button', { name: '取消录音' }).click();
  await expect(page.getByRole('button', { name: '听写消息', exact: true })).toBeEnabled();
  assert.equal(transcriptions, 1);
  await page.route('**/api/sessions/dictation-test/input', route => route.fulfill({ status: 503, json: { error: 'Test paste unavailable' } }));
  await page.getByRole('button', { name: '听写消息', exact: true }).click();
  await expect(page.getByRole('button', { name: '停止录音并转写' })).toBeVisible();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: '停止录音并转写' }).click();
  await expect(page.getByRole('button', { name: '转写录音', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Test paste unavailable');
  await page.unroute('**/api/sessions/dictation-test/input');
  await page.getByRole('button', { name: '转写录音', exact: true }).click();
  await expect(page.getByRole('button', { name: '听写消息', exact: true })).toBeEnabled();
  assert.equal(writes.filter(text => text === '\x1b[200~Please review this draft.\x1b[201~').length, 2);
  assert.ok(!writes.includes('\r'));
  await page.getByRole('button', { name: '手机访问', exact: true }).click();
  await expect(page.getByRole('heading', { name: '手机设置', exact: true })).toBeVisible();
  const provider = page.getByRole('combobox', { name: '听写服务' });
  await provider.selectOption('openai'); await expect(provider).toHaveValue('openai');
  await provider.selectOption('local'); await expect(provider).toHaveValue('local');
  await page.screenshot({ path: path.join(repo, 'desktop-dictation.png') });
  console.log(JSON.stringify({ ok: true, screenshot: path.join(repo, 'desktop-dictation.png'), checks: ['record', 'cancel', 'no extra panel', 'direct paste without Enter'] }));
} finally { await browser?.close(); await service.close(); }
