import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
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
} from './schema';

const dataDir = process.env.GUIDE_DATA_DIR ?? path.join(process.cwd(), 'data');
const requestDir = path.join(dataDir, 'requests');
const diaryDir = path.join(dataDir, 'diary');
const futureDir = path.join(dataDir, 'future-analysis');
const requestLog = path.join(dataDir, 'context-requests.jsonl');
const futureLog = path.join(dataDir, 'future-analysis.jsonl');

export async function initStore(): Promise<void> {
  await mkdir(requestDir, { recursive: true });
  await mkdir(diaryDir, { recursive: true });
  await mkdir(futureDir, { recursive: true });
}

export function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
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

async function saveDiaryPage(page: DiaryPage): Promise<void> {
  await initStore();
  await writeFile(diaryPath(page.day), JSON.stringify(page, null, 2));
}

function diaryPath(day: string): string {
  return path.join(diaryDir, `${day}.json`);
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

function hash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
