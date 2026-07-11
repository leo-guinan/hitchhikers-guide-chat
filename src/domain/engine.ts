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

export async function answerChat(sessionId: string, message: string, history: ChatMessage[] = [], day = new Date().toISOString().slice(0, 10)): Promise<ChatAnswer> {
  const normalized = message.toLowerCase();
  const needsHumanContext = contextBoundaryTerms.some((term) => normalized.includes(term));
  const contextPrompt = buildContextPrompt(message);

  try {
    const model = await generateModelAnswer(modelInstructions(contextPrompt, day), message, history);
    if (model) {
      return {
        answer: model.text,
        needsHumanContext,
        contextPrompt,
        diary: { day, turnCount: history.length + 2 },
        receipt: {
          sessionId,
          messageChars: message.length,
          answerChars: model.text.length,
          mode: 'model',
          model: model.model,
        },
      };
    }
  } catch (error) {
    // Fall through to deterministic local answer. A broken model provider should not break the product loop.
    console.error(error);
  }

  const priorTurns = history.filter((turn) => turn.role !== 'system').slice(-4);
  const continuity = priorTurns.length ? ` I am carrying ${priorTurns.length} turns from today's diary page as working context.` : '';

  const answer = needsHumanContext
    ? [
        'Short answer: I can help, but this crosses the context boundary.',
        buildDirectFrame(message),
        'The next useful move is not another confident paragraph. It is a human lookup with a receipt.',
        `Ask for: ${contextPrompt}`,
        continuity.trim(),
      ].filter(Boolean).join(' ')
    : [
        buildDirectFrame(message),
        'This answer belongs to today’s diary page. At day-end it can compress into a searchable entry; if it needs slower judgment, send the page to the future for delayed human review.',
        continuity.trim(),
      ].filter(Boolean).join(' ');

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
  if (trimmed.endsWith('?')) {
    return `For "${trimmed}": start by separating what can be reasoned from what must be observed.`;
  }
  return `I read the task as: ${trimmed}. First pass: make the next action small, observable, and easy to correct.`;
}

export function buildContextPrompt(message: string): string {
  const lowered = message.toLowerCase();
  if (lowered.includes('near me') || lowered.includes('local')) return 'location, constraints, and 3-5 real nearby options with links or phone numbers';
  if (lowered.includes('email') || lowered.includes('calendar') || lowered.includes('account')) return 'the relevant private record, copied or summarized with sensitive fields redacted';
  if (lowered.includes('client') || lowered.includes('customer') || lowered.includes('contact')) return 'who the person is, the last interaction, what they asked for, and any promises already made';
  if (lowered.includes('latest') || lowered.includes('today') || lowered.includes('current') || lowered.includes('recent')) return 'current source links, timestamps, and what changed since the older baseline';
  return 'the concrete facts a human can observe that are not already in this chat';
}

function extractSentences(text: string, needles: string[]): string[] {
  const parts = text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
  return parts.filter((part) => needles.some((needle) => part.toLowerCase().includes(needle.toLowerCase())));
}

function uniqueLines(lines: string[]): string[] {
  return [...new Set(lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean))];
}
