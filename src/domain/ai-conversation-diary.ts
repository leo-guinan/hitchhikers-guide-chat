import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { ChatTurn, DiaryEntry, DiaryPage } from './schema';
import { installDiaryPages, type DiaryInstallResult } from './substack-diary';

export type ConversationProvider = 'openai' | 'anthropic';
export type ConversationImportMode = 'privacy' | 'full';

export type NormalizedConversationTurn = {
  role: 'user' | 'assistant';
  text: string;
  createdAt?: string;
};

export type NormalizedConversation = {
  provider: ConversationProvider;
  id: string;
  title?: string;
  createdAt: string;
  day: string;
  turns: NormalizedConversationTurn[];
};

export type ConversationDayAnalysis = {
  day: string;
  conversationCount: number;
  turnCount: number;
  userTurnCount: number;
  assistantTurnCount: number;
  totalChars: number;
  userChars: number;
  assistantChars: number;
  questionCount: number;
  codeBlockCount: number;
  averageUserTurnChars: number;
  averageAssistantTurnChars: number;
  heat: 'cold' | 'warm' | 'hot' | 'flare';
  heatScore: number;
  balance: 'user-heavy' | 'assistant-heavy' | 'balanced';
  longestConversationTurns: number;
};

export type ConversationDiaryConversion = {
  provider: ConversationProvider;
  mode: ConversationImportMode;
  conversations: NormalizedConversation[];
  pages: DiaryPage[];
  report: {
    provider: ConversationProvider;
    mode: ConversationImportMode;
    sourceFile: string;
    conversationCount: number;
    diaryPageCount: number;
    dayCount: number;
    dateRange: { min: string | null; max: string | null };
    installedPageCount?: number;
    skippedTurnCount?: number;
    outputDir?: string;
    files: string[];
  };
};

export async function convertConversationArchiveToDiary(options: {
  provider: ConversationProvider;
  mode: ConversationImportMode;
  sourceFile: string;
  sessionId: string;
  outputDir?: string;
  installDataDir?: string;
  limit?: number;
}): Promise<ConversationDiaryConversion> {
  const raw = JSON.parse(await readFile(options.sourceFile, 'utf8')) as unknown;
  const conversations = normalizeConversationArchive(options.provider, raw).slice(0, options.limit ?? Number.MAX_SAFE_INTEGER);
  const pages = conversationsToDiaryPages(conversations, options.sessionId, options.mode);
  const files: string[] = [];

  if (options.outputDir) {
    await mkdir(options.outputDir, { recursive: true });
    await writeFile(path.join(options.outputDir, 'normalized_conversations.json'), JSON.stringify(conversations, null, 2));
    files.push(path.join(options.outputDir, 'normalized_conversations.json'));
    const diaryDir = path.join(options.outputDir, 'diary');
    await mkdir(diaryDir, { recursive: true });
    for (const page of pages) {
      const file = path.join(diaryDir, `${page.day}__${options.provider}_${stableHash(page.entry?.id ?? page.createdAt).slice(0, 10)}.json`);
      await writeFile(file, JSON.stringify(page, null, 2));
      files.push(file);
    }
  }

  const install: DiaryInstallResult | undefined = options.installDataDir ? await installDiaryPages(pages, options.installDataDir) : undefined;
  const days = Array.from(new Set(conversations.map((conversation) => conversation.day))).sort();
  const report = {
    provider: options.provider,
    mode: options.mode,
    sourceFile: options.sourceFile,
    conversationCount: conversations.length,
    diaryPageCount: pages.length,
    dayCount: days.length,
    dateRange: { min: days[0] ?? null, max: days[days.length - 1] ?? null },
    installedPageCount: install?.installedPageCount,
    skippedTurnCount: install?.skippedTurnCount,
    outputDir: options.outputDir,
    files: [...files, ...(install?.files ?? [])],
  };
  if (options.outputDir) {
    await writeFile(path.join(options.outputDir, 'import_report.json'), JSON.stringify(report, null, 2));
    report.files.push(path.join(options.outputDir, 'import_report.json'));
  }
  return { provider: options.provider, mode: options.mode, conversations, pages, report };
}

export function normalizeConversationArchive(provider: ConversationProvider, raw: unknown): NormalizedConversation[] {
  if (!Array.isArray(raw)) throw new Error(`${provider} archive must be a JSON array`);
  const seen = new Set<string>();
  const normalized = raw.map((item) => provider === 'openai' ? normalizeOpenAIConversation(item) : normalizeAnthropicConversation(item))
    .filter((conversation): conversation is NormalizedConversation => conversation !== null)
    .filter((conversation) => conversation.turns.length > 0);
  const out: NormalizedConversation[] = [];
  for (const conversation of normalized) {
    const key = `${conversation.provider}:${conversation.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(conversation);
  }
  return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function normalizeOpenAIConversation(raw: unknown): NormalizedConversation | null {
  const conversation = asRecord(raw);
  const mapping = asRecord(conversation.mapping);
  const id = asString(conversation.conversation_id) ?? asString(conversation.id) ?? stableHash(JSON.stringify(conversation).slice(0, 10_000));
  const createdAt = isoFromEpoch(conversation.create_time) ?? firstMessageTime(mapping) ?? new Date(0).toISOString();
  const turns = Object.values(mapping).map((node) => {
    const message = asRecord(asRecord(node).message);
    const role = asString(asRecord(message.author).role);
    if (role !== 'user' && role !== 'assistant') return null;
    const text = extractOpenAIContentText(message.content).trim();
    if (!text) return null;
    return { role, text, createdAt: isoFromEpoch(message.create_time) } satisfies NormalizedConversationTurn;
  }).filter((turn): turn is NonNullable<typeof turn> => turn !== null).sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
  return { provider: 'openai', id, title: asString(conversation.title), createdAt, day: dayFrom(createdAt), turns };
}

export function normalizeAnthropicConversation(raw: unknown): NormalizedConversation | null {
  const conversation = asRecord(raw);
  const id = asString(conversation.uuid) ?? asString(conversation.id) ?? stableHash(JSON.stringify(conversation).slice(0, 10_000));
  const createdAt = dateTimeFrom(asString(conversation.created_at) ?? asString(conversation.updated_at) ?? new Date(0).toISOString());
  const messages = Array.isArray(conversation.chat_messages) ? conversation.chat_messages : [];
  const turns = messages.map((item) => {
    const message = asRecord(item);
    const sender = asString(message.sender);
    const role = sender === 'human' ? 'user' : sender === 'assistant' ? 'assistant' : null;
    if (!role) return null;
    const text = (asString(message.text) ?? extractAnthropicContentText(message.content)).trim();
    if (!text) return null;
    return { role, text, createdAt: dateTimeFrom(asString(message.created_at) ?? asString(message.updated_at) ?? createdAt) } satisfies NormalizedConversationTurn;
  }).filter((turn): turn is NonNullable<typeof turn> => turn !== null);
  return { provider: 'anthropic', id, title: asString(conversation.name), createdAt, day: dayFrom(createdAt), turns };
}

export function conversationsToDiaryPages(conversations: NormalizedConversation[], sessionId: string, mode: ConversationImportMode): DiaryPage[] {
  return conversations.map((conversation) => conversationToDiaryPage(conversation, sessionId, mode));
}

function conversationToDiaryPage(conversation: NormalizedConversation, sessionId: string, mode: ConversationImportMode): DiaryPage {
  const analysis = analyzeConversationDay(conversation.day, [conversation]);
  const key = stableHash(`${conversation.provider}|${conversation.id}|${mode}`);
  const createdAt = conversation.createdAt;
  const sourceTurnIds = mode === 'full'
    ? conversation.turns.map((_, index) => `ai_${conversation.provider}_${key}_${index}`)
    : [`ai_${conversation.provider}_${key}_shape`, `ai_${conversation.provider}_${key}_analysis`];
  const turns: ChatTurn[] = mode === 'full'
    ? conversation.turns.map((turn, index) => ({ id: sourceTurnIds[index], role: turn.role, content: turn.text, createdAt: turn.createdAt ?? createdAt }))
    : [
      { id: sourceTurnIds[0], role: 'system', content: privacyShapeText(conversation, analysis), createdAt },
      { id: sourceTurnIds[1], role: 'assistant', content: analysisText(conversation.provider, mode, analysis), createdAt },
    ];
  const entry: DiaryEntry = {
    id: `entry_${conversation.day}_${conversation.provider}_${mode}_${key.slice(0, 10)}`,
    day: conversation.day,
    createdAt,
    updatedAt: createdAt,
    title: `${conversation.provider} ${mode} conversation import: ${conversation.day}`,
    summary: mode === 'full'
      ? `${analysisText(conversation.provider, mode, analysis)}\n\nFull turns imported for this conversation.`
      : `${analysisText(conversation.provider, mode, analysis)}\n\nPrivacy mode imported shape only: no title, no raw text, no keywords. Marvin checked the box. It was lonely in there.`,
    keyQuestions: mode === 'full' ? extractQuestions(conversation.turns.filter((turn) => turn.role === 'user').map((turn) => turn.text).join('\n')).slice(0, 10) : [],
    openLoops: [],
    humanContextNeeded: [],
    turnCount: turns.length,
    sourceTurnIds,
  };
  return { day: conversation.day, sessionId, createdAt, updatedAt: createdAt, turns, entry };
}

export function analyzeConversationDay(day: string, conversations: NormalizedConversation[]): ConversationDayAnalysis {
  const allTurns = conversations.flatMap((conversation) => conversation.turns);
  const userTurns = allTurns.filter((turn) => turn.role === 'user');
  const assistantTurns = allTurns.filter((turn) => turn.role === 'assistant');
  const userChars = sum(userTurns.map((turn) => turn.text.length));
  const assistantChars = sum(assistantTurns.map((turn) => turn.text.length));
  const totalChars = userChars + assistantChars;
  const questionCount = countMatches(allTurns.map((turn) => turn.text).join('\n'), /\?/g);
  const codeBlockCount = countMatches(allTurns.map((turn) => turn.text).join('\n'), /```/g) / 2;
  const averageUserTurnChars = userTurns.length ? Math.round(userChars / userTurns.length) : 0;
  const averageAssistantTurnChars = assistantTurns.length ? Math.round(assistantChars / assistantTurns.length) : 0;
  const heatScore = Math.round((allTurns.length * 2) + (totalChars / 1_000) + (questionCount * 3) + (codeBlockCount * 4));
  const heat = heatScore >= 90 ? 'flare' : heatScore >= 45 ? 'hot' : heatScore >= 15 ? 'warm' : 'cold';
  const ratio = userChars / Math.max(assistantChars, 1);
  const balance = ratio > 1.35 ? 'user-heavy' : ratio < 0.7 ? 'assistant-heavy' : 'balanced';
  return {
    day,
    conversationCount: conversations.length,
    turnCount: allTurns.length,
    userTurnCount: userTurns.length,
    assistantTurnCount: assistantTurns.length,
    totalChars,
    userChars,
    assistantChars,
    questionCount,
    codeBlockCount,
    averageUserTurnChars,
    averageAssistantTurnChars,
    heat,
    heatScore,
    balance,
    longestConversationTurns: Math.max(0, ...conversations.map((conversation) => conversation.turns.length)),
  };
}

function privacyShapeText(conversation: NormalizedConversation, analysis: ConversationDayAnalysis): string {
  const roleSequence = conversation.turns.map((turn) => turn.role === 'user' ? 'U' : 'A').join('');
  const buckets = conversation.turns.map((turn) => `${turn.role[0]}:${charBucket(turn.text.length)}${turn.text.includes('?') ? '?' : ''}${turn.text.includes('```') ? '{}' : ''}`).join(' ');
  return [
    `Privacy-conscious ${conversation.provider} conversation shape import.`,
    `Conversation id hash: ${stableHash(conversation.id).slice(0, 12)}.`,
    `Day: ${conversation.day}.`,
    `Role sequence: ${roleSequence}.`,
    `Turn buckets: ${buckets}.`,
    `No title, raw message text, quoted snippets, names, URLs, or keywords were imported.`,
    analysisText(conversation.provider, 'privacy', analysis),
  ].join('\n');
}

function analysisText(provider: ConversationProvider, mode: ConversationImportMode, analysis: ConversationDayAnalysis): string {
  return [
    `Conversation heat analysis (${provider}, ${mode}).`,
    `Day ${analysis.day}: ${analysis.conversationCount} conversation(s), ${analysis.turnCount} turns (${analysis.userTurnCount} user / ${analysis.assistantTurnCount} assistant).`,
    `Heat: ${analysis.heat} (${analysis.heatScore}). Balance: ${analysis.balance}.`,
    `Chars: ${analysis.totalChars} total (${analysis.userChars} user / ${analysis.assistantChars} assistant).`,
    `Questions: ${analysis.questionCount}. Code-block pairs: ${analysis.codeBlockCount}.`,
    `Average turn size: ${analysis.averageUserTurnChars} user chars / ${analysis.averageAssistantTurnChars} assistant chars.`,
  ].join('\n');
}

function extractOpenAIContentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(extractContentPartText).filter(Boolean).join('\n');
  const obj = asRecord(content);
  if (Array.isArray(obj.parts)) return obj.parts.map(extractContentPartText).filter(Boolean).join('\n');
  return asString(obj.text) ?? '';
}

function extractAnthropicContentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => {
    const obj = asRecord(part);
    return asString(obj.type) === 'text' ? asString(obj.text) ?? '' : '';
  }).filter(Boolean).join('\n');
}

function extractContentPartText(part: unknown): string {
  if (typeof part === 'string') return part;
  const obj = asRecord(part);
  if (asString(obj.content_type) === 'text') return asString(obj.text) ?? '';
  if (asString(obj.type) === 'text') return asString(obj.text) ?? '';
  return '';
}

function firstMessageTime(mapping: Record<string, unknown>): string | undefined {
  const times = Object.values(mapping).map((node) => isoFromEpoch(asRecord(asRecord(node).message).create_time)).filter((value): value is string => Boolean(value)).sort();
  return times[0];
}

function extractQuestions(text: string): string[] {
  return text.split(/(?<=[?])\s+/).map((part) => part.trim()).filter((part) => part.endsWith('?')).slice(0, 20);
}

function dayFrom(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '1970-01-01';
  return date.toISOString().slice(0, 10);
}

function dateTimeFrom(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

function isoFromEpoch(value: unknown): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return new Date(value * 1000).toISOString();
}

function charBucket(chars: number): string {
  if (chars < 80) return 'xs';
  if (chars < 400) return 's';
  if (chars < 1_500) return 'm';
  if (chars < 5_000) return 'l';
  return 'xl';
}

function countMatches(text: string, regex: RegExp): number {
  return text.match(regex)?.length ?? 0;
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function stableHash(value: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < value.length; i += 1) {
    h1 ^= value.charCodeAt(i);
    h1 = Math.imul(h1, 16777619);
    h2 ^= value.charCodeAt(value.length - i - 1);
    h2 = Math.imul(h2, 16777619);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}
