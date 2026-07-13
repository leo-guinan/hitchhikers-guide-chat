import { describe, expect, it } from 'vitest';
import { buildDiaryHeatmap, pageToHeatCell } from '../src/domain/heatmap';
import type { DiaryPage } from '../src/domain/schema';

describe('diary heatmap', () => {
  it('maps diary page shape and activity into heat cells', () => {
    const page: DiaryPage = {
      day: '2026-07-06',
      sessionId: 'acct_test',
      createdAt: '2026-07-06T12:00:00.000Z',
      updatedAt: '2026-07-06T12:10:00.000Z',
      turns: [
        { id: 'u1', role: 'user', content: 'Should this import be trusted?', createdAt: '2026-07-06T12:00:00.000Z' },
        { id: 'a1', role: 'assistant', content: 'Conversation heat analysis says this archive import is hot enough to inspect.', createdAt: '2026-07-06T12:01:00.000Z' },
      ],
      entry: {
        id: 'entry_1',
        day: '2026-07-06',
        createdAt: '2026-07-06T12:10:00.000Z',
        updatedAt: '2026-07-06T12:10:00.000Z',
        title: 'Archive import day',
        summary: 'Compressed archive import with heat analysis.',
        keyQuestions: [],
        openLoops: [],
        humanContextNeeded: [],
        turnCount: 2,
        sourceTurnIds: ['u1', 'a1'],
      },
    };

    const cell = pageToHeatCell('2026-07-06', page);

    expect(cell.shape).toBe('mixed');
    expect(cell.turnCount).toBe(2);
    expect(cell.questionCount).toBe(1);
    expect(cell.entryCompressed).toBe(true);
    expect(cell.level).toBeGreaterThan(0);
  });

  it('builds a Sunday-aligned GitHub-style calendar window', () => {
    const heatmap = buildDiaryHeatmap([
      page('2026-07-01', 'Quiet note', 'One small note.'),
      page('2026-07-06', 'Hot conversation', 'Why does this have many turns?'),
    ], { endDay: '2026-07-06', weeks: 2 });

    expect(heatmap.startDay).toBe('2026-06-21');
    expect(heatmap.endDay).toBe('2026-07-06');
    expect(heatmap.cells).toHaveLength(16);
    expect(heatmap.totals.activeDays).toBe(2);
    expect(heatmap.totals.turns).toBe(4);
    expect(heatmap.cells.find((cell) => cell.day === '2026-06-30')?.level).toBe(0);
  });
});

function page(day: string, title: string, text: string): DiaryPage {
  return {
    day,
    sessionId: 'acct_test',
    createdAt: `${day}T12:00:00.000Z`,
    updatedAt: `${day}T12:10:00.000Z`,
    turns: [
      { id: `${day}_u`, role: 'user', content: text, createdAt: `${day}T12:00:00.000Z` },
      { id: `${day}_a`, role: 'assistant', content: 'Logged.', createdAt: `${day}T12:01:00.000Z` },
    ],
    entry: {
      id: `entry_${day}`,
      day,
      createdAt: `${day}T12:10:00.000Z`,
      updatedAt: `${day}T12:10:00.000Z`,
      title,
      summary: text,
      keyQuestions: [],
      openLoops: [],
      humanContextNeeded: [],
      turnCount: 2,
      sourceTurnIds: [`${day}_u`, `${day}_a`],
    },
  };
}
