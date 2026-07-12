import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { backloadCommunityArchive, parseCommunityArchive, parseCommunityArchiveBundle } from '../src/domain/community-archive-backload';

describe('Community Archive diary backload', () => {
  it('parses Community Archive JSON and groups posts into diary pages', async () => {
    const root = await makeJsonFixture();
    const posts = await parseCommunityArchive(root.archive);
    expect(posts).toHaveLength(3);
    expect(posts[0].day).toBe('2024-11-21');
    expect(posts[0].text).toContain('Fresh wallet feedback');

    const manifest = await backloadCommunityArchive({ archive: root.archive, target: root.target, sessionId: 'acct_test', sourceLabel: 'Community test' });
    expect(manifest.totalPosts).toBe(3);
    expect(manifest.writtenPages).toBe(2);
    expect(manifest.skippedPages).toBe(0);

    const dayPage = JSON.parse(await readFile(path.join(root.target, 'data/diary/2024-11-21.json'), 'utf8'));
    expect(dayPage.sessionId).toBe('acct_test');
    expect(dayPage.entry.title).toBe('Community Archive: 2 posts');
    expect(dayPage.turns).toHaveLength(4);
    expect(dayPage.turns[1].content).toContain('Backload receipt');

    const manifestFile = JSON.parse(await readFile(path.join(root.target, 'data/backloads/community-archive-backload-manifest.json'), 'utf8'));
    expect(manifestFile.posts[0].diaryPath).toBe('data/diary/2024-11-21.json');

    const second = await backloadCommunityArchive({ archive: root.archive, target: root.target, sessionId: 'acct_test', sourceLabel: 'Community test' });
    expect(second.writtenPages).toBe(0);
    expect(second.skippedPages).toBe(2);
  });

  it('parses JSONL captures', async () => {
    const root = await makeJsonlFixture();
    const posts = await parseCommunityArchive(root.archive);
    expect(posts).toHaveLength(1);
    expect(posts[0].platform).toBe('api_incremental');
    expect(posts[0].engagement).toBe(8);
  });

  it('merges the main archive with latest-tweet incrementals and dedupes by id', async () => {
    const root = await makeJsonFixture();
    const incremental = await makeIncrementalFixture();
    const posts = await parseCommunityArchiveBundle(root.archive, [incremental.archive]);
    expect(posts.map((post) => post.id).sort()).toEqual(['333', '334', '335', '336']);

    const manifest = await backloadCommunityArchive({
      archive: root.archive,
      incremental: [incremental.archive],
      target: root.target,
      sessionId: 'acct_test',
      sourceLabel: 'Community main plus latest',
    });
    expect(manifest.totalPosts).toBe(4);
    expect(manifest.incrementalArchives).toHaveLength(1);
    expect(manifest.writtenPages).toBe(3);

    const latestPage = JSON.parse(await readFile(path.join(root.target, 'data/diary/2024-11-23.json'), 'utf8'));
    expect(latestPage.turns[0].content).toContain('Latest tweet after export');
  });
});

async function makeJsonFixture(): Promise<{ archive: string; target: string }> {
  const actualBase = await mkdtemp(path.join(tmpdir(), 'community-backload-fixture-'));
  await mkdir(path.join(actualBase, 'target'), { recursive: true });
  const archive = path.join(actualBase, 'archive.json');
  await writeFile(archive, JSON.stringify({
    tweets: [
      {
        tweet: {
          id_str: '333',
          created_at: 'Thu Nov 21 18:15:48 +0000 2024',
          text: 'Fresh wallet feedback after the archive upload. What should we build next?',
          favorite_count: 7,
          retweet_count: 1,
          reply_count: 0,
          screen_name: 'hitchhikerglitch',
        },
      },
      {
        tweet: {
          id_str: '334',
          created_at: '2024-11-21T19:15:48.000Z',
          full_text: 'Second same-day post about community memory.',
          favorite_count: 2,
          retweet_count: 0,
          reply_count: 1,
          screen_name: 'hitchhikerglitch',
        },
      },
      {
        tweet: {
          id_str: '335',
          created_at: '2024-11-22T01:00:00.000Z',
          text: 'A new day in the archive.',
          favorite_count: 1,
        },
      },
      {
        tweet: {
          id_str: '333',
          created_at: 'Thu Nov 21 18:15:48 +0000 2024',
          text: 'Duplicate should dedupe.',
        },
      },
    ],
  }, null, 2));
  return { archive, target: path.join(actualBase, 'target') };
}

async function makeJsonlFixture(): Promise<{ archive: string }> {
  const actualBase = await mkdtemp(path.join(tmpdir(), 'community-jsonl-fixture-'));
  const archive = path.join(actualBase, 'archive.jsonl');
  await writeFile(archive, '{"tweet_id":"333","created_at":"Thu Nov 21 18:15:48 +0000 2024","text":"Fresh wallet feedback after the archive upload.","favorite_count":7,"retweet_count":1,"source_dataset":"api_incremental"}\n');
  return { archive };
}

async function makeIncrementalFixture(): Promise<{ archive: string }> {
  const actualBase = await mkdtemp(path.join(tmpdir(), 'community-incremental-fixture-'));
  const archive = path.join(actualBase, 'latest.jsonl');
  await writeFile(archive, [
    '{"tweet_id":"334","created_at":"2024-11-21T19:15:48.000Z","text":"Duplicate latest capture should not override the main archive."}',
    '{"tweet_id":"336","created_at":"2024-11-23T03:00:00.000Z","text":"Latest tweet after export.","favorite_count":4,"source_dataset":"api_incremental"}',
    '',
  ].join('\n'));
  return { archive };
}
