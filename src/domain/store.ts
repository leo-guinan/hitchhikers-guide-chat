import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { randomBytes, randomInt } from 'node:crypto';
import path from 'node:path';
import {
  type Account,
  type AuthSession,
  ContextRequestSchema,
  FutureAnalysisRequestSchema,
  type ChatMessage,
  type ChatTurn,
  type ContextRequest,
  type ContextRequestInput,
  type DiaryEntry,
  type DiaryPage,
  type FutureAnalysisRequest,
  type FutureAnalysisRequestInput,
  ImportSourceCreateSchema,
  type ImportedItem,
  type ImportedItemSearch,
  type ImportRunSummary,
  type ImportSource,
  type ImportSourceCreateInput,
} from './schema';
import { candidateToItem, fetchImportCandidates } from './imports';
import { sendSignInCodeEmail, type EmailDeliveryResult } from './email';

const dataDir = process.env.GUIDE_DATA_DIR ?? path.join(process.cwd(), 'data');
const requestDir = path.join(dataDir, 'requests');
const diaryDir = path.join(dataDir, 'diary');
const futureDir = path.join(dataDir, 'future-analysis');
const accountDir = path.join(dataDir, 'accounts');
const authCodeDir = path.join(dataDir, 'auth-codes');
const sessionDir = path.join(dataDir, 'sessions');
const importSourceDir = path.join(dataDir, 'imports', 'sources');
const importItemDir = path.join(dataDir, 'imports', 'items');
const requestLog = path.join(dataDir, 'context-requests.jsonl');
const futureLog = path.join(dataDir, 'future-analysis.jsonl');

export async function initStore(): Promise<void> {
  await mkdir(requestDir, { recursive: true });
  await mkdir(diaryDir, { recursive: true });
  await mkdir(futureDir, { recursive: true });
  await mkdir(accountDir, { recursive: true });
  await mkdir(authCodeDir, { recursive: true });
  await mkdir(sessionDir, { recursive: true });
  await mkdir(importSourceDir, { recursive: true });
  await mkdir(importItemDir, { recursive: true });
}

export function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export async function requestEmailCode(email: string): Promise<{ email: string; expiresAt: string; devCode?: string; delivery: EmailDeliveryResult }> {
  await initStore();
  const normalized = email.toLowerCase();
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  await writeFile(authCodePath(normalized), JSON.stringify({ email: normalized, code, expiresAt }, null, 2));
  const delivery = await sendSignInCodeEmail({ email: normalized, code, expiresAt });
  // Returning devCode keeps local/VPS auth testable when email delivery is not configured.
  // Once RESEND_API_KEY + GUIDE_EMAIL_FROM are set, the code is sent and no longer returned.
  return { email: normalized, expiresAt, delivery, devCode: delivery.sent ? undefined : code };
}

export async function verifyEmailCode(email: string, code: string): Promise<{ account: Account; session: AuthSession }> {
  await initStore();
  const normalized = email.toLowerCase();
  const record = JSON.parse(await readFile(authCodePath(normalized), 'utf8')) as { code: string; expiresAt: string };
  if (record.code !== code) throw new Error('Invalid sign-in code');
  if (Date.parse(record.expiresAt) < Date.now()) throw new Error('Sign-in code expired');
  const account = await upsertAccount(normalized);
  const createdAt = new Date().toISOString();
  const session: AuthSession = {
    token: `sess_${randomBytes(24).toString('hex')}`,
    accountId: account.id,
    email: account.email,
    createdAt,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(),
  };
  await writeFile(sessionPath(session.token), JSON.stringify(session, null, 2));
  return { account, session };
}

export async function getSessionAccount(token: string | undefined): Promise<Account | null> {
  if (!token) return null;
  await initStore();
  try {
    const session = JSON.parse(await readFile(sessionPath(token), 'utf8')) as AuthSession;
    if (Date.parse(session.expiresAt) < Date.now()) return null;
    return await getAccountByEmail(session.email);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function getAccountByEmail(email: string): Promise<Account | null> {
  await initStore();
  try {
    return JSON.parse(await readFile(accountPath(email.toLowerCase()), 'utf8')) as Account;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function markAccountPaid(email: string, stripe: { customerId?: string; subscriptionId?: string } = {}): Promise<Account> {
  const account = await upsertAccount(email.toLowerCase());
  const updated: Account = { ...account, paid: true, updatedAt: new Date().toISOString(), stripeCustomerId: stripe.customerId ?? account.stripeCustomerId, stripeSubscriptionId: stripe.subscriptionId ?? account.stripeSubscriptionId };
  await writeFile(accountPath(updated.email), JSON.stringify(updated, null, 2));
  return updated;
}

async function upsertAccount(email: string): Promise<Account> {
  const existing = await getAccountByEmail(email);
  if (existing) return existing;
  const createdAt = new Date().toISOString();
  const account: Account = { id: `acct_${hash(email).slice(0, 12)}`, email, createdAt, updatedAt: createdAt, paid: false };
  await writeFile(accountPath(email), JSON.stringify(account, null, 2));
  return account;
}

export async function createContextRequest(input: ContextRequestInput): Promise<ContextRequest> {
  await initStore();
  const parsed = ContextRequestSchema.parse(input);
  const createdAt = new Date().toISOString();
  const id = `ctx_${createdAt.replace(/[-:.TZ]/g, '').slice(0, 14)}_${hash(`${parsed.sessionId}|${parsed.userMessage}|${createdAt}`).slice(0, 8)}`;
  const request: ContextRequest = { ...parsed, id, createdAt, status: 'open' };
  await writeFile(path.join(requestDir, `${id}.json`), JSON.stringify(request, null, 2));
  await appendFile(requestLog, `${JSON.stringify(request)}\n`);
  return request;
}

export async function listContextRequests(): Promise<ContextRequest[]> {
  await initStore();
  try {
    const text = await readFile(requestLog, 'utf8');
    return text.split('\n').filter(Boolean).map((line) => JSON.parse(line) as ContextRequest).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

export async function getDiaryPage(day: string, sessionId = 'anonymous'): Promise<DiaryPage> {
  await initStore();
  const file = diaryPath(day);
  try {
    return JSON.parse(await readFile(file, 'utf8')) as DiaryPage;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const now = new Date().toISOString();
    return { day, sessionId, createdAt: now, updatedAt: now, turns: [] };
  }
}

export async function appendDiaryTurn(day: string, sessionId: string, message: ChatMessage): Promise<DiaryPage> {
  const page = await getDiaryPage(day, sessionId);
  const createdAt = new Date().toISOString();
  const turn: ChatTurn = {
    ...message,
    id: `turn_${createdAt.replace(/[-:.TZ]/g, '').slice(0, 17)}_${hash(`${day}|${sessionId}|${message.role}|${message.content}|${page.turns.length}`).slice(0, 8)}`,
    createdAt,
  };
  const next: DiaryPage = {
    ...page,
    sessionId: page.sessionId || sessionId,
    updatedAt: createdAt,
    turns: [...page.turns, turn],
  };
  await saveDiaryPage(next);
  return next;
}

export async function saveDiaryEntry(day: string, sessionId: string, entry: DiaryEntry): Promise<DiaryPage> {
  const page = await getDiaryPage(day, sessionId);
  const next = { ...page, sessionId: page.sessionId || sessionId, updatedAt: new Date().toISOString(), entry };
  await saveDiaryPage(next);
  return next;
}

export async function searchDiaryPages(query = ''): Promise<DiaryPage[]> {
  await initStore();
  const files = await readdir(diaryDir).catch(() => [] as string[]);
  const pages = await Promise.all(files.filter((file) => file.endsWith('.json')).map(async (file) => JSON.parse(await readFile(path.join(diaryDir, file), 'utf8')) as DiaryPage));
  const q = query.trim().toLowerCase();
  const filtered = q
    ? pages.filter((page) => diarySearchText(page).includes(q))
    : pages;
  return filtered.sort((a, b) => b.day.localeCompare(a.day));
}

export async function createFutureAnalysisRequest(input: FutureAnalysisRequestInput): Promise<FutureAnalysisRequest> {
  await initStore();
  const parsed = FutureAnalysisRequestSchema.parse(input);
  const page = await getDiaryPage(parsed.day, parsed.sessionId);
  const contextRequest = await createContextRequest({
    sessionId: parsed.sessionId,
    userMessage: parsed.question || `Review diary page ${parsed.day}`,
    missingContext: `Future analysis for diary page ${parsed.day}. Read ${page.turns.length} chat turns, wait ${parsed.delay}, then add slow human context: patterns, overlooked commitments, missing facts, and one useful question for the user to answer later.`,
    urgency: parsed.delay === '24h' ? 'soon' : 'normal',
    contact: parsed.contact,
    source: 'future-analysis',
    diaryDay: parsed.day,
  });
  const createdAt = new Date().toISOString();
  const request: FutureAnalysisRequest = {
    ...parsed,
    id: `future_${createdAt.replace(/[-:.TZ]/g, '').slice(0, 14)}_${hash(`${parsed.sessionId}|${parsed.day}|${createdAt}`).slice(0, 8)}`,
    createdAt,
    status: 'queued',
    diaryEntryId: page.entry?.id,
    contextRequestId: contextRequest.id,
  };
  await writeFile(path.join(futureDir, `${request.id}.json`), JSON.stringify({ ...request, diary: page }, null, 2));
  await appendFile(futureLog, `${JSON.stringify(request)}\n`);
  return request;
}

export async function createImportSource(accountId: string, input: ImportSourceCreateInput): Promise<ImportSource> {
  await initStore();
  const parsed = ImportSourceCreateSchema.parse(input);
  const now = new Date().toISOString();
  const source: ImportSource = {
    id: `src_${hash(`${accountId}|${parsed.kind}|${parsed.label}|${parsed.url ?? parsed.handle ?? now}`).slice(0, 12)}`,
    accountId,
    kind: parsed.kind,
    label: parsed.label,
    url: parsed.url,
    handle: parsed.handle,
    seedItems: parsed.items as ImportSource['seedItems'],
    createdAt: now,
    updatedAt: now,
  };
  await writeFile(importSourcePath(accountId, source.id), JSON.stringify(source, null, 2));
  return source;
}

export async function listImportSources(accountId: string): Promise<ImportSource[]> {
  await initStore();
  const files = await readdir(importSourceDir).catch(() => [] as string[]);
  const prefix = `${hash(accountId)}__`;
  const sources = await Promise.all(files.filter((file) => file.startsWith(prefix) && file.endsWith('.json')).map(async (file) => JSON.parse(await readFile(path.join(importSourceDir, file), 'utf8')) as ImportSource));
  return sources.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getImportSource(accountId: string, sourceId: string): Promise<ImportSource | null> {
  await initStore();
  try {
    const source = JSON.parse(await readFile(importSourcePath(accountId, sourceId), 'utf8')) as ImportSource;
    return source.accountId === accountId ? source : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function runImportSource(accountId: string, sourceId: string, limit = 50): Promise<{ source: ImportSource; summary: ImportRunSummary; items: ImportedItem[] }> {
  const source = await getImportSource(accountId, sourceId);
  if (!source) throw new Error('Import source not found');
  const existing = new Set((await listImportedItems(accountId, { limit: 10_000 })).map((item) => item.id));
  let failed = 0;
  let candidates: Awaited<ReturnType<typeof fetchImportCandidates>> = [];
  try {
    candidates = await fetchImportCandidates(source, limit);
  } catch {
    failed = 1;
  }
  const now = new Date().toISOString();
  const imported: ImportedItem[] = [];
  let skipped = 0;
  for (const candidate of candidates) {
    const item = candidateToItem(accountId, source, candidate, now);
    if (existing.has(item.id)) {
      skipped += 1;
      continue;
    }
    await writeFile(importItemPath(accountId, item.id), JSON.stringify(item, null, 2));
    existing.add(item.id);
    imported.push(item);
  }
  const summary: ImportRunSummary = { imported: imported.length, skipped, failed, message: failed ? 'Source fetch failed; no new items imported.' : undefined };
  const updated: ImportSource = { ...source, updatedAt: now, lastRunAt: now, lastRun: summary };
  await writeFile(importSourcePath(accountId, sourceId), JSON.stringify(updated, null, 2));
  return { source: updated, summary, items: imported };
}

export async function listImportedItems(accountId: string, search: Partial<ImportedItemSearch> = {}): Promise<ImportedItem[]> {
  await initStore();
  const files = await readdir(importItemDir).catch(() => [] as string[]);
  const prefix = `${hash(accountId)}__`;
  const q = (search.query ?? '').trim().toLowerCase();
  const sourceId = search.sourceId;
  const limit = search.limit ?? 50;
  const items = await Promise.all(files.filter((file) => file.startsWith(prefix) && file.endsWith('.json')).map(async (file) => JSON.parse(await readFile(path.join(importItemDir, file), 'utf8')) as ImportedItem));
  return items
    .filter((item) => !sourceId || item.sourceId === sourceId)
    .filter((item) => !q || importedItemSearchText(item).includes(q))
    .sort((a, b) => (b.createdAt ?? b.importedAt).localeCompare(a.createdAt ?? a.importedAt))
    .slice(0, limit);
}

async function saveDiaryPage(page: DiaryPage): Promise<void> {
  await initStore();
  await writeFile(diaryPath(page.day), JSON.stringify(page, null, 2));
}

function diaryPath(day: string): string {
  return path.join(diaryDir, `${day}.json`);
}

function accountPath(email: string): string {
  return path.join(accountDir, `${hash(email)}.json`);
}

function authCodePath(email: string): string {
  return path.join(authCodeDir, `${hash(email)}.json`);
}

function sessionPath(token: string): string {
  return path.join(sessionDir, `${hash(token)}.json`);
}

function importSourcePath(accountId: string, sourceId: string): string {
  return path.join(importSourceDir, `${hash(accountId)}__${sourceId}.json`);
}

function importItemPath(accountId: string, itemId: string): string {
  return path.join(importItemDir, `${hash(accountId)}__${itemId}.json`);
}

function diarySearchText(page: DiaryPage): string {
  return [
    page.day,
    page.entry?.title,
    page.entry?.summary,
    ...(page.entry?.keyQuestions ?? []),
    ...(page.entry?.openLoops ?? []),
    ...(page.entry?.humanContextNeeded ?? []),
    ...page.turns.map((turn) => turn.content),
  ].filter(Boolean).join('\n').toLowerCase();
}

function importedItemSearchText(item: ImportedItem): string {
  return [item.title, item.text, item.url, item.sourceLabel, item.sourceKind, item.day].filter(Boolean).join('\n').toLowerCase();
}

function hash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
