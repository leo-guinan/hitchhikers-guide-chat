import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);

type HttpResult = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

type Step = {
  name: string;
  ok: boolean;
  method?: string;
  path?: string;
  status?: number;
  sees?: PageView;
  error?: string;
  details?: Record<string, unknown>;
};

type PageView = {
  title?: string;
  h1?: string;
  controls: string[];
  excerpt: string;
};

const targetEnv = process.env.TARGET_ENV ?? 'staging';
const vpsHost = process.env.VPS_HOST ?? 'arc-vps';
const port = Number(process.env.PORT ?? '4143');
const appDir = process.env.APP_DIR ?? '/opt/hitchhikers-guide-chat-staging';
const outDir = process.env.AGENT_OUT_DIR ?? path.join(process.cwd(), 'dogfood-output', 'new-user-agent');
const runId = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const email = process.env.AGENT_EMAIL ?? `new-user-agent+${runId.toLowerCase()}@example.test`;
const day = new Date().toISOString().slice(0, 10);

const steps: Step[] = [];
let token = '';
let accountId = '';

async function main() {
  guardStaging();
  await mkdir(outDir, { recursive: true });

  await recordPage('cover page', 'GET', '/');
  await recordPage('boarding page', 'GET', '/enter');
  await recordPage('sealed app page before auth', 'GET', '/app');

  await expectApiError('invalid email validation', '/auth/request-code', { email: 'not-an-email' }, 400);

  const codeResponse = await apiJson('request sign-in code', '/auth/request-code', { email });
  const devCode = asRecord(codeResponse).devCode;
  if (typeof devCode !== 'string' || !/^\d{6}$/.test(devCode)) throw new Error('Sign-in code response did not include a testable devCode. Staging email delivery may be configured; use a test inbox or disable RESEND for staging.');

  const verifyResponse = await apiJson('verify sign-in code', '/auth/verify', { email, code: devCode });
  token = String(asRecord(verifyResponse).token ?? '');
  const account = asRecord(asRecord(verifyResponse).account);
  accountId = String(account.id ?? '');
  if (!token || !accountId) throw new Error('Auth verify did not return token/account id.');
  addStep('new user sees unpaid account after email sign-in', true, { account });

  await expectApiError('chat is blocked before payment', '/chat', { sessionId: 'agent-before-payment', message: 'Can I use the guide before paying?', day }, 402, token);
  const checkout = await post('/checkout/session', { sessionId: accountId, email, successUrl: 'http://127.0.0.1:4143/app?checkout=success', cancelUrl: 'http://127.0.0.1:4143/enter?checkout=cancelled' }, token);
  addStep('new user attempts checkout', checkout.status === 201 || checkout.status === 503, { status: checkout.status, body: safeJson(checkout.body) ?? checkout.body.slice(0, 500) });

  await markPaidInStaging(email);
  const me = await getJson('/auth/me', token);
  const paid = Boolean(asRecord(asRecord(me).account).paid);
  addStep('operator confirms staging-only payment state', paid, { account: asRecord(me).account });
  if (!paid) throw new Error('Staging account was not marked paid.');

  await recordPage('app page after payment shell', 'GET', '/app');

  const chat = await apiJson('paid user sends first chat', '/chat', { sessionId: accountId, message: 'I am a new user. What should I do first, and what context do you need from me?', day }, token);
  const chatRecord = asRecord(chat);
  addStep('new user sees guide answer', typeof chatRecord.answer === 'string' && chatRecord.answer.length > 20, {
    answerExcerpt: String(chatRecord.answer ?? '').slice(0, 500),
    needsHumanContext: chatRecord.needsHumanContext,
    diary: chatRecord.diary,
  });

  const context = await apiJson('new user requests human context', '/context-requests', {
    sessionId: accountId,
    userMessage: 'Please help me connect my past writing to this diary.',
    missingContext: 'Find the most relevant prior public essays for a new Guide account.',
    urgency: 'normal',
    source: 'manual',
    diaryDay: day,
  }, token);
  addStep('new user sees human request receipt', Boolean(asRecord(asRecord(context).request).id), { request: asRecord(context).request });

  const future = await apiJson('new user sends chat log to future', '/future-analysis', { sessionId: accountId, day, delay: '24h', question: 'What did I miss in my first session?' }, token);
  addStep('new user sees future-analysis receipt', Boolean(asRecord(asRecord(future).request).id), { request: asRecord(future).request });

  const compressed = await apiJson('new user compresses today into diary entry', `/diary/${day}/compress`, { sessionId: accountId }, token);
  const entry = asRecord(compressed).entry;
  addStep('new user sees compressed diary receipt', Boolean(asRecord(entry).id), { entry });

  const diary = await getJson(`/diary?query=${encodeURIComponent('new user')}`, token);
  const pages = asArray(asRecord(diary).pages);
  addStep('new user searches atlas', pages !== null, { pageCount: pages?.length ?? null });

  await recordPage('imports page shell', 'GET', '/imports');
  const source = await apiJson('new user adds x archive seed source', '/imports/sources', {
    kind: 'x_archive_json',
    label: `Agent seed ${runId}`,
    items: [{
      externalId: runId,
      url: 'https://example.test/agent-seed',
      title: 'First imported artifact from the new-user agent',
      text: 'This is a staging-only artifact used to prove a new user can bring old work aboard.',
      createdAt: day,
    }],
  }, token);
  const sourceId = String(asRecord(asRecord(source).source).id ?? '');
  addStep('new user sees import source added', Boolean(sourceId), { source: asRecord(source).source });

  const run = await apiJson('new user runs import source', `/imports/sources/${sourceId}/run`, { limit: 5 }, token);
  addStep('new user sees import run receipt', Number(asRecord(asRecord(run).summary).imported ?? 0) >= 1, { summary: asRecord(run).summary });

  const items = await getJson(`/imports/items?query=${encodeURIComponent('staging-only artifact')}&limit=10`, token);
  const importedItems = asArray(asRecord(items).items);
  addStep('new user searches imported artifacts', Boolean(importedItems && importedItems.length >= 1), { itemCount: importedItems?.length ?? null });

  await assertStagingFiles();
  await writeReport();

  const failed = steps.filter((step) => !step.ok);
  if (failed.length) {
    console.error(`NEW_USER_AGENT_FAIL failures=${failed.length} report=${path.join(outDir, `${runId}.report.md`)}`);
    process.exit(1);
  }
  console.log(`NEW_USER_AGENT_PASS email=${email} steps=${steps.length} report=${path.join(outDir, `${runId}.report.md`)}`);
}

function guardStaging() {
  if (targetEnv !== 'staging') throw new Error('new-user agent refuses to run unless TARGET_ENV=staging');
  if (port !== 4143) throw new Error(`new-user agent refuses non-staging port: ${port}`);
  if (!appDir.includes('staging')) throw new Error(`new-user agent refuses non-staging app dir: ${appDir}`);
}

async function recordPage(name: string, method: string, route: string) {
  const result = await request(route, { method });
  const sees = inspectHtml(result.body);
  addStep(name, result.status >= 200 && result.status < 400 && sees.excerpt.length > 0, { method, path: route, status: result.status, sees });
}

async function apiJson(name: string, route: string, body: unknown, bearer = token): Promise<unknown> {
  const result = await post(route, body, bearer);
  const parsed = safeJson(result.body);
  const ok = Boolean(result.status >= 200 && result.status < 300 && parsed && typeof parsed === 'object' && !('error' in parsed));
  addStep(name, ok, { method: 'POST', path: route, status: result.status, response: parsed ?? result.body.slice(0, 500) });
  if (!ok) throw new Error(`${name} failed: HTTP ${result.status} ${result.body.slice(0, 500)}`);
  return parsed;
}

async function expectApiError(name: string, route: string, body: unknown, expectedStatus: number, bearer = '') {
  const result = await post(route, body, bearer);
  addStep(name, result.status === expectedStatus, { method: 'POST', path: route, status: result.status, response: safeJson(result.body) ?? result.body.slice(0, 500) });
}

async function getJson(route: string, bearer = token): Promise<unknown> {
  const result = await request(route, { method: 'GET', bearer });
  const parsed = safeJson(result.body);
  if (result.status < 200 || result.status >= 300 || !parsed) throw new Error(`GET ${route} failed: HTTP ${result.status} ${result.body.slice(0, 500)}`);
  return parsed;
}

async function post(route: string, body: unknown, bearer = ''): Promise<HttpResult> {
  return request(route, { method: 'POST', body: JSON.stringify(body), bearer });
}

async function request(route: string, options: { method: string; body?: string; bearer?: string }): Promise<HttpResult> {
  const args = ['-fsS', '-i', '-X', options.method, `http://127.0.0.1:${port}${route}`];
  if (options.bearer) args.push('-H', `Authorization: Bearer ${options.bearer}`);
  if (options.body !== undefined) args.push('-H', 'Content-Type: application/json', '--data-binary', options.body);
  const remote = ['curl', ...args.map(shellQuote)].join(' ');
  try {
    const { stdout } = await execFile('ssh', [vpsHost, remote], { maxBuffer: 2_000_000 });
    return parseCurlResponse(stdout);
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string; code?: number };
    if (err.stdout) return parseCurlResponse(err.stdout);
    throw new Error(`curl failed for ${route}: ${err.message} ${err.stderr ?? ''}`);
  }
}

async function markPaidInStaging(accountEmail: string) {
  const script = `
set -euo pipefail
python3 - <<'PY'
import json
from pathlib import Path
email = ${JSON.stringify(accountEmail)}
account_dir = Path(${JSON.stringify(`${appDir}/data/accounts`)})
for path in account_dir.glob('*.json'):
    data = json.loads(path.read_text())
    if data.get('email') == email:
        data['paid'] = True
        data['stripeCustomerId'] = 'staging_agent_customer'
        data['stripeSubscriptionId'] = 'staging_agent_subscription'
        path.write_text(json.dumps(data, indent=2) + '\\n')
        print(path)
        raise SystemExit(0)
raise SystemExit('account not found')
PY`;
  const { stdout } = await execFile('ssh', [vpsHost, script], { maxBuffer: 200_000 });
  addStep('operator marks account paid in staging data only', stdout.trim().includes('/accounts/'), { accountFile: stdout.trim() });
}

async function assertStagingFiles() {
  const remote = `set -euo pipefail; test -d ${shellQuote(`${appDir}/data/diary`)}; test -d ${shellQuote(`${appDir}/data/imports/items`)}; find ${shellQuote(`${appDir}/data`)} -maxdepth 3 -type f | wc -l`;
  const { stdout } = await execFile('ssh', [vpsHost, remote], { maxBuffer: 200_000 });
  const fileCount = Number(stdout.trim());
  addStep('agent artifacts landed in staging data dir', fileCount > 3, { fileCount, appDir });
}

function parseCurlResponse(raw: string): HttpResult {
  const normalized = raw.replace(/\r\n/g, '\n');
  const parts = normalized.split('\n\n');
  const body = parts.pop() ?? '';
  const headerText = parts.reverse().find((part) => /^HTTP\//.test(part)) ?? '';
  const lines = headerText.split('\n').filter(Boolean);
  const status = Number(lines[0]?.match(/HTTP\/\S+\s+(\d+)/)?.[1] ?? 0);
  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(':');
    if (idx > 0) headers[line.slice(0, idx).toLowerCase()] = line.slice(idx + 1).trim();
  }
  return { status, headers, body };
}

function inspectHtml(html: string): PageView {
  const title = textOf(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  const visibleHtml = html.split('<div class="book-overlay"')[0] ?? html;
  const h1 = textOf(visibleHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
  const controls = Array.from(visibleHtml.matchAll(/<(button|a|input|textarea|select)\b([^>]*)>([\s\S]*?)<\/(button|a|textarea|select)>|<(input)\b([^>]*)>/gi))
    .map((match) => textOf(match[3]) || attr(match[2] ?? match[6] ?? '', 'placeholder') || attr(match[2] ?? match[6] ?? '', 'aria-label') || attr(match[2] ?? match[6] ?? '', 'href'))
    .filter(Boolean)
    .slice(0, 12);
  const excerpt = textOf(visibleHtml).slice(0, 900);
  return { title, h1, controls, excerpt };
}

function textOf(value = ''): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function attr(attrs: string, name: string): string {
  return attrs.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'))?.[1] ?? '';
}

function safeJson(body: string): unknown | null {
  try { return JSON.parse(body); } catch { return null; }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function addStep(name: string, ok: boolean, details: Record<string, unknown> = {}) {
  steps.push({ name, ok, ...details });
}

async function writeReport() {
  const jsonPath = path.join(outDir, `${runId}.json`);
  const reportPath = path.join(outDir, `${runId}.report.md`);
  const failed = steps.filter((step) => !step.ok);
  await writeFile(jsonPath, JSON.stringify({ runId, targetEnv, vpsHost, port, appDir, email, steps }, null, 2));
  await writeFile(reportPath, [
    `# New User Agent Report`,
    ``,
    `- run: ${runId}`,
    `- env: ${targetEnv}`,
    `- base: ssh ${vpsHost} curl http://127.0.0.1:${port}`,
    `- email: ${email}`,
    `- result: ${failed.length ? `FAIL (${failed.length})` : 'PASS'}`,
    ``,
    `## Steps`,
    ...steps.map((step, index) => [
      ``,
      `### ${index + 1}. ${step.ok ? 'PASS' : 'FAIL'} — ${step.name}`,
      step.path ? `- route: ${step.method ?? ''} ${step.path}` : '',
      typeof step.status === 'number' ? `- status: ${step.status}` : '',
      step.sees ? `- sees h1: ${step.sees.h1 ?? '—'}\n- sees controls: ${step.sees.controls.join(' | ') || '—'}\n- excerpt: ${step.sees.excerpt}` : '',
      step.error ? `- error: ${step.error}` : '',
      step.details ? `- details: \`${JSON.stringify(step.details).slice(0, 1200)}\`` : '',
    ].filter(Boolean).join('\n')),
    ``,
    `## Raw JSON`,
    jsonPath,
    ``,
  ].join('\n'));
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

main().catch(async (error) => {
  addStep('agent runtime', false, { error: (error as Error).message });
  await mkdir(outDir, { recursive: true }).catch(() => undefined);
  await writeReport().catch(() => undefined);
  console.error(error);
  process.exit(1);
});
