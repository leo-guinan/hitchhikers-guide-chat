import { describe, expect, it } from 'vitest';
import { answerChat, buildContextPrompt, buildDiaryCompass, pricingPlan, summarizeDiaryPage } from '../src/domain/engine';

describe('guide engine', () => {
  it('exposes the single $42/month plan', () => {
    expect(pricingPlan.priceUsd).toBe(42);
    expect(pricingPlan.interval).toBe('month');
    expect(pricingPlan.includes.join(' ')).toContain('Human context');
    expect(pricingPlan.includes.join(' ')).toContain('Daily diary pages');
  });

  it('answers ordinary chat without forcing a human request', async () => {
    const answer = await answerChat('s1', 'Help me decide what to build first');
    expect(answer.needsHumanContext).toBe(false);
    expect(answer.answer).toContain('small, observable');
    expect(answer.receipt.mode).toBe('deterministic-fallback');
  });

  it('detects current/private context boundaries', async () => {
    const answer = await answerChat('s1', 'What is the latest price for this current tool?');
    expect(answer.needsHumanContext).toBe(true);
    expect(answer.contextPrompt).toContain('current source links');
  });

  it('builds targeted human lookup prompts', () => {
    expect(buildContextPrompt('check my email account')).toContain('private record');
    expect(buildContextPrompt('what should I say to this client')).toContain('last interaction');
  });

  it('compresses a diary page into a searchable entry', () => {
    const entry = summarizeDiaryPage({
      day: '2026-07-11',
      sessionId: 's1',
      createdAt: '2026-07-11T00:00:00.000Z',
      updatedAt: '2026-07-11T00:01:00.000Z',
      turns: [
        { id: 't1', role: 'user', content: 'What should I build next?', createdAt: '2026-07-11T00:00:00.000Z' },
        { id: 't2', role: 'assistant', content: 'You need human context. Ask for: client notes.', createdAt: '2026-07-11T00:01:00.000Z' },
      ],
    });
    expect(entry.day).toBe('2026-07-11');
    expect(entry.turnCount).toBe(2);
    expect(entry.keyQuestions[0]).toContain('build next');
    expect(entry.humanContextNeeded.join(' ')).toContain('human context');
  });

  it('builds a diary compass with past link, present reflection, and future question', () => {
    const compass = buildDiaryCompass('How should I explain the product?', '2026-07-14', [
      priorPage(),
    ]);

    expect(compass).toContain('From the diary:');
    expect(compass).toContain('Past: [Trust substrate positioning](/diary/2026-07-11)');
    expect(compass).toContain('Now:');
    expect(compass).toContain('Future:');
  });

  it('keeps chat answers conversational instead of exposing receipt boilerplate', async () => {
    const answer = await answerChat('s1', "what's thermodynamic crypto?", [
      { role: 'user', content: 'what should we build?' },
      { role: 'assistant', content: 'Something small.' },
    ], '2026-07-14', [priorPage()]);

    expect(answer.answer).toContain('From the diary:');
    expect(answer.answer).toContain('Past: [Trust substrate positioning](/diary/2026-07-11)');
    expect(answer.answer).not.toContain('This answer belongs to today’s diary page');
    expect(answer.answer).not.toContain('I am carrying 2 turns');
    expect(answer.answer).not.toContain('Diary compass:');
    expect(answer.answer).not.toContain('Present reflection:');
    expect(answer.answer).not.toContain('Future question:');
    expect(answer.answer).not.toMatch(/How do you know.*How do you know/);
  });
});

function priorPage() {
  return {
    day: '2026-07-11',
    sessionId: 's1',
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:01:00.000Z',
    entry: {
      id: 'entry_20260711',
      day: '2026-07-11',
      createdAt: '2026-07-11T00:01:00.000Z',
      updatedAt: '2026-07-11T00:01:00.000Z',
      title: 'Trust substrate positioning',
      summary: '- The Alignment Test: 2026-07-12 Substack import: How do you know if your AI system is aligned? The Alignment Test How do you know if your AI system is aligned? How do you know if your AI system is aligned?',
      keyQuestions: ['What proof makes this believable?'],
      openLoops: ['Find the smallest credible demo.'],
      humanContextNeeded: [],
      turnCount: 2,
      sourceTurnIds: ['t1', 't2'],
    },
    turns: [],
  };
}
