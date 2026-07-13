import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { ChatTurn, DiaryEntry, DiaryPage, ImportedItem, ImportSource } from './schema';
import { installDiaryPages } from './substack-diary';

export type XArchiveBackloadOptions = {
  tweetsFile: string;
  noteTweetsFile?: string;
  target: string;
  accountId: string;
  label?: string;
  handle?: string;
  limit?: number;
  includeRetweets?: boolean;
};

export type XArchiveBackloadManifest = {
  kind: 'x_archive_import_backload';
  generatedAt: string;
  accountId: string;
  label: string;
  handle?: string;
  tweetsFile: string;
  noteTweetsFile?: string;
  totalCandidates: number;
  imported: number;
  skippedExisting: number;
  skippedRetweets: number;
  sourceId: string;
  sourcePath: string;
  itemsDir: string;
  dateRange: { min: string | null; max: string | null };
};

export type XImportDiaryBackfillManifest = {
  kind: 'x_imports_diary_backfill';
  generatedAt: string;
  accountId: string;
  sourceLabel: string;
  totalItems: number;
  diaryPageCount: number;
  installedPageCount: number;
  skippedTurnCount: number;
  dateRange: { min: string | null; max: string | null };
};

type XArchiveCandidate = {
  externalId: string;
  url?: string;
  title: string;
  text: string;
  createdAt: string;
};

export async function backloadXArchiveToImports(options: XArchiveBackloadOptions): Promise<XArchiveBackloadManifest> {
  const target = path.resolve(options.target);
  const label = options.label ?? 'X / Twitter archive';
  const generatedAt = new Date().toISOString();
  const importSourceDir = path.join(target, 'data', 'imports', 'sources');
  const importItemDir = path.join(target, 'data', 'imports', 'items');
  const backloadDir = path.join(target, 'data', 'backloads');
  await mkdir(importSourceDir, { recursive: true });
  await mkdir(importItemDir, { recursive: true });
  await mkdir(backloadDir, { recursive: true });

  const parsedTweets = await parseXArchiveTweets(options.tweetsFile, options.handle);
  const parsedNotes = options.noteTweetsFile ? await parseXArchiveNoteTweets(options.noteTweetsFile, options.handle) : [];
  let skippedRetweets = 0;
  const candidates = dedupeCandidates([...parsedTweets, ...parsedNotes]).filter((candidate) => {
    const isRetweet = /^RT\s+@/i.test(candidate.text);
    if (!options.includeRetweets && isRetweet) {
      skippedRetweets += 1;
      return false;
    }
    return true;
  }).slice(0, options.limit ?? Number.POSITIVE_INFINITY);

  const sourceId = `src_${hash(`${options.accountId}|x_archive_json|${label}`).slice(0, 12)}`;
  const source: ImportSource = {
    id: sourceId,
    accountId: options.accountId,
    kind: 'x_archive_json',
    label,
    handle: options.handle,
    createdAt: generatedAt,
    updatedAt: generatedAt,
    lastRunAt: generatedAt,
  };

  let imported = 0;
  let skippedExisting = 0;
  const days: string[] = [];
  for (const candidate of candidates) {
    const item = candidateToImportedItem(options.accountId, source, candidate, generatedAt);
    days.push(item.day);
    const itemPath = importItemPath(importItemDir, options.accountId, item.id);
    if (await exists(itemPath)) {
      skippedExisting += 1;
      continue;
    }
    await writeFile(itemPath, `${JSON.stringify(item, null, 2)}\n`);
    imported += 1;
  }

  source.lastRun = { imported, skipped: skippedExisting, failed: 0, message: `Backloaded ${imported} tweets from a local X archive.` };
  const sourcePath = importSourcePath(importSourceDir, options.accountId, sourceId);
  await writeFile(sourcePath, `${JSON.stringify(source, null, 2)}\n`);

  const sortedDays = days.sort();
  const manifest: XArchiveBackloadManifest = {
    kind: 'x_archive_import_backload',
    generatedAt,
    accountId: options.accountId,
    label,
    handle: options.handle,
    tweetsFile: path.resolve(options.tweetsFile),
    noteTweetsFile: options.noteTweetsFile ? path.resolve(options.noteTweetsFile) : undefined,
    totalCandidates: parsedTweets.length + parsedNotes.length,
    imported,
    skippedExisting,
    skippedRetweets,
    sourceId,
    sourcePath: path.relative(target, sourcePath),
    itemsDir: path.relative(target, importItemDir),
    dateRange: { min: sortedDays[0] ?? null, max: sortedDays[sortedDays.length - 1] ?? null },
  };
  await writeFile(path.join(backloadDir, 'x-archive-import-backload-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}


export async function backfillXImportedItemsToDiary(options: { items: ImportedItem[]; accountId: string; dataDir: string; sourceLabel?: string }): Promise<XImportDiaryBackfillManifest> {
  const sourceLabel = options.sourceLabel ?? 'Leo X archive';
  const generatedAt = new Date().toISOString();
  const xItems = options.items
    .filter((item) => item.accountId === options.accountId)
    .filter((item) => item.sourceKind === 'x_archive_json')
    .filter((item) => item.sourceLabel === sourceLabel)
    .filter((item) => !/^RT\s+@/i.test(item.text));
  const pages = xImportedItemsToDiaryPages(xItems, { accountId: options.accountId, generatedAt, sourceLabel });
  const install = await installDiaryPages(pages, options.dataDir);
  const days = pages.map((page) => page.day).sort();
  const manifest: XImportDiaryBackfillManifest = {
    kind: 'x_imports_diary_backfill',
    generatedAt,
    accountId: options.accountId,
    sourceLabel,
    totalItems: xItems.length,
    diaryPageCount: pages.length,
    installedPageCount: install.installedPageCount,
    skippedTurnCount: install.skippedTurnCount,
    dateRange: { min: days[0] ?? null, max: days[days.length - 1] ?? null },
  };
  await mkdir(path.join(options.dataDir, 'backloads'), { recursive: true });
  await writeFile(path.join(options.dataDir, 'backloads', 'x-imports-diary-backfill-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export function xImportedItemsToDiaryPages(items: ImportedItem[], options: { accountId: string; generatedAt?: string; sourceLabel?: string }): DiaryPage[] {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const sourceLabel = options.sourceLabel ?? 'Leo X archive';
  const grouped = new Map<string, ImportedItem[]>();
  for (const item of items.filter((item) => item.day && item.text)) {
    grouped.set(item.day, [...(grouped.get(item.day) ?? []), item]);
  }
  return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([day, dayItems]) => {
    const sorted = dayItems.slice().sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id));
    const turns = sorted.map((item) => xImportedItemTurn(item, sourceLabel));
    const totalWords = sorted.reduce((sum, item) => sum + item.wordCount, 0);
    const sample = sorted.slice(0, 5);
    const entry: DiaryEntry = {
      id: `entry_${day}_x_${hash(sorted.map((item) => item.id).join('|')).slice(0, 10)}`,
      day,
      createdAt: sorted[0]?.createdAt ?? generatedAt,
      updatedAt: generatedAt,
      title: sorted.length === 1 ? sorted[0].title : `X archive: ${sorted.length} tweets`,
      summary: sorted.length === 1
        ? `${day}: X archive import of one tweet (${sorted[0].wordCount} words). ${snippet(sorted[0].text, 240)}`
        : `${day}: X archive import of ${sorted.length} tweets (${totalWords} total words). Samples: ${sample.map((item) => `“${snippet(item.text, 120)}”`).join(' / ')}.`,
      keyQuestions: unique(sorted.flatMap((item) => extractQuestions(item.text))).slice(0, 12),
      openLoops: [],
      humanContextNeeded: [],
      turnCount: turns.length,
      sourceTurnIds: turns.map((turn) => turn.id),
    };
    return {
      day,
      sessionId: options.accountId,
      createdAt: sorted[0]?.createdAt ?? `${day}T00:00:00.000Z`,
      updatedAt: generatedAt,
      turns,
      entry,
    };
  });
}

function xImportedItemTurn(item: ImportedItem, sourceLabel: string): ChatTurn {
  return {
    id: `turn_${item.day.replace(/-/g, '')}_x_${hash(item.id).slice(0, 10)}`,
    role: 'user',
    createdAt: item.createdAt ?? `${item.day}T00:00:00.000Z`,
    content: [
      `Backfilled X archive item: ${item.title}`,
      `Source: ${sourceLabel}`,
      item.url ? `Source URL: ${item.url}` : undefined,
      `Words: ${item.wordCount}`,
      '',
      item.text,
    ].filter((part) => part !== undefined).join('\n'),
  };
}

export async function parseXArchiveTweets(filePath: string, handle?: string): Promise<XArchiveCandidate[]> {
  const records = parseJsArray(await readFile(filePath, 'utf8'));
  return records.map((raw, index) => normalizeTweetRecord(raw, index, handle)).filter((item): item is XArchiveCandidate => item !== null);
}

export async function parseXArchiveNoteTweets(filePath: string, handle?: string): Promise<XArchiveCandidate[]> {
  const records = parseJsArray(await readFile(filePath, 'utf8'));
  return records.map((raw, index) => normalizeNoteTweetRecord(raw, index, handle)).filter((item): item is XArchiveCandidate => item !== null);
}

function normalizeTweetRecord(raw: unknown, index: number, handle?: string): XArchiveCandidate | null {
  const tweet = asRecord(asRecord(raw).tweet ?? raw);
  const text = cleanText(asString(tweet.full_text) || asString(tweet.text) || '');
  if (!text) return null;
  const createdAt = parseDate(asString(tweet.created_at) || asString(tweet.createdAt));
  const id = cleanText(asString(tweet.id_str) || asString(tweet.id) || hash(`${createdAt}|${text}|${index}`).slice(0, 16));
  const author = cleanHandle(asString(tweet.screen_name) || handle || '');
  return {
    externalId: `tweet:${id}`,
    url: tweetUrl(author, id),
    title: `Tweet ${createdAt.slice(0, 10)} · ${id}`,
    text,
    createdAt,
  };
}

function normalizeNoteTweetRecord(raw: unknown, index: number, handle?: string): XArchiveCandidate | null {
  const note = asRecord(asRecord(raw).noteTweet ?? raw);
  const core = asRecord(note.core);
  const text = cleanText(asString(core.text) || '');
  if (!text) return null;
  const createdAt = parseDate(asString(note.createdAt) || asString(note.created_at));
  const id = cleanText(asString(note.noteTweetId) || asString(note.id) || hash(`${createdAt}|${text}|${index}`).slice(0, 16));
  const author = cleanHandle(handle || '');
  return {
    externalId: `note_tweet:${id}`,
    url: tweetUrl(author, id),
    title: `Long-form tweet ${createdAt.slice(0, 10)} · ${id}`,
    text,
    createdAt,
  };
}

function parseJsArray(text: string): unknown[] {
  const jsonText = text.replace(/^[\s\S]*?=\s*/, '').replace(/;\s*$/, '').trim();
  const parsed = JSON.parse(jsonText) as unknown;
  if (!Array.isArray(parsed)) throw new Error('X archive file did not contain an array');
  return parsed;
}

function candidateToImportedItem(accountId: string, source: ImportSource, candidate: XArchiveCandidate, importedAt: string): ImportedItem {
  const day = candidate.createdAt.slice(0, 10);
  const text = candidate.text.slice(0, 120_000);
  return {
    id: `imp_${hash(`${accountId}|${source.id}|${candidate.externalId}`).slice(0, 16)}`,
    accountId,
    sourceId: source.id,
    sourceKind: source.kind,
    sourceLabel: source.label,
    externalId: candidate.externalId,
    url: candidate.url,
    title: candidate.title,
    text,
    createdAt: candidate.createdAt,
    importedAt,
    day,
    wordCount: countWords(text),
  };
}

function dedupeCandidates(candidates: XArchiveCandidate[]): XArchiveCandidate[] {
  const seen = new Set<string>();
  const out: XArchiveCandidate[] = [];
  for (const candidate of candidates.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.externalId.localeCompare(b.externalId))) {
    if (seen.has(candidate.externalId)) continue;
    seen.add(candidate.externalId);
    out.push(candidate);
  }
  return out;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, 'utf8');
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function importSourcePath(dir: string, accountId: string, sourceId: string): string {
  return path.join(dir, `${storeHash(accountId)}__${sourceId}.json`);
}

function importItemPath(dir: string, accountId: string, itemId: string): string {
  return path.join(dir, `${storeHash(accountId)}__${itemId}.json`);
}

function tweetUrl(author: string, id: string): string | undefined {
  if (!/^\d+$/.test(id)) return undefined;
  return author ? `https://x.com/${author}/status/${id}` : `https://x.com/i/web/status/${id}`;
}

function parseDate(value: string | undefined): string {
  if (!value) return new Date(0).toISOString();
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString();
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`).toISOString() : new Date(0).toISOString();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function cleanHandle(value: string): string {
  return value.replace(/^@/, '').trim();
}

function cleanText(value: string): string {
  return value.replace(/https?:\/\/t\.co\/\S+/g, '').replace(/\s+/g, ' ').trim();
}


function snippet(text: string, limit: number): string {
  const cleaned = cleanText(text);
  return cleaned.length > limit ? `${cleaned.slice(0, limit - 1)}…` : cleaned;
}

function extractQuestions(text: string): string[] {
  return unique(text.split(/(?<=[?])\s+/).map((part) => part.trim()).filter((part) => part.endsWith('?'))).slice(0, 20);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function hash(value: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < value.length; i += 1) {
    h1 ^= value.charCodeAt(i);
    h1 = Math.imul(h1, 16777619);
    h2 ^= value.charCodeAt(value.length - i - 1);
    h2 = Math.imul(h2, 16777619);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

function storeHash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
