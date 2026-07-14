import { mkdtemp } from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';

describe('user action tracking', () => {
  it('records actions and aggregates users into pathway funnels', async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'guide-user-actions-'));
    process.env.GUIDE_DATA_DIR = dataDir;
    vi.resetModules();
    const store = await import('../src/domain/store');
    const { account } = await store.createTwitterLogin({ twitterHandle: 'pathfinder', twitterUserId: 'tw_1' });

    await store.recordUserAction({ action: 'enter_view', pathway: 'entry', sessionId: 'browser_a', path: '/enter' });
    await store.recordUserAction({ action: 'twitter_login_start', pathway: 'auth', sessionId: 'browser_a', path: '/enter' });
    await store.recordUserAction({ action: 'twitter_login_success', pathway: 'auth', sessionId: 'browser_a', path: '/auth/twitter/callback' }, account);
    await store.recordUserAction({ action: 'app_view', pathway: 'diary', sessionId: 'browser_a', path: '/app' }, account);
    await store.recordUserAction({ action: 'chat_send', pathway: 'diary', sessionId: 'browser_a', path: '/app', detail: 'message_chars:27' }, account);
    await store.recordUserAction({ action: 'branch_future', pathway: 'future', sessionId: 'browser_a', path: '/app' }, account);
    await store.recordUserAction({ action: 'enter_view', pathway: 'entry', sessionId: 'browser_b', path: '/enter' });

    const dashboard = await store.getUserActionDashboard();

    expect(dashboard.totals.events).toBe(7);
    expect(dashboard.totals.users).toBe(2);
    expect(dashboard.funnel.map((step) => [step.action, step.users])).toEqual([
      ['enter_view', 2],
      ['twitter_login_start', 1],
      ['twitter_login_success', 1],
      ['app_view', 1],
      ['chat_send', 1],
      ['branch_future', 1],
    ]);
    expect(dashboard.pathways.find((pathway) => pathway.pathway === 'diary')?.events).toBe(2);
    const identified = dashboard.recentUsers.find((user) => user.handle === 'pathfinder');
    expect(identified?.lastAction).toBe('branch_future');
  });
});
