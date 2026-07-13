import type { ChatTurn, DiaryPage } from './schema';

export type DiaryHeatCell = {
  day: string;
  level: 0 | 1 | 2 | 3 | 4;
  heatScore: number;
  turnCount: number;
  charCount: number;
  userTurns: number;
  assistantTurns: number;
  systemTurns: number;
  questionCount: number;
  entryCompressed: boolean;
  shape: 'blank' | 'note' | 'conversation' | 'import' | 'analysis' | 'mixed';
  title?: string;
};

export type DiaryHeatmap = {
  startDay: string;
  endDay: string;
  cells: DiaryHeatCell[];
  totals: {
    days: number;
    activeDays: number;
    turns: number;
    chars: number;
    questions: number;
    compressedDays: number;
    flares: number;
  };
};

export function buildDiaryHeatmap(pages: DiaryPage[], options: { endDay?: string; weeks?: number } = {}): DiaryHeatmap {
  const sortedPages = [...pages].sort((a, b) => a.day.localeCompare(b.day));
  const lastDataDay = sortedPages[sortedPages.length - 1]?.day;
  const endDay = options.endDay ?? lastDataDay ?? todayKey();
  const weeks = options.weeks ?? 53;
  const end = parseDay(endDay);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (weeks * 7 - 1));
  // GitHub-style calendars start on Sunday so columns are complete weeks.
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const pageByDay = new Map(sortedPages.map((page) => [page.day, page]));
  const cells: DiaryHeatCell[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const day = formatDay(cursor);
    cells.push(pageToHeatCell(day, pageByDay.get(day)));
  }
  const totals = cells.reduce((acc, cell) => {
    acc.days += 1;
    if (cell.level > 0) acc.activeDays += 1;
    acc.turns += cell.turnCount;
    acc.chars += cell.charCount;
    acc.questions += cell.questionCount;
    if (cell.entryCompressed) acc.compressedDays += 1;
    if (cell.level === 4) acc.flares += 1;
    return acc;
  }, { days: 0, activeDays: 0, turns: 0, chars: 0, questions: 0, compressedDays: 0, flares: 0 });
  return { startDay: cells[0]?.day ?? endDay, endDay: cells[cells.length - 1]?.day ?? endDay, cells, totals };
}

export function pageToHeatCell(day: string, page?: DiaryPage): DiaryHeatCell {
  if (!page) return emptyCell(day);
  const turns = page.turns ?? [];
  const userTurns = turns.filter((turn) => turn.role === 'user').length;
  const assistantTurns = turns.filter((turn) => turn.role === 'assistant').length;
  const systemTurns = turns.filter((turn) => turn.role === 'system').length;
  const charCount = turns.reduce((acc, turn) => acc + turn.content.length, 0) + (page.entry?.summary.length ?? 0);
  const questionCount = countQuestions(turns);
  const heatScore = Math.round(
    turns.length * 3 +
    charCount / 900 +
    questionCount * 4 +
    (page.entry ? 8 : 0) +
    sourceDiversity(turns) * 5
  );
  return {
    day,
    level: levelForScore(heatScore),
    heatScore,
    turnCount: turns.length,
    charCount,
    userTurns,
    assistantTurns,
    systemTurns,
    questionCount,
    entryCompressed: Boolean(page.entry),
    shape: classifyShape(page),
    title: page.entry?.title,
  };
}

function emptyCell(day: string): DiaryHeatCell {
  return { day, level: 0, heatScore: 0, turnCount: 0, charCount: 0, userTurns: 0, assistantTurns: 0, systemTurns: 0, questionCount: 0, entryCompressed: false, shape: 'blank' };
}

function levelForScore(score: number): 0 | 1 | 2 | 3 | 4 {
  if (score <= 0) return 0;
  if (score < 18) return 1;
  if (score < 45) return 2;
  if (score < 90) return 3;
  return 4;
}

function classifyShape(page: DiaryPage): DiaryHeatCell['shape'] {
  const text = [page.entry?.title, page.entry?.summary, ...page.turns.map((turn) => turn.content)].join('\n').toLowerCase();
  const hasImport = /import|substack|medium|rss|archive|conversation shape/.test(text);
  const hasAnalysis = /heat analysis|compressed|future analysis|operator review/.test(text);
  const hasConversation = page.turns.some((turn) => turn.role === 'user') && page.turns.some((turn) => turn.role === 'assistant');
  if (Number(hasImport) + Number(hasAnalysis) + Number(hasConversation) > 1) return 'mixed';
  if (hasImport) return 'import';
  if (hasAnalysis) return 'analysis';
  if (hasConversation) return 'conversation';
  if (page.turns.length || page.entry) return 'note';
  return 'blank';
}

function sourceDiversity(turns: ChatTurn[]): number {
  const classes = new Set<string>();
  for (const turn of turns) {
    const text = turn.content.toLowerCase();
    if (/substack|medium|rss|archive|import/.test(text)) classes.add('import');
    if (/heat analysis|conversation shape|privacy-conscious/.test(text)) classes.add('analysis');
    if (turn.role === 'user') classes.add('user');
    if (turn.role === 'assistant') classes.add('assistant');
    if (turn.role === 'system') classes.add('system');
  }
  return classes.size;
}

function countQuestions(turns: ChatTurn[]): number {
  return turns.reduce((acc, turn) => acc + (turn.content.match(/\?/g)?.length ?? 0), 0);
}

function parseDay(day: string): Date {
  const date = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid day: ${day}`);
  return date;
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
