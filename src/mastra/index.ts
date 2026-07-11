import { Mastra } from '@mastra/core';
import { registerApiRoute } from '@mastra/core/server';
import { ChatRequestSchema, CheckoutRequestSchema, ContextRequestSchema, DiaryCompressionRequestSchema, DiarySearchSchema, FutureAnalysisRequestSchema } from '../domain/schema';
import { answerChat, pricingPlan, summarizeDiaryPage } from '../domain/engine';
import { createCheckoutSession, stripePriceId } from '../domain/payments';
import { appendDiaryTurn, createContextRequest, createFutureAnalysisRequest, getDiaryPage, initStore, listContextRequests, saveDiaryEntry, searchDiaryPages, todayKey } from '../domain/store';
import { appHtml } from '../ui/app-html';

await initStore();

export const mastra = new Mastra({
  server: {
    apiRoutes: [
      registerApiRoute('/', {
        method: 'GET',
        requiresAuth: false,
        handler: async () => new Response(appHtml, { headers: { 'content-type': 'text/html; charset=utf-8' } }),
      }),
      registerApiRoute('/healthz', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => c.json({ ok: true, service: 'hitchhikers-guide-chat', priceUsdMonthly: 42, diaryUnit: 'day' }),
      }),
      registerApiRoute('/pricing', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => c.json({ plan: pricingPlan, stripePriceId }),
      }),
      registerApiRoute('/chat', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const body = ChatRequestSchema.parse(await c.req.json());
          const day = body.day ?? todayKey();
          const existingPage = await getDiaryPage(day, body.sessionId);
          await appendDiaryTurn(day, body.sessionId, { role: 'user', content: body.message });
          const history = existingPage.turns.map((turn) => ({ role: turn.role, content: turn.content }));
          const answer = await answerChat(body.sessionId, body.message, history, day);
          const updatedPage = await appendDiaryTurn(day, body.sessionId, { role: 'assistant', content: answer.answer });
          return c.json({ ...answer, diary: { day, turnCount: updatedPage.turns.length, entry: updatedPage.entry } });
        },
      }),
      registerApiRoute('/diary/today', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => c.json({ page: await getDiaryPage(todayKey(), c.req.query('sessionId') ?? 'anonymous') }),
      }),
      registerApiRoute('/diary', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => {
          const query = DiarySearchSchema.parse({ query: c.req.query('query') }).query ?? '';
          return c.json({ pages: await searchDiaryPages(query) });
        },
      }),
      registerApiRoute('/diary/:day', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => c.json({ page: await getDiaryPage(c.req.param('day'), c.req.query('sessionId') ?? 'anonymous') }),
      }),
      registerApiRoute('/diary/:day/compress', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const body = DiaryCompressionRequestSchema.parse(await c.req.json());
          const page = await getDiaryPage(c.req.param('day'), body.sessionId);
          const entry = summarizeDiaryPage(page);
          const updated = await saveDiaryEntry(c.req.param('day'), body.sessionId, entry);
          return c.json({ entry, page: updated });
        },
      }),
      registerApiRoute('/future-analysis', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const body = FutureAnalysisRequestSchema.parse(await c.req.json());
          return c.json({ request: await createFutureAnalysisRequest(body) }, 201);
        },
      }),
      registerApiRoute('/checkout/session', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const body = CheckoutRequestSchema.parse(await c.req.json());
          const checkout = await createCheckoutSession(body);
          return c.json({ checkout }, checkout.url ? 201 : 503);
        },
      }),
      registerApiRoute('/context-requests', {
        method: 'POST',
        requiresAuth: false,
        handler: async (c) => {
          const body = ContextRequestSchema.parse(await c.req.json());
          return c.json({ request: await createContextRequest(body) }, 201);
        },
      }),
      registerApiRoute('/context-requests', {
        method: 'GET',
        requiresAuth: false,
        handler: async (c) => c.json({ requests: await listContextRequests() }),
      }),
    ],
  },
});
