import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { backfillXImportedItemsToDiary, backloadXArchiveToImports, parseXArchiveNoteTweets, parseXArchiveTweets, xImportedItemsToDiaryPages } from '../src/domain/x-archive-backload';

describe('X archive import backload', () => {
  it('parses Twitter archive JS and note tweets', async () => {
    const root = await makeFixture();
    const tweets = await parseXArchiveTweets(root.tweetsFile, 'hitchhikerglitch');
    const notes = await parseXArchiveNoteTweets(root.notesFile, 'hitchhikerglitch');

    expect(tweets).toHaveLength(3);
    expect(tweets[0]).toMatchObject({ externalId: 'tweet:100', title: 'Tweet 2024-10-21 · 100' });
    expect(tweets[0].url).toBe('https://x.com/hitchhikerglitch/status/100');
    expect(notes).toHaveLength(1);
    expect(notes[0].externalId).toBe('note_tweet:900');
  });

  it('writes account-owned import items without storing the raw archive in the source', async () => {
    const root = await makeFixture();
    process.env.GUIDE_DATA_DIR = path.join(root.target, 'data');
    vi.resetModules();
    const store = await import('../src/domain/store');
    const account = await store.markAccountPaid('x-archive-test@example.com');
    const first = await backloadXArchiveToImports({
      tweetsFile: root.tweetsFile,
      noteTweetsFile: root.notesFile,
      target: root.target,
      accountId: account.id,
      label: 'Test X archive',
      handle: 'hitchhikerglitch',
    });

    expect(first.totalCandidates).toBe(4);
    expect(first.imported).toBe(3);
    expect(first.skippedRetweets).toBe(1);
    expect(first.dateRange).toEqual({ min: '2024-10-21', max: '2024-10-23' });

    const source = JSON.parse(await readFile(path.join(root.target, first.sourcePath), 'utf8'));
    expect(source).toMatchObject({ accountId: account.id, kind: 'x_archive_json', label: 'Test X archive' });
    expect(source.seedItems).toBeUndefined();

    const itemFiles = await readdir(path.join(root.target, 'data/imports/items'));
    expect(itemFiles).toHaveLength(3);
    expect(await store.listImportedItems(account.id, { limit: 10 })).toHaveLength(3);

    const second = await backloadXArchiveToImports({
      tweetsFile: root.tweetsFile,
      noteTweetsFile: root.notesFile,
      target: root.target,
      accountId: account.id,
      label: 'Test X archive',
      handle: 'hitchhikerglitch',
    });
    expect(second.imported).toBe(0);
    expect(second.skippedExisting).toBe(3);
  });

  it('projects X import artifacts into account-owned diary pages for Atlas', async () => {
    const root = await makeFixture();
    process.env.GUIDE_DATA_DIR = path.join(root.target, 'data');
    vi.resetModules();
    const store = await import('../src/domain/store');
    const account = await store.markAccountPaid('x-diary-test@example.com');
    const source = await store.createImportSource(account.id, {
      kind: 'x_archive_json',
      label: 'Leo X archive',
      items: [
        { externalId: 'tweet-1', title: 'Tweet one', text: 'First tweet asks what now?', createdAt: '2025-09-12T10:00:00.000Z' },
        { externalId: 'tweet-2', title: 'Tweet two', text: 'Second tweet ships the artifact.', createdAt: '2025-09-12T11:00:00.000Z' },
        { externalId: 'tweet-3', title: 'Tweet three', text: 'Another day.', createdAt: '2025-09-13T10:00:00.000Z' },
      ],
    });
    await store.runImportSource(account.id, source.id, 50);
    const items = await store.listImportedItems(account.id, { limit: 100 });
    const pages = xImportedItemsToDiaryPages(items, { accountId: account.id, sourceLabel: 'Leo X archive', generatedAt: '2026-07-13T00:00:00.000Z' });
    expect(pages).toHaveLength(2);
    expect(pages[0].entry?.title).toBe('X archive: 2 tweets');
    expect(pages[0].turns).toHaveLength(2);

    const manifest = await backfillXImportedItemsToDiary({ items, accountId: account.id, dataDir: path.join(root.target, 'data'), sourceLabel: 'Leo X archive' });
    expect(manifest.diaryPageCount).toBe(2);
    const diaryPages = await store.searchDiaryPages('artifact', account.id);
    expect(diaryPages.map((page) => page.day)).toContain('2025-09-12');
  });

});

async function makeFixture(): Promise<{ tweetsFile: string; notesFile: string; target: string }> {
  const root = await mkdtemp(path.join(tmpdir(), 'x-archive-backload-'));
  const target = path.join(root, 'target');
  await mkdir(target, { recursive: true });
  const tweetsFile = path.join(root, 'tweets.js');
  const notesFile = path.join(root, 'note-tweet.js');
  await writeFile(tweetsFile, `window.YTD.tweets.part0 = ${JSON.stringify([
    { tweet: { id_str: '100', created_at: 'Mon Oct 21 10:00:00 +0000 2024', full_text: 'The thesis means nothing without the artifact. https://t.co/void', favorite_count: '2', retweet_count: '1' } },
    { tweet: { id_str: '101', created_at: '2024-10-22T10:00:00.000Z', full_text: 'RT @someone: borrowed signal', favorite_count: '10' } },
    { tweet: { id_str: '102', created_at: '2024-10-23T10:00:00.000Z', full_text: 'Another authored dispatch.' } },
  ], null, 2)};`);
  await writeFile(notesFile, `window.YTD.note_tweet.part0 = ${JSON.stringify([
    { noteTweet: { noteTweetId: '900', createdAt: '2024-10-22T11:00:00.000Z', core: { text: 'Long-form note tweet with more room for the artifact.' } } },
  ], null, 2)};`);
  return { tweetsFile, notesFile, target };
}
