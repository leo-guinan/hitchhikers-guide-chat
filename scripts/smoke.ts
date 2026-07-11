import { answerChat, pricingPlan, summarizeDiaryPage } from '../src/domain/engine';
import { createCheckoutSession } from '../src/domain/payments';
import { appendDiaryTurn, createContextRequest, createFutureAnalysisRequest, getDiaryPage, listContextRequests, saveDiaryEntry, searchDiaryPages } from '../src/domain/store';

async function main() {
  const sessionId = `smoke-${Date.now()}`;
  const day = '2099-01-01';
  const answer = await answerChat(sessionId, 'What is the latest context from my client?', [], day);
  if (!answer.needsHumanContext) throw new Error('expected context boundary');
  if (pricingPlan.priceUsd !== 42) throw new Error('wrong price');
  const checkout = await createCheckoutSession({
    sessionId,
    successUrl: 'http://localhost:4142/?checkout=success',
    cancelUrl: 'http://localhost:4142/?checkout=cancelled',
  });
  if (checkout.priceId !== 'price_1Ts6ceGzXpChNrVvnNrQ44Ms') throw new Error('wrong Stripe price id');
  await appendDiaryTurn(day, sessionId, { role: 'user', content: 'What is the latest context from my client?' });
  await appendDiaryTurn(day, sessionId, { role: 'assistant', content: answer.answer });
  const page = await getDiaryPage(day, sessionId);
  if (page.turns.length !== 2) throw new Error('diary turns not persisted');
  const entry = summarizeDiaryPage(page);
  await saveDiaryEntry(day, sessionId, entry);
  const matches = await searchDiaryPages('client');
  if (!matches.some((item) => item.day === day)) throw new Error('diary search missed page');
  const request = await createContextRequest({
    sessionId,
    userMessage: 'What is the latest context from my client?',
    missingContext: answer.contextPrompt,
    urgency: 'normal',
    source: 'chat-boundary',
    diaryDay: day,
  });
  const future = await createFutureAnalysisRequest({ sessionId, day, delay: '24h', question: 'What did I miss today?' });
  const requests = await listContextRequests();
  if (!requests.some((item) => item.id === request.id)) throw new Error('context request not persisted');
  if (!future.contextRequestId) throw new Error('future analysis did not open a context request');
  console.log(JSON.stringify({ ok: true, price: pricingPlan.priceUsd, stripeConfigured: checkout.configured, stripePriceId: checkout.priceId, diaryDay: day, turnCount: page.turns.length, entryId: entry.id, futureId: future.id, requestId: request.id, answerChars: answer.answer.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
