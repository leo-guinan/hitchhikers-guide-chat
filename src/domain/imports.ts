import type { ImportedItem, ImportSource } from './schema';

export type ImportCandidate = {
  externalId?: string;
  url?: string;
  title?: string;
  text: string;
  createdAt?: string;
};

export async function fetchImportCandidates(source: ImportSource, limit = 50): Promise<ImportCandidate[]> {
  switch (source.kind) {
    case 'rss':
      return fetchRssCandidates(requiredUrl(source), limit);
    case 'substack':
      return fetchSubstackCandidates(source, limit);
    case 'ghost':
      return fetchGhostCandidates(source, limit);
    case 'generic_url':
      return [await fetchGenericUrlCandidate(requiredUrl(source))];
    case 'youtube_feed':
      return fetchYouTubeFeedCandidates(source, limit);
    case 'x_archive_json':
      return (source.seedItems ?? []).slice(0, limit);
    case 'diary_backfill':
      return (source.seedItems ?? []).slice(0, limit);
    default:
      return [];
  }
}

export function candidateToItem(accountId: string, source: ImportSource, candidate: ImportCandidate, importedAt = new Date().toISOString()): ImportedItem {
  const title = cleanText(candidate.title || source.label || candidate.url || 'Untitled import').slice(0, 220) || 'Untitled import';
  const text = cleanText(candidate.text).slice(0, 120_000);
  const day = dayFrom(candidate.createdAt) ?? dayFrom(importedAt) ?? new Date().toISOString().slice(0, 10);
  return {
    id: importItemId(accountId, source.id, candidate.externalId || candidate.url || `${title}|${text.slice(0, 120)}`),
    accountId,
    sourceId: source.id,
    sourceKind: source.kind,
    sourceLabel: source.label,
    externalId: candidate.externalId,
    url: candidate.url,
    title,
    text,
    createdAt: candidate.createdAt,
    importedAt,
    day,
    wordCount: countWords(text),
  };
}

async function fetchSubstackCandidates(source: ImportSource, limit: number): Promise<ImportCandidate[]> {
  const base = source.url ? trimTrailingSlash(source.url) : `https://${source.handle}.substack.com`;
  const archiveUrl = `${base}/api/v1/archive?sort=new&search=&offset=0&limit=${Math.min(limit, 100)}`;
  try {
    const posts = await fetchJson<Array<Record<string, unknown>>>(archiveUrl);
    return posts.slice(0, limit).map((post) => ({
      externalId: String(post.id ?? post.slug ?? post.canonical_url ?? ''),
      url: asString(post.canonical_url) || `${base}/p/${post.slug}`,
      title: asString(post.title) || asString(post.social_title),
      text: cleanHtml([post.title, post.subtitle, post.description, post.body_html].map(asString).filter(Boolean).join('\n\n')),
      createdAt: asString(post.post_date) || asString(post.published_at),
    })).filter((item) => item.text.trim().length > 0);
  } catch {
    return fetchRssCandidates(`${base}/feed`, limit);
  }
}

async function fetchGhostCandidates(source: ImportSource, limit: number): Promise<ImportCandidate[]> {
  const base = trimTrailingSlash(requiredUrl(source));
  const sitemap = await fetchText(`${base}/sitemap-posts.xml`);
  const urls = (sitemap.match(/<loc>.*?<\/loc>/g) ?? []).map((block) => decodeXml(block.replace(/<\/?loc>/g, ''))).filter((url) => /^https?:\/\//.test(url) && !/\/(tag|author)\//.test(url)).slice(0, limit);
  const out: ImportCandidate[] = [];
  for (const url of urls) {
    try {
      out.push(await fetchGenericUrlCandidate(url));
    } catch {
      // Keep one bad post from ruining the import. The void already has enough leverage.
    }
  }
  return out;
}

async function fetchYouTubeFeedCandidates(source: ImportSource, limit: number): Promise<ImportCandidate[]> {
  const feedUrl = source.url || youtubeFeedUrl(source.handle || '');
  return fetchRssCandidates(feedUrl, limit, 'videoId');
}

async function fetchRssCandidates(url: string, limit: number, idTag = 'guid'): Promise<ImportCandidate[]> {
  const xml = await fetchText(url);
  const blocks = xml.includes('<item') ? splitBlocks(xml, 'item') : splitBlocks(xml, 'entry');
  return blocks.slice(0, limit).map((block) => {
    const title = tag(block, 'title');
    const link = tag(block, 'link') || attr(block, 'link', 'href');
    const text = tag(block, 'content:encoded') || tag(block, 'content') || tag(block, 'summary') || tag(block, 'description') || title;
    const createdAt = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated');
    return {
      externalId: tag(block, idTag) || link || title,
      url: link,
      title,
      text: cleanHtml(text),
      createdAt,
    };
  }).filter((item) => item.text.trim().length > 0);
}

async function fetchGenericUrlCandidate(url: string): Promise<ImportCandidate> {
  const html = await fetchText(url);
  const jsonLd = firstJsonLd(html);
  const title = (jsonLd && asString(jsonLd.headline || jsonLd.name)) || cleanHtml(tag(html, 'title')) || url;
  const createdAt = (jsonLd && asString(jsonLd.datePublished || jsonLd.dateCreated || jsonLd.uploadDate)) || undefined;
  const article = extractArticleHtml(html);
  return { externalId: url, url, title, text: cleanHtml(article), createdAt };
}

function splitBlocks(xml: string, tagName: string): string[] {
  const re = new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, 'gi');
  return xml.match(re) ?? [];
}

function tag(text: string, name: string): string | undefined {
  const re = new RegExp(`<${escapeRegex(name)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegex(name)}>`, 'i');
  const match = text.match(re);
  return match ? decodeXml(match[1]).trim() : undefined;
}

function attr(text: string, tagName: string, attrName: string): string | undefined {
  const re = new RegExp(`<${escapeRegex(tagName)}\\b[^>]*\\s${escapeRegex(attrName)}=["']([^"']+)["'][^>]*>`, 'i');
  const match = text.match(re);
  return match ? decodeXml(match[1]).trim() : undefined;
}

function firstJsonLd(html: string): Record<string, unknown> | null {
  const match = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim()) as unknown;
    if (Array.isArray(parsed)) return (parsed.find((item) => item && typeof item === 'object') as Record<string, unknown>) ?? null;
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function extractArticleHtml(html: string): string {
  const article = html.match(/<article\b[\s\S]*?<\/article>/i)?.[0];
  if (article) return article;
  const main = html.match(/<main\b[\s\S]*?<\/main>/i)?.[0];
  if (main) return main;
  return html;
}

function cleanHtml(html: string | undefined): string {
  if (!html) return '';
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
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { 'user-agent': 'HitchhikersGuideImporter/0.1 (+https://chat.hitchhikersguidetothefuture.com)' } });
  if (!response.ok) throw new Error(`Fetch failed ${response.status} for ${url}`);
  return response.text();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { 'user-agent': 'HitchhikersGuideImporter/0.1 (+https://chat.hitchhikersguidetothefuture.com)' } });
  if (!response.ok) throw new Error(`Fetch failed ${response.status} for ${url}`);
  return response.json() as Promise<T>;
}

function youtubeFeedUrl(handle: string): string {
  const trimmed = handle.trim();
  if (!trimmed) throw new Error('YouTube feed imports require a channel id, handle, or feed URL');
  if (trimmed.startsWith('http')) return trimmed;
  if (trimmed.startsWith('UC')) return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(trimmed)}`;
  return `https://www.youtube.com/feeds/videos.xml?user=${encodeURIComponent(trimmed.replace(/^@/, ''))}`;
}

function requiredUrl(source: ImportSource): string {
  if (!source.url) throw new Error(`${source.kind} import source requires a URL`);
  return source.url;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function dayFrom(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : undefined;
  return date.toISOString().slice(0, 10);
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function importItemId(accountId: string, sourceId: string, key: string): string {
  return `imp_${hash(`${accountId}|${sourceId}|${key}`).slice(0, 16)}`;
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
