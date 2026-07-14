import { createHash, randomBytes } from 'node:crypto';
import type { TwitterOAuthState } from './schema';

const authorizeUrl = 'https://twitter.com/i/oauth2/authorize';
const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
const meUrl = 'https://api.twitter.com/2/users/me?user.fields=username';

export type TwitterOAuthConfig = {
  clientId?: string;
  clientSecret?: string;
  redirectUri: string;
};

export type TwitterOAuthStart = {
  state: TwitterOAuthState;
  url: string;
};

export type TwitterOAuthUser = {
  id: string;
  username: string;
};

export function twitterOAuthConfigured(env = process.env): boolean {
  return Boolean(env.TWITTER_CLIENT_ID);
}

export function buildTwitterOAuthStart(input: { claimedHandle?: string; quaiAddress?: string; redirectUri: string; env?: NodeJS.ProcessEnv }): TwitterOAuthStart {
  const env = input.env ?? process.env;
  const clientId = env.TWITTER_CLIENT_ID;
  if (!clientId) throw new Error('TWITTER_CLIENT_ID is not configured');
  const stateValue = base64Url(randomBytes(32));
  const codeVerifier = base64Url(randomBytes(32));
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: input.redirectUri,
    scope: 'users.read',
    state: stateValue,
    code_challenge: sha256Base64Url(codeVerifier),
    code_challenge_method: 'S256',
  });
  const now = new Date();
  return {
    state: {
      state: stateValue,
      codeVerifier,
      claimedHandle: input.claimedHandle,
      quaiAddress: input.quaiAddress,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString(),
    },
    url: `${authorizeUrl}?${params.toString()}`,
  };
}

export async function exchangeTwitterCode(input: { code: string; codeVerifier: string; config: TwitterOAuthConfig }): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.config.redirectUri,
    code_verifier: input.codeVerifier,
    client_id: required(input.config.clientId, 'TWITTER_CLIENT_ID'),
  });
  const headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded' };
  if (input.config.clientSecret) {
    headers.authorization = `Basic ${Buffer.from(`${input.config.clientId}:${input.config.clientSecret}`).toString('base64')}`;
  }
  const response = await fetch(tokenUrl, { method: 'POST', headers, body });
  const text = await response.text();
  if (!response.ok) throw new Error(`Twitter token exchange failed ${response.status}: ${text.slice(0, 500)}`);
  const data = JSON.parse(text) as { access_token?: string };
  if (!data.access_token) throw new Error('Twitter token exchange returned no access token');
  return data.access_token;
}

export async function fetchTwitterUser(accessToken: string): Promise<TwitterOAuthUser> {
  const response = await fetch(meUrl, { headers: { authorization: `Bearer ${accessToken}` } });
  const text = await response.text();
  if (!response.ok) throw new Error(`Twitter user fetch failed ${response.status}: ${text.slice(0, 500)}`);
  const data = JSON.parse(text) as { data?: { id?: string; username?: string } };
  if (!data.data?.id || !data.data.username) throw new Error('Twitter user fetch returned no id/username');
  return { id: data.data.id, username: data.data.username };
}

export function twitterRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, '')}/auth/twitter/callback`;
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function sha256Base64Url(value: string): string {
  return base64Url(createHash('sha256').update(value).digest());
}

function base64Url(value: Buffer): string {
  return value.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
