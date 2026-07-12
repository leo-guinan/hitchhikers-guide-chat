import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { backloadMediumArchive, parseMediumPosts } from '../src/domain/medium-backload';

describe('Medium diary backload', () => {
  it('parses a Medium posts export and writes diary pages with a manifest', async () => {
    const root = await makeFixture();
    const posts = await parseMediumPosts(root.archive);
    expect(posts).toHaveLength(2);
    expect(posts[0].day).toBe('2024-03-04');
    const usefulPost = posts.find((post) => post.title === 'The Useful Boring Step');
    expect(usefulPost?.text).toContain('The thesis means nothing without the artifact.');

    const manifest = await backloadMediumArchive({ archive: root.archive, target: root.target, sessionId: 'acct_test', sourceLabel: 'Medium test' });
    expect(manifest.totalPosts).toBe(2);
    expect(manifest.writtenPages).toBe(1);
    expect(manifest.skippedPages).toBe(0);

    const page = JSON.parse(await readFile(path.join(root.target, 'data/diary/2024-03-04.json'), 'utf8'));
    expect(page.sessionId).toBe('acct_test');
    expect(page.entry.title).toBe('Medium backload: 2 posts');
    expect(page.turns).toHaveLength(4);
    expect(page.turns[1].content).toContain('Backload receipt');

    const manifestFile = JSON.parse(await readFile(path.join(root.target, 'data/backloads/medium-backload-manifest.json'), 'utf8'));
    expect(manifestFile.posts[0].diaryPath).toBe('data/diary/2024-03-04.json');

    const second = await backloadMediumArchive({ archive: root.archive, target: root.target, sessionId: 'acct_test', sourceLabel: 'Medium test' });
    expect(second.writtenPages).toBe(0);
    expect(second.skippedPages).toBe(1);
  });
});

async function makeFixture(): Promise<{ archive: string; target: string }> {
  const actualBase = await mkdtemp(path.join(tmpdir(), 'medium-backload-fixture-'));
  await mkdir(path.join(actualBase, 'archive/posts'), { recursive: true });
  await mkdir(path.join(actualBase, 'target'), { recursive: true });
  await writeFile(path.join(actualBase, 'archive/posts/2024-03-04_the-useful-boring-step.html'), `<!doctype html>
<html><head>
<title>The Useful Boring Step</title>
<meta property="article:published_time" content="2024-03-04T12:34:56.000Z">
<meta property="al:web:url" content="https://medium.com/@leo/the-useful-boring-step">
</head><body><article>
<h1>The Useful Boring Step</h1>
<p>The thesis means nothing without the artifact. Ship the pipeline.</p>
<p>What should happen next? The next move is to backload old work.</p>
<a href="https://medium.com/tag/ai">AI</a>
</article></body></html>`);
  await writeFile(path.join(actualBase, 'archive/posts/2024-03-04_second-post.html'), `<!doctype html>
<html><head>
<title>Second Post</title>
<meta property="article:published_time" content="2024-03-04T13:34:56.000Z">
</head><body><article><p>Another post on the same day should share the diary page.</p></article></body></html>`);
  await writeFile(path.join(actualBase, 'archive/posts/draft_unpublished.html'), `<!doctype html>
<html><head><title>Unpublished Draft</title></head><body><article><p>This draft should not become a diary page.</p></article></body></html>`);
  return { archive: path.join(actualBase, 'archive'), target: path.join(actualBase, 'target') };
}
