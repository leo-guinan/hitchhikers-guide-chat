import { mkdtemp, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { buildTwitterOAuthStart, twitterOAuthConfigured, twitterRedirectUri } from '../src/domain/twitter-oauth';

describe('Twitter OAuth verification', () => {
  it('builds a PKCE Twitter OAuth URL and persists claimed handle state', () => {
    const start = buildTwitterOAuthStart({
      claimedHandle: 'LeoGuinan',
      redirectUri: twitterRedirectUri('https://chat.hitchhikersguidetothefuture.com'),
      env: { TWITTER_CLIENT_ID: 'client_123' } as NodeJS.ProcessEnv,
    });
    const url = new URL(start.url);

    expect(twitterOAuthConfigured({ TWITTER_CLIENT_ID: 'client_123' } as NodeJS.ProcessEnv)).toBe(true);
    expect(url.origin + url.pathname).toBe('https://twitter.com/i/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('client_123');
    expect(url.searchParams.get('redirect_uri')).toBe('https://chat.hitchhikersguidetothefuture.com/auth/twitter/callback');
    expect(url.searchParams.get('scope')).toContain('users.read');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(start.state.claimedHandle).toBe('LeoGuinan');
    expect(start.state.codeVerifier.length).toBeGreaterThan(20);
  });

  it('upgrades a matching Kipper handle to Twitter-verified access', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'guide-twitter-verify-'));
    process.env.GUIDE_DATA_DIR = dataDir;
    vi.resetModules();
    const store = await import('../src/domain/store');

    const { account, session, receipt } = await store.verifyKipperTwitterHandle({
      claimedHandle: '@HitchhikerGlitch',
      twitterHandle: 'hitchhikerglitch',
      twitterUserId: '12345',
      quaiAddress: '0xquai_verified',
    });

    expect(account.access).toBe('kipper_free');
    expect(account.twitterVerified).toBe(true);
    expect(account.twitterUserId).toBe('12345');
    expect(account.quaiAddress).toBe('0xquai_verified');
    expect(session.token).toMatch(/^sess_/);
    expect(receipt).toMatchObject({
      type: 'twitter_verified_kipper_receipt',
      accountId: account.id,
      xHandle: 'hitchhikerglitch',
      twitterUserId: '12345',
      verificationStatus: 'twitter_oauth_verified',
      settlementStatus: 'verified_not_settled',
    });
    expect(await readdir(path.join(dataDir, 'twitter-receipts'))).toHaveLength(1);
  });

  it('rejects a mismatched Twitter handle', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'guide-twitter-mismatch-'));
    process.env.GUIDE_DATA_DIR = dataDir;
    vi.resetModules();
    const store = await import('../src/domain/store');

    await expect(store.verifyKipperTwitterHandle({
      claimedHandle: 'alice',
      twitterHandle: 'bob',
      twitterUserId: '999',
    })).rejects.toThrow('did not match claimed Kipper handle');
  });
});
