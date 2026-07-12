import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

describe('guide imports', () => {
  it('creates account-owned import sources and dedupes imported items', async () => {
    process.env.GUIDE_DATA_DIR = await mkdtemp(path.join(tmpdir(), 'guide-imports-'));
    vi.resetModules();
    const store = await import('../src/domain/store');
    const account = await store.markAccountPaid('imports-test@example.com');
    const source = await store.createImportSource(account.id, {
      kind: 'x_archive_json',
      label: 'Test X archive',
      items: [
        {
          externalId: 'tweet-1',
          url: 'https://x.com/example/status/1',
          title: 'First dispatch',
          text: 'The thesis means nothing without the artifact.',
          createdAt: '2026-01-02T03:04:05.000Z',
        },
      ],
    });

    const first = await store.runImportSource(account.id, source.id, 50);
    expect(first.summary.imported).toBe(1);
    expect(first.items[0].day).toBe('2026-01-02');
    expect(first.items[0].accountId).toBe(account.id);

    const second = await store.runImportSource(account.id, source.id, 50);
    expect(second.summary.imported).toBe(0);
    expect(second.summary.skipped).toBe(1);

    const matches = await store.listImportedItems(account.id, { query: 'artifact', limit: 10 });
    expect(matches).toHaveLength(1);
    expect(matches[0].sourceKind).toBe('x_archive_json');
  });
});
