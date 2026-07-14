import { Mastra } from '@mastra/core';
import { registerApiRoute } from '@mastra/core/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import {
  ChatRequestSchema,
  CheckoutRequestSchema,
  ContextRequestSchema,
  DiaryCompressionRequestSchema,
  DiarySearchSchema,
  EmailAuthRequestSchema,
  EmailAuthVerifySchema,
  FutureAnalysisRequestSchema,
  ImportedItemSearchSchema,
  ImportRunRequestSchema,
  ImportSourceCreateSchema,
  KipperFeedbackSchema,
  KipperSignupSchema,
  type Account,
} from '../domain/schema';
import { answerChat, pricingPlan, rankDiaryPagesForQuery, summarizeDiaryPage } from '../domain/engine';
import { buildDiaryHeatmap } from '../domain/heatmap';
import { createCheckoutSession, stripePriceId } from '../domain/payments';
import {
  accountAccess,
  appendDiaryTurn,
  createContextRequest,
  createFutureAnalysisRequest,
  createKipperSignup,
  createImportSource,
  createTwitterLogin,
  ensureOwnerAccountBackfill,
  getDiaryPage,
  hasGuideAccess,
  getSessionAccount,
  initStore,
  listImportedItems,
  listImportSources,
  listContextRequests,
  markAccountPaid,
  recordKipperFeedback,
  recordQueryReceipt,
  requestEmailCode,
  runImportSource,
  saveDiaryEntry,
  searchDiaryPages,
  todayKey,
  saveTwitterOAuthState,
  consumeTwitterOAuthState,
  verifyEmailCode,
  verifyKipperTwitterHandle,
} from '../domain/store';
import { appHtml, searchHtml, enterHtml, appPageHtml, hotspotsHtml, importsHtml } from '../ui/app-html';
import { buildTwitterOAuthStart, exchangeTwitterCode, fetchTwitterUser, twitterOAuthConfigured, twitterRedirectUri } from '../domain/twitter-oauth';

await initStore();

const freeAccessEmails = new Set((process.env.GUIDE_FREE_ACCESS_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));

export const mastra = new Mastra({
  server: {
    apiRoutes: [
      registerApiRoute('/', {
        method: 'GET',
        requiresAuth: false,
        handler: async () => new Response(appHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
      }),
      registerApiRoute('/enter', {
        method: 'GET',
        requiresAuth: false,
        handler: async () => new Response(enterHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
      }),
      registerApiRoute('/app', {
        method: 'GET',
        requiresAuth: false,
        handler: async () => new Response(appPageHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
      }),
      registerApiRoute('/search', {
        method: 'GET',
        requiresAuth: false,
        handler: async () => new Response(searchHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
      }),
      registerApiRoute('/hotspots', {
        method: 'GET',
        requiresAuth: false,
        handler: async () => new Response(hotspotsHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
      }),
      registerApiRoute('/imports', {
        method: 'GET',
        requiresAuth: false,
        handler: async () => new Response(importsHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
      }),
      registerApiRoute('/healthz', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => c.json({ ok: true, service: 'hitchhikers-guide-chat', priceUsdMonthly: 42, diaryUnit: 'day', auth: 'twitter-oauth+email-backup', paywall: true, twitterOAuthConfigured: twitterOAuthConfigured() }),
      }),
      registerApiRoute('/pricing', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => c.json({ plan: pricingPlan, stripePriceId }),
      }),
      registerApiRoute('/auth/request-code', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const parsed = await parseJsonBody(c, EmailAuthRequestSchema);
          if (parsed instanceof Response) return parsed;
          const body = parsed;
          const result = await requestEmailCode(body.email);
          return c.json({ ok: true, email: result.email, expiresAt: result.expiresAt, delivery: result.delivery, devCode: result.devCode });
        },
      }),
      registerApiRoute('/auth/verify', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const parsed = await parseJsonBody(c, EmailAuthVerifySchema);
          if (parsed instanceof Response) return parsed;
          const body = parsed;
          const { account, session } = await verifyEmailCode(body.email, body.code);
          const paidAccount = freeAccessEmails.has(account.email) ? await markAccountPaid(account.email) : account;
          await ensureOwnerAccountBackfill(paidAccount);
          return c.json({ ok: true, token: session.token, account: publicAccount(paidAccount) });
        },
      }),
      registerApiRoute('/auth/kipper', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const parsed = await parseJsonBody(c, KipperSignupSchema);
          if (parsed instanceof Response) return parsed;
          const { account, session, receipt } = await createKipperSignup(parsed);
          await ensureOwnerAccountBackfill(account);
          return c.json({ ok: true, token: session.token, account: publicAccount(account), receipt }, 201);
        },
      }),
      registerApiRoute('/auth/twitter/start', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          if (!twitterOAuthConfigured()) return htmlResponse(twitterResultHtml({ ok: false, title: 'Twitter OAuth not configured', message: 'TWITTER_CLIENT_ID is missing on the server. Email sign-in remains available as backup.' }), 503);
          const origin = publicOrigin(c.req.url);
          const start = buildTwitterOAuthStart({ redirectUri: twitterRedirectUri(origin) });
          await saveTwitterOAuthState(start.state);
          return Response.redirect(start.url, 302);
        },
      }),
      registerApiRoute('/auth/twitter/callback', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          try {
            const error = c.req.query('error');
            if (error) throw new Error(`Twitter OAuth error: ${error}`);
            const code = c.req.query('code');
            const stateValue = c.req.query('state');
            if (!code || !stateValue) throw new Error('Twitter OAuth callback missing code/state');
            const state = await consumeTwitterOAuthState(stateValue);
            const origin = publicOrigin(c.req.url);
            const accessToken = await exchangeTwitterCode({ code, codeVerifier: state.codeVerifier, config: { clientId: process.env.TWITTER_CLIENT_ID, clientSecret: process.env.TWITTER_CLIENT_SECRET, redirectUri: twitterRedirectUri(origin) } });
            const twitterUser = await fetchTwitterUser(accessToken);
            const { account, session, receipt } = await createTwitterLogin({ twitterHandle: twitterUser.username, twitterUserId: twitterUser.id });
            await ensureOwnerAccountBackfill(account);
            return htmlResponse(twitterResultHtml({ ok: true, title: `Signed in as @${account.twitterHandle ?? twitterUser.username}`, message: 'Twitter OAuth verified your handle. The time machine is open.', token: session.token, receiptId: receipt.id }));
          } catch (error) {
            return htmlResponse(twitterResultHtml({ ok: false, title: 'Twitter verification failed', message: (error as Error).message }), 400);
          }
        },
      }),
      registerApiRoute('/auth/me', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (account) await ensureOwnerAccountBackfill(account);
          return c.json({ account: account ? publicAccount(account) : null });
        },
      }),
      registerApiRoute('/kipper/feedback', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with Kipper first.' }, 401);
          if (account.access !== 'kipper_free') return c.json({ error: 'Kipper founder access is required before feedback rewards can be logged.' }, 403);
          const parsed = await parseJsonBody(c, KipperFeedbackSchema);
          if (parsed instanceof Response) return parsed;
          return c.json({ receipt: await recordKipperFeedback(account, parsed) }, 201);
        },
      }),
      registerApiRoute('/chat', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!hasGuideAccess(account)) return c.json({ error: 'Sign in with Twitter or use the email backup before chat unlocks.' }, 402);
          const parsed = await parseJsonBody(c, ChatRequestSchema);
          if (parsed instanceof Response) return parsed;
          const body = parsed;
          const day = body.day ?? todayKey();
          const existingPage = await getDiaryPage(day, account.id);
          await appendDiaryTurn(day, account.id, { role: 'user', content: body.message });
          const history = existingPage.turns.map((turn) => ({ role: turn.role, content: turn.content }));
          const pastPages = (await searchDiaryPages('', account.id)).filter((page) => page.day < day && page.entry);
          const answer = await answerChat(account.id, body.message, history, day, pastPages);
          const updatedPage = await appendDiaryTurn(day, account.id, { role: 'assistant', content: answer.answer });
          const queryReceipt = await recordQueryReceipt({ account, day, messageChars: answer.receipt.messageChars, answerChars: answer.receipt.answerChars, mode: answer.receipt.mode, model: answer.receipt.model });
          return c.json({ ...answer, diary: { day, turnCount: updatedPage.turns.length, entry: updatedPage.entry }, queryReceipt });
        },
      }),
      registerApiRoute('/diary/today', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!hasGuideAccess(account)) return c.json({ error: 'Sign in with Twitter or use the email backup before chat unlocks.' }, 402);
          return c.json({ page: await getDiaryPage(todayKey(), account.id) });
        },
      }),
      registerApiRoute('/diary', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!hasGuideAccess(account)) return c.json({ error: 'Sign in with Twitter or use the email backup before chat unlocks.' }, 402);
          const parsed = parseValue(DiarySearchSchema, { query: c.req.query('query') });
          if (parsed instanceof Response) return parsed;
          const query = parsed.query ?? '';
          const pages = await searchDiaryPages('', account.id);
          return c.json({ pages: query ? rankDiaryPagesForQuery(query, '9999-12-31', pages).map((result) => result.page) : pages });
        },
      }),
      registerApiRoute('/diary/heatmap', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!hasGuideAccess(account)) return c.json({ error: 'Sign in with Twitter or use the email backup before chat unlocks.' }, 402);
          const requestedWeeks = Number(c.req.query('weeks') ?? 53);
          const weeks = Number.isFinite(requestedWeeks) ? Math.max(1, Math.min(104, requestedWeeks)) : 53;
          return c.json({ heatmap: buildDiaryHeatmap(await searchDiaryPages('', account.id), { weeks }) });
        },
      }),
      registerApiRoute('/diary/:day', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!hasGuideAccess(account)) return c.json({ error: 'Sign in with Twitter or use the email backup before chat unlocks.' }, 402);
          return c.json({ page: await getDiaryPage(c.req.param('day'), account.id) });
        },
      }),
      registerApiRoute('/diary/:day/compress', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!hasGuideAccess(account)) return c.json({ error: 'Sign in with Twitter or use the email backup before chat unlocks.' }, 402);
          const parsed = await parseJsonBody(c, DiaryCompressionRequestSchema);
          if (parsed instanceof Response) return parsed;
          const page = await getDiaryPage(c.req.param('day'), account.id);
          const entry = summarizeDiaryPage(page);
          const updated = await saveDiaryEntry(c.req.param('day'), account.id, entry);
          return c.json({ entry, page: updated });
        },
      }),
      registerApiRoute('/imports/sources', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          const account = await paidAccountFromRequest(c.req.raw);
          if (account instanceof Response) return account;
          return c.json({ sources: await listImportSources(account.id) });
        },
      }),
      registerApiRoute('/imports/sources', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const account = await paidAccountFromRequest(c.req.raw);
          if (account instanceof Response) return account;
          const parsed = await parseJsonBody(c, ImportSourceCreateSchema);
          if (parsed instanceof Response) return parsed;
          const body = parsed;
          return c.json({ source: await createImportSource(account.id, body) }, 201);
        },
      }),
      registerApiRoute('/imports/sources/:sourceId/run', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const account = await paidAccountFromRequest(c.req.raw);
          if (account instanceof Response) return account;
          const parsed = parseValue(ImportRunRequestSchema, await c.req.json().catch(() => ({})));
          if (parsed instanceof Response) return parsed;
          const body = parsed;
          try {
            const result = await runImportSource(account.id, c.req.param('sourceId'), body.limit);
            return c.json(result, 201);
          } catch (error) {
            return c.json({ error: (error as Error).message }, 404);
          }
        },
      }),
      registerApiRoute('/imports/items', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          const account = await paidAccountFromRequest(c.req.raw);
          if (account instanceof Response) return account;
          const parsed = parseValue(ImportedItemSearchSchema, { query: c.req.query('query'), sourceId: c.req.query('sourceId'), limit: Number(c.req.query('limit') ?? 50) });
          if (parsed instanceof Response) return parsed;
          const search = parsed;
          return c.json({ items: await listImportedItems(account.id, search) });
        },
      }),
      registerApiRoute('/future-analysis', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!hasGuideAccess(account)) return c.json({ error: 'Sign in with Twitter or use the email backup before chat unlocks.' }, 402);
          const parsed = await parseJsonBody(c, FutureAnalysisRequestSchema);
          if (parsed instanceof Response) return parsed;
          const body = parsed;
          return c.json({ request: await createFutureAnalysisRequest({ ...body, sessionId: account.id }) }, 201);
        },
      }),
      registerApiRoute('/checkout/session', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          const parsed = await parseJsonBody(c, CheckoutRequestSchema);
          if (parsed instanceof Response) return parsed;
          const body = parsed;
          const email = account?.email ?? body.email;
          if (!email) return c.json({ error: 'Enter an email first.' }, 400);
          const checkout = await createCheckoutSession({ ...body, sessionId: account?.id ?? body.sessionId, email });
          return c.json({ checkout }, checkout.url ? 201 : 503);
        },
      }),
      registerApiRoute('/stripe/webhook', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const rawBody = await c.req.text();
          if (!verifyStripeSignature(rawBody, c.req.raw.headers.get('stripe-signature'))) return c.json({ error: 'Invalid Stripe webhook signature' }, 400);
          const event = JSON.parse(rawBody) as StripeEvent;
          const account = await markPaidFromStripeEvent(event);
          return c.json({ received: true, paid: account ? publicAccount(account) : null });
        },
      }),
      registerApiRoute('/context-requests', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!hasGuideAccess(account)) return c.json({ error: 'Sign in with Twitter or use the email backup before chat unlocks.' }, 402);
          const parsed = await parseJsonBody(c, ContextRequestSchema);
          if (parsed instanceof Response) return parsed;
          const body = parsed;
          return c.json({ request: await createContextRequest({ ...body, sessionId: account.id }) }, 201);
        },
      }),
      registerApiRoute('/context-requests', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!hasGuideAccess(account)) return c.json({ error: 'Sign in with Twitter or use the email backup before chat unlocks.' }, 402);
          return c.json({ requests: await listContextRequests() });
        },
      }),
    ],
  },
});

function publicAccount(account: Account) {
  return { id: account.id, email: account.email, paid: account.paid, access: accountAccess(account), twitterHandle: account.twitterHandle, kipperHandle: account.kipperHandle, quaiAddress: account.quaiAddress, twitterVerified: account.twitterVerified ?? false, twitterVerifiedAt: account.twitterVerifiedAt };
}

async function accountFromRequest(request: Request): Promise<Account | null> {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : undefined;
  return getSessionAccount(token);
}

async function paidAccountFromRequest(request: Request): Promise<Account | Response> {
  const account = await accountFromRequest(request);
  if (!account) return jsonError('Sign in with email first.', 401);
  if (!hasGuideAccess(account)) return jsonError('A paid $42/month account or Kipper founder pass is required before imports unlock.', 402);
  return account;
}


function publicOrigin(requestUrl: string): string {
  return (process.env.GUIDE_PUBLIC_ORIGIN ?? new URL(requestUrl).origin).replace(/\/$/, '');
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

function twitterResultHtml(input: { ok: boolean; title: string; message: string; token?: string; receiptId?: string }): string {
  const safeTitle = escapeHtml(input.title);
  const safeMessage = escapeHtml(input.message);
  const tokenScript = input.token ? `<script>localStorage.guideAuthToken=${JSON.stringify(input.token)};localStorage.guideBookSeen='1';setTimeout(()=>{location.href='/app?twitter=verified'},1800);</script>` : '';
  const receipt = input.receiptId ? `<p class="receipt">receipt <b>${escapeHtml(input.receiptId)}</b></p>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0814;color:#eae2d0;font-family:system-ui,-apple-system,sans-serif}.card{max-width:620px;margin:24px;padding:28px;border:1px solid rgba(212,169,78,.35);border-radius:16px;background:rgba(18,13,30,.9)}h1{margin:0 0 12px;color:${input.ok ? '#d4a94e' : '#e8a48d'}}p{line-height:1.55;color:#c9bfa9}.receipt{font-family:monospace}a{color:#d4a94e}</style></head><body><main class="card"><h1>${safeTitle}</h1><p>${safeMessage}</p>${receipt}<p><a href="/enter">Back to entry</a> · <a href="/app">Open app</a></p></main>${tokenScript}</body></html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

async function parseJsonBody<T extends ZodTypeAny>(c: { req: { json: () => Promise<unknown> } }, schema: T): Promise<z.infer<T> | Response> {
  try {
    return schema.parse(await c.req.json()) as z.infer<T>;
  } catch (error) {
    return validationError(error);
  }
}

function parseValue<T extends ZodTypeAny>(schema: T, value: unknown): z.infer<T> | Response {
  try {
    return schema.parse(value) as z.infer<T>;
  } catch (error) {
    return validationError(error);
  }
}

function validationError(error: unknown): Response {
  if (error instanceof ZodError) {
    return jsonError(error.issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; '), 400);
  }
  return jsonError(error instanceof Error ? error.message : 'Invalid request body', 400);
}

type StripeEvent = {
  type?: string;
  data?: { object?: {
    customer?: string;
    subscription?: string;
    customer_email?: string;
    customer_details?: { email?: string };
    metadata?: { account_email?: string };
    items?: { data?: Array<{ price?: { id?: string } }> };
  } };
};

async function markPaidFromStripeEvent(event: StripeEvent): Promise<Account | null> {
  const object = event.data?.object;
  const priceId = object?.items?.data?.[0]?.price?.id;
  const isGuideSubscription = event.type === 'checkout.session.completed' || (event.type === 'customer.subscription.created' && (!priceId || priceId === stripePriceId));
  const email = object?.metadata?.account_email ?? object?.customer_details?.email ?? object?.customer_email;
  if (!isGuideSubscription || !email) return null;
  return markAccountPaid(email.toLowerCase(), { customerId: object?.customer, subscriptionId: object?.subscription });
}

function verifyStripeSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const parts = Object.fromEntries(signatureHeader.split(',').map((part) => part.split('=') as [string, string]));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
