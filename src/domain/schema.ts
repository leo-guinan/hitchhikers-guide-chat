import { z } from 'zod';

export const RoleSchema = z.enum(['user', 'assistant', 'system']);

export const ChatMessageSchema = z.object({
  role: RoleSchema,
  content: z.string().min(1),
});

export const ChatRequestSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  history: z.array(ChatMessageSchema).default([]),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const EmailAuthRequestSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
});

export const EmailAuthVerifySchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  code: z.string().regex(/^\d{6}$/),
});

export const KipperSignupSchema = z.object({
  handle: z.string().min(1).max(40).transform((value) => value.trim().replace(/^@+/, '').toLowerCase()),
  quaiAddress: z.string().min(8).max(120).optional(),
});

export const ContextRequestSchema = z.object({
  sessionId: z.string().min(1),
  userMessage: z.string().min(1),
  missingContext: z.string().min(1),
  urgency: z.enum(['normal', 'soon', 'blocked']).default('normal'),
  contact: z.string().optional(),
  source: z.enum(['manual', 'chat-boundary', 'future-analysis']).default('manual'),
  diaryDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const CheckoutRequestSchema = z.object({
  sessionId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  email: z.string().email().optional(),
});

export const DiaryCompressionRequestSchema = z.object({
  sessionId: z.string().min(1),
});

export const DiarySearchSchema = z.object({
  query: z.string().optional(),
});

export const FutureAnalysisRequestSchema = z.object({
  sessionId: z.string().min(1),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  delay: z.enum(['24h', '72h', '1w']).default('24h'),
  question: z.string().optional(),
  contact: z.string().optional(),
});

export const ImportSourceKindSchema = z.enum(['rss', 'substack', 'ghost', 'generic_url', 'youtube_feed', 'x_archive_json', 'diary_backfill']);

export const ImportSourceCreateSchema = z.object({
  kind: ImportSourceKindSchema,
  label: z.string().min(1).max(120),
  url: z.string().url().optional(),
  handle: z.string().min(1).max(120).optional(),
  items: z.array(z.object({
    externalId: z.string().optional(),
    url: z.string().url().optional(),
    title: z.string().optional(),
    text: z.string().min(1),
    createdAt: z.string().optional(),
  })).optional(),
});

export const ImportRunRequestSchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
});

export const ImportedItemSearchSchema = z.object({
  query: z.string().optional(),
  sourceId: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type EmailAuthRequest = z.infer<typeof EmailAuthRequestSchema>;
export type EmailAuthVerify = z.infer<typeof EmailAuthVerifySchema>;
export type KipperSignup = z.infer<typeof KipperSignupSchema>;
export type ContextRequestInput = z.infer<typeof ContextRequestSchema>;
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
export type FutureAnalysisRequestInput = z.infer<typeof FutureAnalysisRequestSchema>;
export type ImportSourceKind = z.infer<typeof ImportSourceKindSchema>;
export type ImportSourceCreateInput = z.infer<typeof ImportSourceCreateSchema>;
export type ImportRunRequest = z.infer<typeof ImportRunRequestSchema>;
export type ImportedItemSearch = z.infer<typeof ImportedItemSearchSchema>;

export type Account = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  paid: boolean;
  access?: 'none' | 'paid' | 'kipper_free';
  kipperHandle?: string;
  kipperUrl?: string;
  quaiAddress?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
};

export type KipperIdentityReceipt = {
  id: string;
  type: 'kipper_identity_receipt';
  accountId: string;
  xHandle: string;
  kipperUrl: string;
  xUrl: string;
  quaiAddress?: string;
  createdAt: string;
  access: 'kipper_free';
  verificationStatus: 'local_only_pending_kipper_twitter_verification';
  settlementStatus: 'not_settleable_until_server_verified';
};

export type AuthSession = {
  token: string;
  accountId: string;
  email: string;
  createdAt: string;
  expiresAt: string;
};

export type ChatTurn = ChatMessage & {
  id: string;
  createdAt: string;
};

export type DiaryEntry = {
  id: string;
  day: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  summary: string;
  keyQuestions: string[];
  openLoops: string[];
  humanContextNeeded: string[];
  turnCount: number;
  sourceTurnIds: string[];
};

export type DiaryPage = {
  day: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  turns: ChatTurn[];
  entry?: DiaryEntry;
};

export type FutureAnalysisRequest = FutureAnalysisRequestInput & {
  id: string;
  createdAt: string;
  status: 'queued' | 'in_review' | 'added';
  diaryEntryId?: string;
  contextRequestId: string;
};

export type ImportSource = {
  id: string;
  accountId: string;
  kind: ImportSourceKind;
  label: string;
  url?: string;
  handle?: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastRun?: ImportRunSummary;
  seedItems?: Array<{
    externalId?: string;
    url?: string;
    title?: string;
    text: string;
    createdAt?: string;
  }>;
};

export type ImportedItem = {
  id: string;
  accountId: string;
  sourceId: string;
  sourceKind: ImportSourceKind;
  sourceLabel: string;
  externalId?: string;
  url?: string;
  title: string;
  text: string;
  createdAt?: string;
  importedAt: string;
  day: string;
  wordCount: number;
};

export type ImportRunSummary = {
  imported: number;
  skipped: number;
  failed: number;
  message?: string;
};

export type ChatAnswer = {
  answer: string;
  needsHumanContext: boolean;
  contextPrompt: string;
  diary: {
    day: string;
    turnCount: number;
    entry?: DiaryEntry;
  };
  receipt: {
    sessionId: string;
    messageChars: number;
    answerChars: number;
    mode: 'model' | 'deterministic-fallback';
    model?: string;
  };
};


export type QueryReceipt = {
  id: string;
  type: 'guide_query_receipt';
  accountId: string;
  access: 'paid' | 'kipper_free';
  day: string;
  createdAt: string;
  messageChars: number;
  answerChars: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  modelMode: 'model' | 'deterministic-fallback';
  model?: string;
  openRouterTokenBridge: {
    status: 'measured_not_settled';
    note: string;
  };
};

export type ContextRequest = ContextRequestInput & {
  id: string;
  createdAt: string;
  status: 'open' | 'answered';
};

export type PricingPlan = {
  name: string;
  priceUsd: 42;
  interval: 'month';
  promise: string;
  includes: string[];
};
