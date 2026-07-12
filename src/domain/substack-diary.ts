import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { ChatTurn, DiaryEntry, DiaryPage } from './schema';

export type SubstackPost = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  canonicalUrl: string;
  postDate: string;
  bodyText: string;
  wordCount: number;
  reactionCount?: number;
  commentCount?: number;
};

export type OffsetProbe = {
  offset: number;
  returned: number;
  newIds: number;
};

export type SubstackScrapeResult = {
  baseUrl: string;
  posts: SubstackPost[];
  sitemapPostUrls: string[];
  offsetProbe: OffsetProbe[];
  report: SubstackCompletenessReport;
};

export type SubstackCompletenessReport = {
  baseUrl: string;
  totalPosts: number;
  dateRange: { min: string | null; max: string | null };
  sitemapPostUrlCount: number;
  apiMissingFromSitemapCount: number;
  sitemapMissingFromApiCount: number;
  apiMissingFromSitemapSample: string[];
  sitemapMissingFromApiSample: string[];
  offsetProbe: OffsetProbe[];
  complete: boolean;
};

export type SubstackDiaryConversion = {
  pages: DiaryPage[];
  report: SubstackCompletenessReport & {
    diaryPageCount: number;
    installedPageCount?: number;
    skippedTurnCount?: number;
    outputDir?: string;
    files?: string[];
  };
};

export type DiaryInstallResult = {
  installedPageCount: number;
  skippedTurnCount: number;
  files: string[];
};

export async function scrapeSubstack(baseInput: string, options: { fetchFn?: typeof fetch; pageSize?: number; maxPosts?: number } = {}): Promise<SubstackScrapeResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = normalizeSubstackBase(baseInput);
  const pageSize = options.pageSize ?? 20;
  const maxPosts = options.maxPosts ?? 2_000;
  const postsById = new Map<string, SubstackPost>();
  const offsetProbe: OffsetProbe[] = [];

  for (let offset = 0; offset < maxPosts; offset += pageSize) {
    const url = `${baseUrl}/api/v1/archive?sort=new&search=&offset=${offset}&limit=${pageSize}`;
    const rawPosts = await fetchJson<unknown[]>(fetchFn, url);
    let newIds = 0;
    for (const raw of rawPosts) {
      const post = normalizeArchivePost(baseUrl, raw);
      if (!postsById.has(post.id)) {
        postsById.set(post.id, post);
        newIds += 1;
      }
    }
    offsetProbe.push({ offset, returned: rawPosts.length, newIds });
    if (rawPosts.length === 0 || newIds === 0 || postsById.size >= maxPosts) break;
  }

  const posts = Array.from(postsById.values()).sort((a, b) => b.postDate.localeCompare(a.postDate));
  const sitemapPostUrls = await fetchSitemapPostUrls(fetchFn, baseUrl).catch(() => []);
  const report = completenessReport(baseUrl, posts, sitemapPostUrls, offsetProbe);
  return { baseUrl, posts, sitemapPostUrls, offsetProbe, report };
}

export function postsToDiaryPages(posts: SubstackPost[], sessionId: string): DiaryPage[] {
  return posts.map((post) => {
    const day = dayFrom(post.postDate);
    const createdAt = dateTimeFrom(post.postDate);
    const postKey = stableHash(`${post.canonicalUrl}|${post.id}`);
    const sourceTurnIds = [`substack_${postKey}_title`, `substack_${postKey}_body`];
    const turns: ChatTurn[] = [
      {
        id: sourceTurnIds[0],
        role: 'user',
        content: `Import Substack post: ${post.title}\n${post.canonicalUrl}`,
        createdAt,
      },
      {
        id: sourceTurnIds[1],
        role: 'assistant',
        content: post.bodyText,
        createdAt,
      },
    ];
    const entry: DiaryEntry = {
      id: `entry_${day}_substack_${postKey.slice(0, 10)}`,
      day,
      createdAt,
      updatedAt: createdAt,
      title: post.title,
      summary: summarizePost(post),
      keyQuestions: extractQuestions(post.bodyText),
      openLoops: [],
      humanContextNeeded: [],
      turnCount: turns.length,
      sourceTurnIds,
    };
    return { day, sessionId, createdAt, updatedAt: createdAt, turns, entry };
  });
}

export async function convertSubstackToDiary(baseInput: string, options: { sessionId: string; outputDir?: string; installDataDir?: string; fetchFn?: typeof fetch; pageSize?: number; maxPosts?: number } ): Promise<SubstackDiaryConversion> {
  const scrape = await scrapeSubstack(baseInput, options);
  const pages = postsToDiaryPages(scrape.posts, options.sessionId);
  const files: string[] = [];
  if (options.outputDir) {
    await mkdir(options.outputDir, { recursive: true });
    await writeFile(path.join(options.outputDir, 'all_posts.json'), JSON.stringify(scrape.posts, null, 2));
    await writeFile(path.join(options.outputDir, 'scrape_completeness_report.json'), JSON.stringify(scrape.report, null, 2));
    files.push(path.join(options.outputDir, 'all_posts.json'), path.join(options.outputDir, 'scrape_completeness_report.json'));
    const diaryDir = path.join(options.outputDir, 'diary');
    await mkdir(diaryDir, { recursive: true });
    for (const page of pages) {
      const file = path.join(diaryDir, `${page.day}__substack_${stableHash(page.entry?.id ?? page.day).slice(0, 10)}.json`);
      await writeFile(file, JSON.stringify(page, null, 2));
      files.push(file);
    }
    await writeFile(path.join(options.outputDir, 'manifest.json'), JSON.stringify({ baseUrl: scrape.baseUrl, sessionId: options.sessionId, pageCount: pages.length, files }, null, 2));
    files.push(path.join(options.outputDir, 'manifest.json'));
  }
  const install = options.installDataDir ? await installDiaryPages(pages, options.installDataDir) : undefined;
  return { pages, report: { ...scrape.report, diaryPageCount: pages.length, installedPageCount: install?.installedPageCount, skippedTurnCount: install?.skippedTurnCount, outputDir: options.outputDir, files: [...files, ...(install?.files ?? [])] } };
}

export async function installDiaryPages(pages: DiaryPage[], dataDir: string): Promise<DiaryInstallResult> {
  const diaryDir = path.join(dataDir, 'diary');
  await mkdir(diaryDir, { recursive: true });
  const grouped = new Map<string, DiaryPage[]>();
  for (const page of pages) grouped.set(page.day, [...(grouped.get(page.day) ?? []), page]);

  const files: string[] = [];
  let installedPageCount = 0;
  let skippedTurnCount = 0;
  for (const [day, dayPages] of Array.from(grouped.entries())) {
    const file = path.join(diaryDir, `${day}.json`);
    const existing = await readDiaryPage(file).catch(() => null);
    const merged = mergeDiaryPages(day, dayPages, existing);
    skippedTurnCount += merged.skippedTurnCount;
    await writeFile(file, JSON.stringify(merged.page, null, 2));
    files.push(file);
    installedPageCount += dayPages.length;
  }
  return { installedPageCount, skippedTurnCount, files };
}

async function readDiaryPage(file: string): Promise<DiaryPage> {
  return JSON.parse(await readFile(file, 'utf8')) as DiaryPage;
}

function mergeDiaryPages(day: string, imports: DiaryPage[], existing: DiaryPage | null): { page: DiaryPage; skippedTurnCount: number } {
  const sortedImports = imports.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const base: DiaryPage = existing ?? { day, sessionId: sortedImports[0]?.sessionId ?? 'anonymous', createdAt: sortedImports[0]?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString(), turns: [] };
  const seenTurnIds = new Set(base.turns.map((turn) => turn.id));
  const turns = [...base.turns];
  const addedEntries: DiaryEntry[] = [];
  let skippedTurnCount = 0;
  for (const page of sortedImports) {
    let addedPageTurn = false;
    for (const turn of page.turns) {
      if (seenTurnIds.has(turn.id)) {
        skippedTurnCount += 1;
        continue;
      }
      seenTurnIds.add(turn.id);
      turns.push(turn);
      addedPageTurn = true;
    }
    if (addedPageTurn && page.entry) {
      addedEntries.push(page.entry);
    }
  }
  turns.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const existingEntry = base.entry;
  const entrySource = existingEntry ? [existingEntry, ...addedEntries] : addedEntries;
  const createdAt = [base.createdAt, ...sortedImports.map((page) => page.createdAt)].sort()[0] ?? new Date().toISOString();
  const updatedAt = new Date().toISOString();
  const entry: DiaryEntry | undefined = entrySource.length ? {
    id: existingEntry?.id ?? `entry_${day}_substack_imports`,
    day,
    createdAt: existingEntry?.createdAt ?? createdAt,
    updatedAt,
    title: entrySource.length === 1 ? entrySource[0].title : `${entrySource.length} diary imports for ${day}`,
    summary: entrySource.map((item) => `- ${item.title}: ${item.summary}`).join('\n').slice(0, 20_000),
    keyQuestions: unique(entrySource.flatMap((item) => item.keyQuestions)).slice(0, 50),
    openLoops: unique(entrySource.flatMap((item) => item.openLoops)).slice(0, 50),
    humanContextNeeded: unique(entrySource.flatMap((item) => item.humanContextNeeded)).slice(0, 50),
    turnCount: turns.length,
    sourceTurnIds: unique([...entrySource.flatMap((item) => item.sourceTurnIds), ...turns.map((turn) => turn.id)]),
  } : undefined;
  return { page: { ...base, createdAt, updatedAt, turns, entry }, skippedTurnCount };
}

export function normalizeSubstackBase(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (!trimmed) throw new Error('Substack URL or publication slug is required');
  if (/^https?:\/\//.test(trimmed)) {
    const url = new URL(trimmed);
    return `${url.protocol}//${url.host}`;
  }
  const slug = trimmed.replace(/^@/, '').replace(/\.substack\.com$/, '');
  return `https://${slug}.substack.com`;
}

async function fetchJson<T>(fetchFn: typeof fetch, url: string): Promise<T> {
  const response = await fetchFn(url, { headers: { 'user-agent': 'HitchhikersGuideSubstackDiary/0.1 (+https://chat.hitchhikersguidetothefuture.com)' } });
  if (!response.ok) throw new Error(`Fetch failed ${response.status} for ${url}`);
  return response.json() as Promise<T>;
}

async function fetchText(fetchFn: typeof fetch, url: string): Promise<string> {
  const response = await fetchFn(url, { headers: { 'user-agent': 'HitchhikersGuideSubstackDiary/0.1 (+https://chat.hitchhikersguidetothefuture.com)' } });
  if (!response.ok) throw new Error(`Fetch failed ${response.status} for ${url}`);
  return response.text();
}

async function fetchSitemapPostUrls(fetchFn: typeof fetch, baseUrl: string): Promise<string[]> {
  const xml = await fetchText(fetchFn, `${baseUrl}/sitemap.xml`);
  return Array.from(xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g))
    .map((match) => decodeXml(match[1]).trim())
    .filter((url) => /^https?:\/\//.test(url) && /\/p\//.test(url))
    .map(canonicalizeUrl)
    .sort();
}

function normalizeArchivePost(baseUrl: string, raw: unknown): SubstackPost {
  const post = asRecord(raw);
  const id = String(post.id ?? post.slug ?? post.canonical_url ?? post.url ?? '');
  const slug = asString(post.slug) ?? id;
  const canonicalUrl = canonicalizeUrl(asString(post.canonical_url) ?? asString(post.url) ?? `${baseUrl}/p/${slug}`);
  const title = asString(post.title) ?? asString(post.social_title) ?? 'Untitled Substack post';
  const subtitle = asString(post.subtitle) ?? asString(post.description);
  const postDate = asString(post.post_date) ?? asString(post.published_at) ?? asString(post.created_at) ?? new Date().toISOString();
  const bodyText = cleanHtml([title, subtitle, asString(post.body_html) ?? asString(post.description)].filter(Boolean).join('\n\n'));
  return {
    id: id || canonicalUrl,
    slug,
    title: cleanText(title),
    subtitle: subtitle ? cleanText(subtitle) : undefined,
    canonicalUrl,
    postDate,
    bodyText,
    wordCount: numberValue(post.wordcount) ?? countWords(bodyText),
    reactionCount: numberValue(post.reaction_count),
    commentCount: numberValue(post.comment_count),
  };
}

function completenessReport(baseUrl: string, posts: SubstackPost[], sitemapPostUrls: string[], offsetProbe: OffsetProbe[]): SubstackCompletenessReport {
  const apiUrls = new Set(posts.map((post) => canonicalizeUrl(post.canonicalUrl)));
  const sitemapUrls = new Set(sitemapPostUrls.map(canonicalizeUrl));
  const apiMissingFromSitemap = Array.from(apiUrls).filter((url) => sitemapUrls.size > 0 && !sitemapUrls.has(url)).sort();
  const sitemapMissingFromApi = Array.from(sitemapUrls).filter((url) => !apiUrls.has(url)).sort();
  const dates = posts.map((post) => dayFrom(post.postDate)).sort();
  const terminated = offsetProbe.length > 0 && offsetProbe[offsetProbe.length - 1].newIds === 0;
  const complete = posts.length > 0 && terminated && (sitemapUrls.size === 0 || (apiMissingFromSitemap.length === 0 && sitemapMissingFromApi.length === 0));
  return {
    baseUrl,
    totalPosts: posts.length,
    dateRange: { min: dates[0] ?? null, max: dates[dates.length - 1] ?? null },
    sitemapPostUrlCount: sitemapPostUrls.length,
    apiMissingFromSitemapCount: apiMissingFromSitemap.length,
    sitemapMissingFromApiCount: sitemapMissingFromApi.length,
    apiMissingFromSitemapSample: apiMissingFromSitemap.slice(0, 10),
    sitemapMissingFromApiSample: sitemapMissingFromApi.slice(0, 10),
    offsetProbe,
    complete,
  };
}

function summarizePost(post: SubstackPost): string {
  const subtitle = post.subtitle ? `${post.subtitle} ` : '';
  return `${dayFrom(post.postDate)} Substack import: ${subtitle}${post.bodyText.slice(0, 500)}`.replace(/\s+/g, ' ').trim();
}

function extractQuestions(text: string): string[] {
  return text.split(/(?<=[?])\s+/).map((part) => part.trim()).filter((part) => part.endsWith('?')).slice(0, 5);
}

function cleanHtml(html: string): string {
  return cleanText(html
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' '));
}

function cleanText(text: string): string {
  return decodeXml(text).replace(/\s+/g, ' ').trim();
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function dayFrom(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function dateTimeFrom(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `${dayFrom(value)}T00:00:00.000Z`;
  return date.toISOString();
}

function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return url.replace(/\/+$/, '');
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function stableHash(value: string): string {
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
