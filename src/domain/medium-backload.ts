import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { ChatTurn, DiaryEntry, DiaryPage } from './schema';

export type MediumBackloadOptions = {
  archive: string;
  target: string;
  sessionId?: string;
  sourceLabel?: string;
  limit?: number;
  overwrite?: boolean;
};

export type MediumPost = {
  id: string;
  title: string;
  text: string;
  htmlPath: string;
  url?: string;
  publishedAt?: string;
  day: string;
  tags: string[];
  wordCount: number;
};

export type MediumBackloadManifest = {
  kind: 'medium_diary_backload';
  generatedAt: string;
  archive: string;
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
    url?: string;
    diaryPath: string;
  }>;
};

export async function backloadMediumArchive(options: MediumBackloadOptions): Promise<MediumBackloadManifest> {
  const sessionId = options.sessionId ?? 'medium-backload';
  const sourceLabel = options.sourceLabel ?? 'Medium archive';
  const target = path.resolve(options.target);
  const prepared = await prepareArchive(options.archive);
  try {
    const posts = (await parseMediumPosts(prepared.root)).slice(0, options.limit ?? Number.POSITIVE_INFINITY);
    const dataDir = path.join(target, 'data');
    const diaryDir = path.join(dataDir, 'diary');
    const mediumDir = path.join(dataDir, 'medium');
    const backloadDir = path.join(dataDir, 'backloads');
    await mkdir(diaryDir, { recursive: true });
    await mkdir(mediumDir, { recursive: true });
    await mkdir(backloadDir, { recursive: true });
    await ensureReadme(target);

    const generatedAt = new Date().toISOString();
    const itemsPath = path.join(mediumDir, 'items.jsonl');
    const itemLines: string[] = [];
    const manifestPosts: MediumBackloadManifest['posts'] = [];
    let writtenPages = 0;
    let skippedPages = 0;

    const postsByDay = groupPostsByDay(posts);
    for (const [day, dayPosts] of Array.from(postsByDay.entries())) {
      const page = mediumPostsToDiaryPage(dayPosts, { generatedAt, sessionId, sourceLabel });
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
      itemLines.push(JSON.stringify({ ...post, sourceLabel, backloadedAt: generatedAt }));
      manifestPosts.push({ id: post.id, day: post.day, title: post.title, wordCount: post.wordCount, url: post.url, diaryPath: path.relative(target, diaryPath) });
    }

    await writeFile(itemsPath, itemLines.length ? `${itemLines.join('\n')}\n` : '');
    const manifest: MediumBackloadManifest = {
      kind: 'medium_diary_backload',
      generatedAt,
      archive: path.resolve(options.archive),
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
    await writeFile(path.join(backloadDir, 'medium-backload-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    return manifest;
  } finally {
    if (prepared.cleanup) await rm(prepared.root, { recursive: true, force: true });
  }
}

export async function parseMediumPosts(root: string): Promise<MediumPost[]> {
  const htmlFiles = await findHtmlFiles(root);
  const posts = (await Promise.all(htmlFiles.map(parseMediumPost))).filter((post): post is MediumPost => Boolean(post));
  return posts.sort((a, b) => a.day.localeCompare(b.day) || a.title.localeCompare(b.title));
}

function mediumPostsToDiaryPage(posts: MediumPost[], options: { generatedAt: string; sessionId: string; sourceLabel: string }): DiaryPage {
  if (!posts.length) throw new Error('Cannot build a diary page with zero Medium posts');
  const day = posts[0].day;
  const turns = posts.flatMap((post) => mediumPostTurns(post, options));
  const entry: DiaryEntry = {
    id: `entry_${day}_medium_${hash(posts.map((post) => post.id).join('|')).slice(0, 10)}`,
    day,
    createdAt: options.generatedAt,
    updatedAt: options.generatedAt,
    title: posts.length === 1 ? posts[0].title : `Medium backload: ${posts.length} posts`,
    summary: summarizePosts(day, posts),
    keyQuestions: unique(posts.flatMap((post) => extractQuestions(post.text))).slice(0, 5),
    openLoops: unique(posts.flatMap((post) => extractOpenLoops(post.text))).slice(0, 6),
    humanContextNeeded: [],
    turnCount: turns.length,
    sourceTurnIds: turns.map((turn) => turn.id),
  };
  return {
    day,
    sessionId: options.sessionId,
    createdAt: posts.map((post) => post.publishedAt).filter(Boolean).sort()[0] ?? `${day}T00:00:00.000Z`,
    updatedAt: options.generatedAt,
    turns,
    entry,
  };
}

function mediumPostTurns(post: MediumPost, options: { generatedAt: string; sourceLabel: string }): ChatTurn[] {
  const userTurn: ChatTurn = {
    role: 'user',
    id: `turn_${post.day.replace(/-/g, '')}_medium_${post.id.slice(0, 8)}`,
    createdAt: post.publishedAt ?? `${post.day}T00:00:00.000Z`,
    content: [
      `Backfilled Medium post: ${post.title}`,
      post.url ? `Source URL: ${post.url}` : undefined,
      post.tags.length ? `Tags: ${post.tags.join(', ')}` : undefined,
      '',
      post.text,
    ].filter((part) => part !== undefined).join('\n'),
  };
  const assistantTurn: ChatTurn = {
    role: 'assistant',
    id: `turn_${post.day.replace(/-/g, '')}_receipt_${post.id.slice(0, 8)}`,
    createdAt: options.generatedAt,
    content: `Backload receipt: imported from ${options.sourceLabel}. ${post.wordCount} words. Source artifact id ${post.id}. This is historical material, not a live instruction.`,
  };
  return [userTurn, assistantTurn];
}

function groupPostsByDay(posts: MediumPost[]): Map<string, MediumPost[]> {
  const grouped = new Map<string, MediumPost[]>();
  for (const post of posts) {
    grouped.set(post.day, [...(grouped.get(post.day) ?? []), post]);
  }
  return new Map(Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)));
}

async function prepareArchive(archive: string): Promise<{ root: string; cleanup: boolean }> {
  const resolved = path.resolve(archive);
  const info = await stat(resolved);
  if (info.isDirectory()) return { root: resolved, cleanup: false };
  if (!resolved.toLowerCase().endsWith('.zip')) throw new Error('Medium archive must be a directory or .zip export');
  const dest = await mkdtemp(path.join(tmpdir(), 'medium-archive-'));
  const result = spawnSync('unzip', ['-q', resolved, '-d', dest], { encoding: 'utf8' });
  if (result.status !== 0) {
    await rm(dest, { recursive: true, force: true });
    throw new Error(`Failed to unzip Medium archive: ${result.stderr || result.stdout || 'unzip exited non-zero'}`);
  }
  return { root: dest, cleanup: true };
}

async function parseMediumPost(filePath: string): Promise<MediumPost | null> {
  const html = await readFile(filePath, 'utf8');
  const text = cleanHtml(html);
  if (!text) return null;
  const title = cleanText(meta(html, 'title') || tagText(html, 'title') || titleFromFile(filePath));
  const publishedAt = meta(html, 'article:published_time') || meta(html, 'date') || timeAttr(html) || dateFromFile(filePath);
  const day = dayFrom(publishedAt) ?? dayFromFilename(filePath) ?? new Date(0).toISOString().slice(0, 10);
  const url = meta(html, 'al:web:url') || canonicalUrl(html) || undefined;
  const tags = tagsFromHtml(html);
  const wordCount = countWords(text);
  const id = hash([day, title, url ?? '', text.slice(0, 400)].join('|'));
  return { id, title, text, htmlPath: filePath, url, publishedAt, day, tags, wordCount };
}

async function findHtmlFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const name of await readdir(dir)) {
      const full = path.join(dir, name);
      const info = await stat(full);
      if (info.isDirectory()) {
        await walk(full);
      } else if (/\.html?$/i.test(name) && /(^|\/)posts?\//i.test(full.replace(/\\/g, '/')) && !/^draft_/i.test(name)) {
        out.push(full);
      }
    }
  }
  await walk(root);
  return out.sort();
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

function summarizePosts(day: string, posts: MediumPost[]): string {
  const totalWords = posts.reduce((sum, post) => sum + post.wordCount, 0);
  if (posts.length === 1) {
    const first = firstSentences(posts[0].text, 2).join(' ');
    return [`${day}: Medium backload of “${posts[0].title}” (${posts[0].wordCount} words).`, first].filter(Boolean).join(' ');
  }
  const titles = posts.map((post) => `“${post.title}”`).join(' / ');
  return `${day}: Medium backload of ${posts.length} posts (${totalWords} total words): ${titles}.`;
}

function extractQuestions(text: string): string[] {
  return unique((text.match(/[^.!?]*\?/g) ?? []).map((item) => cleanText(item)).filter(Boolean));
}

function extractOpenLoops(text: string): string[] {
  const needles = ['next', 'should', 'need', 'must', 'future', 'build', 'question'];
  return unique(sentences(text).filter((sentence) => needles.some((needle) => sentence.toLowerCase().includes(needle))));
}

function firstSentences(text: string, limit: number): string[] {
  return sentences(text).slice(0, limit);
}

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((part) => cleanText(part)).filter(Boolean);
}

function tagsFromHtml(html: string): string[] {
  const matches = Array.from(html.matchAll(/<a\b[^>]*href=["'][^"']*\/tag\/([^"'/]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi));
  return unique(matches.map((match) => cleanHtml(match[2]) || decodeURIComponent(match[1]))).slice(0, 20);
}

function cleanHtml(html: string): string {
  return cleanText(html
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' '));
}

function cleanText(text: string): string {
  return decodeHtml(text).replace(/\s+/g, ' ').trim();
}

function meta(html: string, name: string): string | undefined {
  const escaped = escapeRegex(name);
  const property = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'));
  if (property) return decodeHtml(property[1]).trim();
  const reversed = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i'));
  return reversed ? decodeHtml(reversed[1]).trim() : undefined;
}

function canonicalUrl(html: string): string | undefined {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i) || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i);
  return match ? decodeHtml(match[1]).trim() : undefined;
}

function tagText(html: string, tag: string): string | undefined {
  const match = html.match(new RegExp(`<${escapeRegex(tag)}[^>]*>([\\s\\S]*?)<\/${escapeRegex(tag)}>`, 'i'));
  return match ? cleanHtml(match[1]) : undefined;
}

function timeAttr(html: string): string | undefined {
  const match = html.match(/<time[^>]+datetime=["']([^"']+)["'][^>]*>/i);
  return match ? decodeHtml(match[1]).trim() : undefined;
}

function dateFromFile(filePath: string): string | undefined {
  const match = path.basename(filePath).match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
}

function dayFromFilename(filePath: string): string | undefined {
  return dayFrom(dateFromFile(filePath));
}

function dayFrom(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function titleFromFile(filePath: string): string {
  return path.basename(filePath).replace(/\.html?$/i, '').replace(/^[0-9a-f]+_?/, '').replace(/[-_]+/g, ' ').trim() || 'Untitled Medium post';
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

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
