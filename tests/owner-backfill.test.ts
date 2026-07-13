import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { DiaryPage } from '../src/domain/schema';

describe('owner account backfill', () => {
  it('claims configured legacy diary pages and mirrors entries into account import items', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'guide-owner-backfill-'));
    process.env.GUIDE_DATA_DIR = dataDir;
    process.env.GUIDE_OWNER_EMAILS = 'owner@example.com';
    process.env.GUIDE_LEGACY_ACCOUNT_IDS = 'acct_legacy';
    vi.resetModules();
    const store = await import('../src/domain/store');
    await mkdir(path.join(dataDir, 'diary'), { recursive: true });
    await writeFile(path.join(dataDir, 'diary', '2026-01-02.json'), JSON.stringify(page('2026-01-02', 'acct_legacy', 'Legacy page'), null, 2));
    await writeFile(path.join(dataDir, 'diary', '2026-01-03.json'), JSON.stringify(page('2026-01-03', 'acct_other', 'Other page'), null, 2));
    await writeFile(path.join(dataDir, 'diary', '2099-01-01.json'), JSON.stringify(page('2099-01-01', 'smoke-runner', 'Smoke page'), null, 2));

    const owner = await store.markAccountPaid('owner@example.com');
    const summary = await store.ensureOwnerAccountBackfill(owner);

    expect(summary.owner).toBe(true);
    expect(summary.claimedDiaryPages).toBe(1);
    expect(summary.backfilledImportItems).toBe(1);
    expect(await store.searchDiaryPages('', owner.id)).toHaveLength(1);
    const items = await store.listImportedItems(owner.id, { query: 'Legacy', limit: 10 });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ accountId: owner.id, sourceKind: 'diary_backfill', title: 'Legacy page' });

    const claimed = JSON.parse(await readFile(path.join(dataDir, 'diary', '2026-01-02.json'), 'utf8')) as DiaryPage;
    const untouched = JSON.parse(await readFile(path.join(dataDir, 'diary', '2026-01-03.json'), 'utf8')) as DiaryPage;
    const smoke = JSON.parse(await readFile(path.join(dataDir, 'diary', '2099-01-01.json'), 'utf8')) as DiaryPage;
    expect(claimed.sessionId).toBe(owner.id);
    expect(untouched.sessionId).toBe('acct_other');
    expect(smoke.sessionId).toBe('smoke-runner');
    expect(await store.searchDiaryPages('2099', owner.id)).toHaveLength(0);
  });

  it('does not backfill diary entries into arbitrary paid accounts', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'guide-non-owner-backfill-'));
    process.env.GUIDE_DATA_DIR = dataDir;
    process.env.GUIDE_OWNER_EMAILS = 'owner@example.com';
    process.env.GUIDE_LEGACY_ACCOUNT_IDS = 'acct_legacy';
    vi.resetModules();
    const store = await import('../src/domain/store');
    await mkdir(path.join(dataDir, 'diary'), { recursive: true });
    await writeFile(path.join(dataDir, 'diary', '2026-01-02.json'), JSON.stringify(page('2026-01-02', 'acct_legacy', 'Legacy page'), null, 2));

    const account = await store.markAccountPaid('reader@example.com');
    const summary = await store.ensureOwnerAccountBackfill(account);

    expect(summary.owner).toBe(false);
    expect(summary.claimedDiaryPages).toBe(0);
    expect(await store.searchDiaryPages('', account.id)).toHaveLength(0);
    expect(await store.listImportedItems(account.id, { limit: 10 })).toHaveLength(0);
  });
});

function page(day: string, sessionId: string, title: string): DiaryPage {
  return {
    day,
    sessionId,
    createdAt: `${day}T12:00:00.000Z`,
    updatedAt: `${day}T12:00:00.000Z`,
    turns: [
      { id: `${day}_title`, role: 'user', content: `Import ${title}`, createdAt: `${day}T12:00:00.000Z` },
      { id: `${day}_body`, role: 'assistant', content: `${title} body`, createdAt: `${day}T12:00:00.000Z` },
    ],
    entry: {
      id: `entry_${day}`,
      day,
      createdAt: `${day}T12:00:00.000Z`,
      updatedAt: `${day}T12:00:00.000Z`,
      title,
      summary: `${title} summary`,
      keyQuestions: ['What should survive the backfill?'],
      openLoops: [],
      humanContextNeeded: [],
      turnCount: 2,
      sourceTurnIds: [`${day}_title`, `${day}_body`],
    },
  };
}
