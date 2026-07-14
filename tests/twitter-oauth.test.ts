import { mkdtemp, readdir } from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { buildTwitterOAuthStart, twitterOAuthConfigured, twitterRedirectUri } from '../src/domain/twitter-oauth';

describe('Twitter OAuth verification', () => {
  it('builds a PKCE Twitter OAuth URL and persists claimed handle state', () => {
    const start = buildTwitterOAuthStart({
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
    expect(start.state.claimedHandle).toBeUndefined();
    expect(start.state.codeVerifier.length).toBeGreaterThan(20);
  });

  it('creates a Twitter-primary account from OAuth', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'guide-twitter-verify-'));
    process.env.GUIDE_DATA_DIR = dataDir;
    vi.resetModules();
    const store = await import('../src/domain/store');

    const { account, session, receipt } = await store.createTwitterLogin({
      twitterHandle: 'hitchhikerglitch',
      twitterUserId: '12345',
    });

    expect(account.email).toBe('twitter+hitchhikerglitch@users.hitchhikersguidetothefuture.com');
    expect(account.access).toBe('twitter');
    expect(account.twitterHandle).toBe('hitchhikerglitch');
    expect(account.twitterVerified).toBe(true);
    expect(account.twitterUserId).toBe('12345');
    expect(session.token).toMatch(/^sess_/);
    expect(receipt).toMatchObject({
      type: 'twitter_oauth_login_receipt',
      accountId: account.id,
      xHandle: 'hitchhikerglitch',
      twitterUserId: '12345',
      verificationStatus: 'twitter_oauth_verified',
      settlementStatus: 'verified_not_settled',
    });
    expect(await readdir(path.join(dataDir, 'twitter-receipts'))).toHaveLength(1);
  });

  it('maps @leo_guinan to the original email account', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'guide-twitter-owner-'));
    process.env.GUIDE_DATA_DIR = dataDir;
    process.env.GUIDE_OWNER_TWITTER_HANDLE = 'leo_guinan';
    process.env.GUIDE_OWNER_EMAIL = 'leo@ideanexusventures.com';
    vi.resetModules();
    const store = await import('../src/domain/store');

    const { account } = await store.createTwitterLogin({ twitterHandle: 'leo_guinan', twitterUserId: 'leo-id' });

    expect(account.email).toBe('leo@ideanexusventures.com');
    expect(account.access).toBe('twitter');
    expect(account.twitterHandle).toBe('leo_guinan');
    expect(account.twitterVerified).toBe(true);
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
