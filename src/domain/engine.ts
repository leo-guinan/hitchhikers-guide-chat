import type { ChatAnswer, ChatMessage, DiaryEntry, DiaryPage, PricingPlan } from './schema';
import { generateModelAnswer } from './model-client';

export const guideInstructions = `You are the Hitchhiker's Guide to the Future: a concise AI collaborator for people who already use AI and need the missing context supplied by a human when the machine hits a boundary.

Opening:
The interface opens each day with "Hi, I'm Leo. I'm a Hitchhiker to the Future, and I'm here to help. What are you curious about?" Do not repeat that line. Answer what the user actually asks.

Rules:
- Lead with the useful answer.
- Be specific. Name the mechanism, missing fact, tradeoff, or next action.
- Do not pretend to look things up if you cannot.
- When the answer depends on local, private, current, or relationship-specific context, say exactly what a human should retrieve.
- Treat each day as its own diary page. The current day is the working context; older pages are searchable memory, not a live instruction stream.
- Ask at most one clarifying question.
- No hype. The product is the loop: AI answer, human context when needed, receipt of what changed.`;

const contextBoundaryTerms = [
  'current',
  'today',
  'latest',
  'recent',
  'near me',
  'my account',
  'my email',
  'my calendar',
  'private',
  'inside',
  'contact',
  'customer',
  'client',
  'friend',
  'which should i choose',
  'what did they mean',
];

export const pricingPlan: PricingPlan = {
  name: 'Guide + Human Context',
  priceUsd: 42,
  interval: 'month',
  promise: 'AI chat that can admit when the missing piece is human context, then route that lookup into the conversation.',
  includes: [
    'Primary AI chat interface',
    'Human context requests when a diary page needs local, private, current, or relationship-specific facts',
    'Daily diary pages: each day has its own chat context',
    'Compressed diary entries that can be expanded and searched after the day ends',
    'Send chat log to the future: delayed human review and context added back into the page',
    'One simple price. No tiers to admire while avoiding the work.',
  ],
};

export async function answerChat(sessionId: string, message: string, history: ChatMessage[] = [], day = new Date().toISOString().slice(0, 10), pastPages: DiaryPage[] = []): Promise<ChatAnswer> {
  const normalized = message.toLowerCase();
  const needsHumanContext = contextBoundaryTerms.some((term) => normalized.includes(term));
  const contextPrompt = buildContextPrompt(message);
  const diaryCompass = buildDiaryCompass(message, day, pastPages);

  try {
    const model = await generateModelAnswer(modelInstructions(contextPrompt, day), message, history);
    if (model) {
      const answer = appendDiaryCompass(model.text, diaryCompass);
      return {
        answer,
        needsHumanContext,
        contextPrompt,
        diary: { day, turnCount: history.length + 2 },
        receipt: {
          sessionId,
          messageChars: message.length,
          answerChars: answer.length,
          mode: 'model',
          model: model.model,
        },
      };
    }
  } catch (error) {
    // Fall through to deterministic local answer. A broken model provider should not break the product loop.
    console.error(error);
  }

  const coreAnswer = needsHumanContext
    ? [
        buildDirectFrame(message),
        `I can get partway there, but the useful version needs one human lookup: ${contextPrompt}.`,
      ].join(' ')
    : buildDirectFrame(message);

  const answer = appendDiaryCompass(coreAnswer, diaryCompass);

  return {
    answer,
    needsHumanContext,
    contextPrompt,
    diary: { day, turnCount: history.length + 2 },
    receipt: {
      sessionId,
      messageChars: message.length,
      answerChars: answer.length,
      mode: 'deterministic-fallback',
    },
  };
}

export function buildDiaryCompass(message: string, day: string, pastPages: DiaryPage[] = []): string {
  const past = choosePastPage(message, day, pastPages);
  const pastLine = past?.entry
    ? `Past: [${past.entry.title}](/diary/${past.day}) — ${cleanPastSummary(past.entry.summary)}`
    : 'Past: no older compressed page yet. Once you compress a day, I can pull a better thread back in.';
  return [
    'From the diary:',
    pastLine,
    `Now: ${presentReflection(message)}`,
    `Future: ${futureQuestion(message)}`,
  ].join('\n');
}

export function summarizeDiaryPage(page: DiaryPage): DiaryEntry {
  const createdAt = new Date().toISOString();
  const userTurns = page.turns.filter((turn) => turn.role === 'user');
  const assistantTurns = page.turns.filter((turn) => turn.role === 'assistant');
  const humanContextNeeded = uniqueLines(assistantTurns.flatMap((turn) => extractSentences(turn.content, ['human context', 'Ask for:', 'missing', 'look up']))).slice(0, 5);
  const keyQuestions = uniqueLines(userTurns.filter((turn) => turn.content.includes('?')).map((turn) => turn.content.trim())).slice(0, 5);
  const openLoops = uniqueLines([...userTurns, ...assistantTurns].flatMap((turn) => extractSentences(turn.content, ['next', 'should', 'need', 'blocked', 'decide']))).slice(0, 6);
  const firstUser = userTurns[0]?.content.trim() ?? 'Empty page';
  const title = firstUser.length > 72 ? `${firstUser.slice(0, 69)}...` : firstUser;
  const summary = [
    `${page.day}: ${userTurns.length} user turns and ${assistantTurns.length} assistant turns.`,
    keyQuestions.length ? `Questions: ${keyQuestions.join(' / ')}` : 'No explicit user question captured.',
    humanContextNeeded.length ? `Human context needed: ${humanContextNeeded.join(' / ')}` : 'No human-context request was surfaced in the chat.',
  ].join(' ');
  return {
    id: `entry_${page.day}_${createdAt.replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    day: page.day,
    createdAt,
    updatedAt: createdAt,
    title,
    summary,
    keyQuestions,
    openLoops,
    humanContextNeeded,
    turnCount: page.turns.length,
    sourceTurnIds: page.turns.map((turn) => turn.id),
  };
}

function modelInstructions(contextPrompt: string, day: string): string {
  return `${guideInstructions}\n\nCurrent diary day: ${day}. Use only the provided chat history as today's page context. If the user asks for current, private, local, or relationship-specific facts, do not invent them. Give the best answer possible from the chat, then name the human context needed. Suggested human lookup request: ${contextPrompt}`;
}

function buildDirectFrame(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, ' ');
  const lowered = trimmed.toLowerCase();
  if (lowered.includes('thermodynamic crypto')) {
    return 'I’d read “thermodynamic crypto” as crypto that tries to anchor trust in physical cost: energy, heat, hardware, scarcity, or irreversible work. Proof of work is the obvious ancestor. The question is whether the system measures a real thermodynamic constraint, or just borrows physics language to make an ordinary token sound inevitable.';
  }
  if (trimmed.endsWith('?')) {
    return `I’d start here: separate what we can reason through from what needs a real source, example, or measurement.`;
  }
  return `I read the task as: ${trimmed}. First move: make it small, observable, and easy to correct.`;
}

export function buildContextPrompt(message: string): string {
  const lowered = message.toLowerCase();
  if (lowered.includes('near me') || lowered.includes('local')) return 'location, constraints, and 3-5 real nearby options with links or phone numbers';
  if (lowered.includes('email') || lowered.includes('calendar') || lowered.includes('account')) return 'the relevant private record, copied or summarized with sensitive fields redacted';
  if (lowered.includes('client') || lowered.includes('customer') || lowered.includes('contact')) return 'who the person is, the last interaction, what they asked for, and any promises already made';
  if (lowered.includes('latest') || lowered.includes('today') || lowered.includes('current') || lowered.includes('recent')) return 'current source links, timestamps, and what changed since the older baseline';
  return 'the concrete facts a human can observe that are not already in this chat';
}

function appendDiaryCompass(answer: string, compass: string): string {
  return `${answer.trim()}\n\n${compass}`;
}

function choosePastPage(message: string, day: string, pages: DiaryPage[]): DiaryPage | undefined {
  const terms = meaningfulTerms(message);
  return pages
    .filter((page) => page.day < day && page.entry)
    .map((page) => ({ page, score: scorePastPage(page, terms) }))
    .sort((a, b) => b.score - a.score || b.page.day.localeCompare(a.page.day))[0]?.page;
}

function scorePastPage(page: DiaryPage, terms: string[]): number {
  const text = [page.entry?.title, page.entry?.summary, ...(page.entry?.keyQuestions ?? []), ...(page.entry?.openLoops ?? [])].join(' ').toLowerCase();
  return terms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
}

function cleanPastSummary(summary: string): string {
  const withoutBullets = summary.replace(/^[-•]\s*/, '').replace(/\s+/g, ' ').trim();
  const sentences = withoutBullets.match(/[^.!?]+[.!?]+/g)?.map((part) => part.trim()) ?? [withoutBullets];
  const seen = new Set<string>();
  const unique = sentences.filter((sentence) => {
    const key = sentence.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const cleaned = unique.join(' ')
    .replace(/^The Alignment Test:\s*\d{4}-\d{2}-\d{2}\s+Substack import:\s*/i, '')
    .replace(/The Alignment Test\s+(?=How do you know)/gi, '')
    .replace(/(How do you know if your AI system is aligned\?\s*){2,}/gi, 'How do you know if your AI system is aligned? ')
    .trim();
  return cleaned.length > 180 ? `${cleaned.slice(0, 177).trim()}...` : cleaned;
}

function presentReflection(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, ' ');
  if (trimmed.endsWith('?')) return 'This is a definition question, but the useful part is deciding what would count as evidence.';
  return 'You are trying to turn a loose idea into something you can inspect.';
}

function futureQuestion(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, ' ');
  const topic = trimmed.replace(/[?!.]+$/, '').slice(0, 96);
  return `What would make “${topic}” concrete enough that someone else could test it without you in the room?`;
}

function meaningfulTerms(text: string): string[] {
  const stop = new Set(['about', 'again', 'should', 'would', 'could', 'there', 'their', 'thing', 'explain', 'product', 'first', 'with', 'from', 'what', 'when', 'where', 'which', 'your', 'this', 'that']);
  return [...new Set(text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [])].filter((term) => !stop.has(term)).slice(0, 12);
}

function extractSentences(text: string, needles: string[]): string[] {
  const parts = text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  return parts.filter((part) => needles.some((needle) => part.toLowerCase().includes(needle.toLowerCase())));
}

function uniqueLines(lines: string[]): string[] {
  return [...new Set(lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean))];
}
