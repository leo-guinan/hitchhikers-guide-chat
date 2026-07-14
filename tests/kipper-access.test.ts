import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';

describe('Kipper founder access', () => {
  it('creates a free-access account without marking it paid', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'guide-kipper-access-'));
    process.env.GUIDE_DATA_DIR = dataDir;
    vi.resetModules();
    const store = await import('../src/domain/store');

    const { account, session, receipt } = await store.createKipperSignup({ handle: '@hitchhikerglitch', quaiAddress: '0xquai_founder_address' });

    expect(account.email).toBe('kipper+hitchhikerglitch@users.hitchhikersguidetothefuture.com');
    expect(account.paid).toBe(false);
    expect(account.access).toBe('kipper_free');
    expect(account.kipperHandle).toBe('hitchhikerglitch');
    expect(account.quaiAddress).toBe('0xquai_founder_address');
    expect(store.hasGuideAccess(account)).toBe(true);
    expect(session.token).toMatch(/^sess_/);
    expect(receipt).toMatchObject({
      type: 'kipper_identity_receipt',
      accountId: account.id,
      xHandle: 'hitchhikerglitch',
      access: 'kipper_free',
      verificationStatus: 'local_only_pending_kipper_twitter_verification',
      settlementStatus: 'not_settleable_until_server_verified',
    });
  });

  it('records query receipts for the future Quai to OpenRouter bridge', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'guide-kipper-query-'));
    process.env.GUIDE_DATA_DIR = dataDir;
    vi.resetModules();
    const store = await import('../src/domain/store');
    const { account } = await store.createKipperSignup({ handle: 'builder' });

    const receipt = await store.recordQueryReceipt({
      account,
      day: '2026-07-13',
      messageChars: 41,
      answerChars: 119,
      mode: 'deterministic-fallback',
    });

    expect(receipt).toMatchObject({
      type: 'guide_query_receipt',
      accountId: account.id,
      access: 'kipper_free',
      day: '2026-07-13',
      estimatedInputTokens: 11,
      estimatedOutputTokens: 30,
      modelMode: 'deterministic-fallback',
      openRouterTokenBridge: { status: 'measured_not_settled' },
    });

    const receiptFiles = await readdir(path.join(dataDir, 'query-receipts'));
    expect(receiptFiles).toHaveLength(1);
    const log = await readFile(path.join(dataDir, 'query-receipts.jsonl'), 'utf8');
    expect(log).toContain(receipt.id);
  });
});
