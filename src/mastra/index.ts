import { Mastra } from '@mastra/core';
import { registerApiRoute } from '@mastra/core/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
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
  type Account,
} from '../domain/schema';
import { answerChat, pricingPlan, summarizeDiaryPage } from '../domain/engine';
import { createCheckoutSession, stripePriceId } from '../domain/payments';
import {
  appendDiaryTurn,
  createContextRequest,
  createFutureAnalysisRequest,
  createImportSource,
  getDiaryPage,
  getSessionAccount,
  initStore,
  listImportedItems,
  listImportSources,
  listContextRequests,
  markAccountPaid,
  requestEmailCode,
  runImportSource,
  saveDiaryEntry,
  searchDiaryPages,
  todayKey,
  verifyEmailCode,
} from '../domain/store';
import { appHtml, searchHtml, enterHtml, appPageHtml, importsHtml } from '../ui/app-html';

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
      registerApiRoute('/imports', {
        method: 'GET',
        requiresAuth: false,
        handler: async () => new Response(importsHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
      }),
      registerApiRoute('/healthz', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => c.json({ ok: true, service: 'hitchhikers-guide-chat', priceUsdMonthly: 42, diaryUnit: 'day', auth: 'email', paywall: true }),
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
          const body = EmailAuthRequestSchema.parse(await c.req.json());
          const result = await requestEmailCode(body.email);
          return c.json({ ok: true, email: result.email, expiresAt: result.expiresAt, delivery: result.delivery, devCode: result.devCode });
        },
      }),
      registerApiRoute('/auth/verify', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const body = EmailAuthVerifySchema.parse(await c.req.json());
          const { account, session } = await verifyEmailCode(body.email, body.code);
          const paidAccount = freeAccessEmails.has(account.email) ? await markAccountPaid(account.email) : account;
          return c.json({ ok: true, token: session.token, account: publicAccount(paidAccount) });
        },
      }),
      registerApiRoute('/auth/me', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          return c.json({ account: account ? publicAccount(account) : null });
        },
      }),
      registerApiRoute('/chat', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!account.paid) return c.json({ error: 'A paid $42/month account is required before chat unlocks.' }, 402);
          const body = ChatRequestSchema.parse(await c.req.json());
          const day = body.day ?? todayKey();
          const existingPage = await getDiaryPage(day, account.id);
          await appendDiaryTurn(day, account.id, { role: 'user', content: body.message });
          const history = existingPage.turns.map((turn) => ({ role: turn.role, content: turn.content }));
          const answer = await answerChat(account.id, body.message, history, day);
          const updatedPage = await appendDiaryTurn(day, account.id, { role: 'assistant', content: answer.answer });
          return c.json({ ...answer, diary: { day, turnCount: updatedPage.turns.length, entry: updatedPage.entry } });
        },
      }),
      registerApiRoute('/diary/today', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!account.paid) return c.json({ error: 'A paid $42/month account is required before chat unlocks.' }, 402);
          return c.json({ page: await getDiaryPage(todayKey(), account.id) });
        },
      }),
      registerApiRoute('/diary', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!account.paid) return c.json({ error: 'A paid $42/month account is required before chat unlocks.' }, 402);
          const query = DiarySearchSchema.parse({ query: c.req.query('query') }).query ?? '';
          return c.json({ pages: await searchDiaryPages(query) });
        },
      }),
      registerApiRoute('/diary/:day', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!account.paid) return c.json({ error: 'A paid $42/month account is required before chat unlocks.' }, 402);
          return c.json({ page: await getDiaryPage(c.req.param('day'), account.id) });
        },
      }),
      registerApiRoute('/diary/:day/compress', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!account.paid) return c.json({ error: 'A paid $42/month account is required before chat unlocks.' }, 402);
          DiaryCompressionRequestSchema.parse(await c.req.json());
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
          const body = ImportSourceCreateSchema.parse(await c.req.json());
          return c.json({ source: await createImportSource(account.id, body) }, 201);
        },
      }),
      registerApiRoute('/imports/sources/:sourceId/run', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const account = await paidAccountFromRequest(c.req.raw);
          if (account instanceof Response) return account;
          const body = ImportRunRequestSchema.parse(await c.req.json().catch(() => ({})));
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
          const search = ImportedItemSearchSchema.parse({ query: c.req.query('query'), sourceId: c.req.query('sourceId'), limit: Number(c.req.query('limit') ?? 50) });
          return c.json({ items: await listImportedItems(account.id, search) });
        },
      }),
      registerApiRoute('/future-analysis', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!account.paid) return c.json({ error: 'A paid $42/month account is required before chat unlocks.' }, 402);
          const body = FutureAnalysisRequestSchema.parse(await c.req.json());
          return c.json({ request: await createFutureAnalysisRequest({ ...body, sessionId: account.id }) }, 201);
        },
      }),
      registerApiRoute('/checkout/session', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          const body = CheckoutRequestSchema.parse(await c.req.json());
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
          if (!account.paid) return c.json({ error: 'A paid $42/month account is required before chat unlocks.' }, 402);
          const body = ContextRequestSchema.parse(await c.req.json());
          return c.json({ request: await createContextRequest({ ...body, sessionId: account.id }) }, 201);
        },
      }),
      registerApiRoute('/context-requests', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          const account = await accountFromRequest(c.req.raw);
          if (!account) return c.json({ error: 'Sign in with email first.' }, 401);
          if (!account.paid) return c.json({ error: 'A paid $42/month account is required before chat unlocks.' }, 402);
          return c.json({ requests: await listContextRequests() });
        },
      }),
    ],
  },
});

function publicAccount(account: Account) {
  return { id: account.id, email: account.email, paid: account.paid };
}

async function accountFromRequest(request: Request): Promise<Account | null> {
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : undefined;
  return getSessionAccount(token);
}

async function paidAccountFromRequest(request: Request): Promise<Account | Response> {
  const account = await accountFromRequest(request);
  if (!account) return jsonError('Sign in with email first.', 401);
  if (!account.paid) return jsonError('A paid $42/month account is required before imports unlock.', 402);
  return account;
}

function jsonError(error: string, status: number): Response {
  return new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
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
