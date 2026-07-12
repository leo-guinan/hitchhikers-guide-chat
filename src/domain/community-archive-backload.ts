import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ChatTurn, DiaryEntry, DiaryPage } from './schema';

export type CommunityArchiveBackloadOptions = {
  archive: string;
  incremental?: string[];
  target: string;
  sessionId?: string;
  sourceLabel?: string;
  limit?: number;
  overwrite?: boolean;
};

export type CommunityArchivePost = {
  id: string;
  text: string;
  title: string;
  url?: string;
  author?: string;
  platform?: string;
  createdAt: string;
  day: string;
  engagement: number;
  wordCount: number;
  raw: Record<string, unknown>;
};

export type CommunityArchiveBackloadManifest = {
  kind: 'community_archive_diary_backload';
  generatedAt: string;
  archive: string;
  incrementalArchives: string[];
  target: string;
  sessionId: string;
  sourceLabel: string;
  totalPosts: number;
  writtenPages: number;
  skippedPages: number;
  diaryDir: string;
  itemsPath: string;
  posts: Array<{
    id: string;
    day: string;
    title: string;
    wordCount: number;
    engagement: number;
    url?: string;
    diaryPath: string;
  }>;
};

export async function backloadCommunityArchive(options: CommunityArchiveBackloadOptions): Promise<CommunityArchiveBackloadManifest> {
  const sessionId = options.sessionId ?? 'community-archive-backload';
  const sourceLabel = options.sourceLabel ?? 'Community Archive';
  const target = path.resolve(options.target);
  const posts = (await parseCommunityArchiveBundle(options.archive, options.incremental ?? [])).slice(0, options.limit ?? Number.POSITIVE_INFINITY);
  const dataDir = path.join(target, 'data');
  const diaryDir = path.join(dataDir, 'diary');
  const archiveDir = path.join(dataDir, 'community-archive');
  const backloadDir = path.join(dataDir, 'backloads');
  await mkdir(diaryDir, { recursive: true });
  await mkdir(archiveDir, { recursive: true });
  await mkdir(backloadDir, { recursive: true });
  await ensureReadme(target);

  const generatedAt = new Date().toISOString();
  const itemsPath = path.join(archiveDir, 'items.jsonl');
  const itemLines: string[] = [];
  const manifestPosts: CommunityArchiveBackloadManifest['posts'] = [];
  let writtenPages = 0;
  let skippedPages = 0;

  const postsByDay = groupPostsByDay(posts);
  for (const [day, dayPosts] of Array.from(postsByDay.entries())) {
    const page = communityPostsToDiaryPage(dayPosts, { generatedAt, sessionId, sourceLabel });
    const diaryPath = path.join(diaryDir, `${day}.json`);
    if (!options.overwrite && await exists(diaryPath)) {
      skippedPages += 1;
    } else {
      await writeFile(diaryPath, `${JSON.stringify(page, null, 2)}\n`);
      writtenPages += 1;
    }
  }

  for (const post of posts) {
    const diaryPath = path.join(diaryDir, `${post.day}.json`);
    const { raw: _raw, ...normalized } = post;
    itemLines.push(JSON.stringify({ ...normalized, sourceLabel, backloadedAt: generatedAt }));
    manifestPosts.push({ id: post.id, day: post.day, title: post.title, wordCount: post.wordCount, engagement: post.engagement, url: post.url, diaryPath: path.relative(target, diaryPath) });
  }

  await writeFile(itemsPath, itemLines.length ? `${itemLines.join('\n')}\n` : '');
  const manifest: CommunityArchiveBackloadManifest = {
    kind: 'community_archive_diary_backload',
    generatedAt,
    archive: path.resolve(options.archive),
    incrementalArchives: (options.incremental ?? []).map((archive) => path.resolve(archive)),
    target,
    sessionId,
    sourceLabel,
    totalPosts: posts.length,
    writtenPages,
    skippedPages,
    diaryDir: path.relative(target, diaryDir),
    itemsPath: path.relative(target, itemsPath),
    posts: manifestPosts,
  };
  await writeFile(path.join(backloadDir, 'community-archive-backload-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function parseCommunityArchive(archivePath: string): Promise<CommunityArchivePost[]> {
  return parseCommunityArchiveBundle(archivePath);
}

export async function parseCommunityArchiveBundle(archivePath: string, incrementalPaths: string[] = []): Promise<CommunityArchivePost[]> {
  const groups = await Promise.all([archivePath, ...incrementalPaths].map(parseCommunityArchiveFile));
  return dedupePosts(groups.flat()).sort((a, b) => a.day.localeCompare(b.day) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

async function parseCommunityArchiveFile(archivePath: string): Promise<CommunityArchivePost[]> {
  const resolved = path.resolve(archivePath);
  const info = await stat(resolved);
  if (!info.isFile()) throw new Error('Community Archive input must be a JSON or JSONL file');
  const text = await readFile(resolved, 'utf8');
  const records = resolved.toLowerCase().endsWith('.jsonl') ? parseJsonl(text) : recordsFromJson(JSON.parse(text));
  return records.map((record, index) => normalizeCommunityRecord(record, index)).filter((post): post is CommunityArchivePost => Boolean(post));
}

function recordsFromJson(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);
  if (isRecord(payload) && Array.isArray(payload.tweets)) return payload.tweets.filter(isRecord);
  if (isRecord(payload) && Array.isArray(payload.events)) return payload.events.filter(isRecord);
  if (isRecord(payload) && Array.isArray(payload.posts)) return payload.posts.filter(isRecord);
  throw new Error('Unsupported Community Archive JSON shape: expected tweets, events, posts, or a list');
}

function parseJsonl(text: string): Record<string, unknown>[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => {
    try {
      const parsed = JSON.parse(line) as unknown;
      if (!isRecord(parsed)) throw new Error('line is not an object');
      return parsed;
    } catch (error) {
      throw new Error(`Invalid JSONL at line ${index + 1}: ${(error as Error).message}`);
    }
  });
}

function normalizeCommunityRecord(raw: Record<string, unknown>, index: number): CommunityArchivePost | null {
  const record = unwrapRecord(raw);
  const text = cleanText(stringFrom(record.full_text) || stringFrom(record.text) || stringFrom(record.content) || stringFrom(record.body) || '');
  if (!text) return null;
  const createdAt = parseDate(stringFrom(record.created_at) || stringFrom(record.date) || stringFrom(record.timestamp));
  const day = createdAt.slice(0, 10);
  const id = cleanText(stringFrom(record.id_str) || stringFrom(record.id) || stringFrom(record.tweet_id) || stringFrom(record.doc_id) || hash(`${createdAt}|${text}|${index}`).slice(0, 16));
  const author = cleanText(stringFrom(record.author) || stringFrom(record.username) || stringFrom(record.screen_name) || stringFrom(record.author_id) || '');
  const platform = cleanText(stringFrom(record.platform) || stringFrom(record.source_platform) || stringFrom(record.source_dataset) || 'community_archive');
  const url = stringFrom(record.url) || tweetUrl(author, id) || undefined;
  const engagement = intish(record.favorite_count) + intish(record.retweet_count) + intish(record.reply_count) + intish(record.like_count) + intish(record.repost_count);
  const title = titleForPost(day, author, text);
  return { id, text, title, url, author: author || undefined, platform, createdAt, day, engagement, wordCount: countWords(text), raw: record };
}

function unwrapRecord(raw: Record<string, unknown>): Record<string, unknown> {
  const tweet = raw.tweet;
  return isRecord(tweet) ? tweet : raw;
}

function communityPostsToDiaryPage(posts: CommunityArchivePost[], options: { generatedAt: string; sessionId: string; sourceLabel: string }): DiaryPage {
  if (!posts.length) throw new Error('Cannot build a diary page with zero Community Archive posts');
  const day = posts[0].day;
  const turns = posts.flatMap((post) => communityPostTurns(post, options));
  const totalWords = posts.reduce((sum, post) => sum + post.wordCount, 0);
  const totalEngagement = posts.reduce((sum, post) => sum + post.engagement, 0);
  const topPosts = posts.slice().sort((a, b) => b.engagement - a.engagement).slice(0, 3);
  const entry: DiaryEntry = {
    id: `entry_${day}_community_${hash(posts.map((post) => post.id).join('|')).slice(0, 10)}`,
    day,
    createdAt: options.generatedAt,
    updatedAt: options.generatedAt,
    title: posts.length === 1 ? posts[0].title : `Community Archive: ${posts.length} posts`,
    summary: posts.length === 1
      ? `${day}: Community Archive backload of one post (${posts[0].wordCount} words, engagement ${posts[0].engagement}). ${firstSentences(posts[0].text, 2).join(' ')}`
      : `${day}: Community Archive backload of ${posts.length} posts (${totalWords} total words, engagement ${totalEngagement}). Top posts: ${topPosts.map((post) => `“${snippet(post.text, 90)}”`).join(' / ')}.`,
    keyQuestions: unique(posts.flatMap((post) => extractQuestions(post.text))).slice(0, 5),
    openLoops: unique(posts.flatMap((post) => extractOpenLoops(post.text))).slice(0, 6),
    humanContextNeeded: [],
    turnCount: turns.length,
    sourceTurnIds: turns.map((turn) => turn.id),
  };
  return {
    day,
    sessionId: options.sessionId,
    createdAt: posts.map((post) => post.createdAt).sort()[0] ?? `${day}T00:00:00.000Z`,
    updatedAt: options.generatedAt,
    turns,
    entry,
  };
}

function communityPostTurns(post: CommunityArchivePost, options: { generatedAt: string; sourceLabel: string }): ChatTurn[] {
  const userTurn: ChatTurn = {
    role: 'user',
    id: `turn_${post.day.replace(/-/g, '')}_community_${hash(post.id).slice(0, 8)}`,
    createdAt: post.createdAt,
    content: [
      `Backfilled Community Archive post: ${post.title}`,
      `Platform: ${post.platform}`,
      post.author ? `Author: ${post.author}` : undefined,
      post.url ? `Source URL: ${post.url}` : undefined,
      `Engagement: ${post.engagement}`,
      '',
      post.text,
    ].filter((part) => part !== undefined).join('\n'),
  };
  const assistantTurn: ChatTurn = {
    role: 'assistant',
    id: `turn_${post.day.replace(/-/g, '')}_community_receipt_${hash(post.id).slice(0, 8)}`,
    createdAt: options.generatedAt,
    content: `Backload receipt: imported from ${options.sourceLabel}. ${post.wordCount} words. Engagement ${post.engagement}. Source artifact id ${post.id}. This is historical public/archive material, not a live instruction.`,
  };
  return [userTurn, assistantTurn];
}

function groupPostsByDay(posts: CommunityArchivePost[]): Map<string, CommunityArchivePost[]> {
  const grouped = new Map<string, CommunityArchivePost[]>();
  for (const post of posts) grouped.set(post.day, [...(grouped.get(post.day) ?? []), post]);
  return new Map(Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)));
}

function dedupePosts(posts: CommunityArchivePost[]): CommunityArchivePost[] {
  const seen = new Set<string>();
  const out: CommunityArchivePost[] = [];
  for (const post of posts) {
    const key = post.id || hash(`${post.createdAt}|${post.text}`);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(post);
  }
  return out;
}

async function ensureReadme(target: string): Promise<void> {
  const readme = path.join(target, 'README.md');
  if (await exists(readme)) return;
  await writeFile(readme, ['# Guide Diary Backload Repository', '', 'Historical diary pages generated from exported source archives.', '', 'Generated data lives under `data/`.', ''].join('\n'));
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function titleForPost(day: string, author: string, text: string): string {
  const prefix = author ? `${author} · ` : '';
  return `${prefix}${day} · ${snippet(text, 72)}`;
}

function tweetUrl(author: string, id: string): string | undefined {
  if (!id || !/^\d+$/.test(id)) return undefined;
  if (!author || /^\d+$/.test(author)) return `https://x.com/i/web/status/${id}`;
  return `https://x.com/${author.replace(/^@/, '')}/status/${id}`;
}

function parseDate(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const normalized = value.trim();
  const date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) return date.toISOString();
  const maybeTwitter = new Date(normalized.replace(/ \+0000 /, ' GMT '));
  if (!Number.isNaN(maybeTwitter.getTime())) return maybeTwitter.toISOString();
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) return new Date(`${normalized.slice(0, 10)}T00:00:00.000Z`).toISOString();
  return new Date().toISOString();
}

function extractQuestions(text: string): string[] {
  return unique((text.match(/[^.!?]*\?/g) ?? []).map((item) => cleanText(item)).filter(Boolean));
}

function extractOpenLoops(text: string): string[] {
  const needles = ['next', 'should', 'need', 'must', 'future', 'build', 'question', 'why', 'how'];
  return unique(sentences(text).filter((sentence) => needles.some((needle) => sentence.toLowerCase().includes(needle))));
}

function firstSentences(text: string, limit: number): string[] {
  return sentences(text).slice(0, limit);
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((part) => cleanText(part)).filter(Boolean);
}

function snippet(text: string, max: number): string {
  const cleaned = cleanText(text);
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}…` : cleaned;
}

function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function stringFrom(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  return undefined;
}

function intish(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => cleanText(value)).filter(Boolean)));
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
