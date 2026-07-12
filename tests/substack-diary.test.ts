import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { convertSubstackToDiary, normalizeSubstackBase, scrapeSubstack } from '../src/domain/substack-diary';

describe('substack diary conversion', () => {
  it('paginates archive API, verifies sitemap coverage, and writes diary pages', async () => {
    const fetchFn = mockSubstackFetch([
      post('1', 'first', 'First Post', '2026-01-01T12:00:00Z', '<p>What is the first question?</p><p>The artifact ships.</p>'),
      post('2', 'second', 'Second Post', '2026-01-02T12:00:00Z', '<p>The second dispatch has no patience for vibes.</p>'),
      post('3', 'third', 'Third Post', '2026-01-03T12:00:00Z', '<p>Can the diary remember this?</p>'),
    ]);
    const out = await mkdtemp(path.join(tmpdir(), 'substack-diary-'));

    const result = await convertSubstackToDiary('example', { sessionId: 'acct_test', outputDir: out, fetchFn, pageSize: 2 });

    expect(result.report.complete).toBe(true);
    expect(result.report.totalPosts).toBe(3);
    expect(result.report.diaryPageCount).toBe(3);
    expect(result.report.offsetProbe).toEqual([
      { offset: 0, returned: 2, newIds: 2 },
      { offset: 2, returned: 1, newIds: 1 },
      { offset: 4, returned: 0, newIds: 0 },
    ]);
    expect(result.pages[0].sessionId).toBe('acct_test');
    expect(result.pages[0].entry?.title).toBe('Third Post');
    expect(result.pages.some((page) => page.entry?.keyQuestions.some((question) => question.includes('What is the first question?')))).toBe(true);

    const manifest = JSON.parse(await readFile(path.join(out, 'manifest.json'), 'utf8')) as { pageCount: number; files: string[] };
    expect(manifest.pageCount).toBe(3);
    expect(manifest.files.some((file) => file.endsWith('scrape_completeness_report.json'))).toBe(true);
  });

  it('marks incomplete when sitemap has posts missing from archive API', async () => {
    const fetchFn = mockSubstackFetch([post('1', 'first', 'First Post', '2026-01-01T12:00:00Z', '<p>Only one.</p>')], ['first', 'missing']);

    const result = await scrapeSubstack('https://example.substack.com', { fetchFn, pageSize: 20 });

    expect(result.report.complete).toBe(false);
    expect(result.report.sitemapMissingFromApiCount).toBe(1);
    expect(result.report.sitemapMissingFromApiSample).toEqual(['https://example.substack.com/p/missing']);
  });

  it('normalizes slugs and urls to a publication base', () => {
    expect(normalizeSubstackBase('white-mirror')).toBe('https://white-mirror.substack.com');
    expect(normalizeSubstackBase('https://white-mirror.substack.com/p/a-post')).toBe('https://white-mirror.substack.com');
  });
});

function post(id: string, slug: string, title: string, postDate: string, bodyHtml: string) {
  return {
    id,
    slug,
    title,
    subtitle: `${title} subtitle`,
    canonical_url: `https://example.substack.com/p/${slug}`,
    post_date: postDate,
    body_html: bodyHtml,
    wordcount: bodyHtml.split(/\s+/).length,
    reaction_count: 0,
    comment_count: 0,
  };
}

function mockSubstackFetch(posts: Array<Record<string, unknown>>, sitemapSlugs = posts.map((item) => String(item.slug))) {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/sitemap.xml')) {
      const xml = ['<urlset>', ...sitemapSlugs.map((slug) => `<url><loc>https://example.substack.com/p/${slug}</loc></url>`), '</urlset>'].join('');
      return new Response(xml, { status: 200 });
    }
    if (url.includes('/api/v1/archive')) {
      const parsed = new URL(url);
      const offset = Number(parsed.searchParams.get('offset') ?? 0);
      const limit = Number(parsed.searchParams.get('limit') ?? 20);
      return Response.json(posts.slice(offset, offset + limit));
    }
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
}
