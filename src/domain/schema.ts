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

export const KipperFeedbackSchema = z.object({
  tourStep: z.enum(['welcome', 'diary', 'atlas', 'receipts', 'openrouter_bridge', 'reward']).default('reward'),
  feedback: z.string().min(3).max(2000),
  rewardPreference: z.enum(['quai', 'extra_tokens', 'early_feature_access', 'surprise_me']).default('surprise_me'),
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

export const UserActionSchema = z.object({
  action: z.string().min(1).max(80).regex(/^[a-z0-9_:-]+$/),
  pathway: z.string().min(1).max(40).regex(/^[a-z0-9_:-]+$/),
  sessionId: z.string().min(1).max(160),
  path: z.string().min(1).max(240).optional(),
  detail: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.string().max(200)).optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type EmailAuthRequest = z.infer<typeof EmailAuthRequestSchema>;
export type EmailAuthVerify = z.infer<typeof EmailAuthVerifySchema>;
export type KipperSignup = z.infer<typeof KipperSignupSchema>;
export type KipperFeedbackInput = z.infer<typeof KipperFeedbackSchema>;
export type ContextRequestInput = z.infer<typeof ContextRequestSchema>;
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
export type FutureAnalysisRequestInput = z.infer<typeof FutureAnalysisRequestSchema>;
export type ImportSourceKind = z.infer<typeof ImportSourceKindSchema>;
export type ImportSourceCreateInput = z.infer<typeof ImportSourceCreateSchema>;
export type ImportRunRequest = z.infer<typeof ImportRunRequestSchema>;
export type ImportedItemSearch = z.infer<typeof ImportedItemSearchSchema>;
export type UserActionInput = z.infer<typeof UserActionSchema>;

export type Account = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  paid: boolean;
  access?: 'none' | 'paid' | 'kipper_free' | 'twitter';
  kipperHandle?: string;
  twitterHandle?: string;
  kipperUrl?: string;
  quaiAddress?: string;
  twitterVerified?: boolean;
  twitterVerifiedAt?: string;
  twitterUserId?: string;
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


export type TwitterOAuthState = {
  state: string;
  codeVerifier: string;
  claimedHandle?: string;
  quaiAddress?: string;
  createdAt: string;
  expiresAt: string;
};

export type TwitterVerifiedReceipt = {
  id: string;
  type: 'twitter_oauth_login_receipt';
  accountId: string;
  xHandle: string;
  twitterUserId: string;
  createdAt: string;
  verificationStatus: 'twitter_oauth_verified';
  settlementStatus: 'verified_not_settled';
};

export type KipperRewardIntentReceipt = {
  id: string;
  type: 'kipper_reward_intent_receipt';
  accountId: string;
  xHandle: string;
  createdAt: string;
  tourStep: 'welcome' | 'diary' | 'atlas' | 'receipts' | 'openrouter_bridge' | 'reward';
  feedback: string;
  rewardPreference: 'quai' | 'extra_tokens' | 'early_feature_access' | 'surprise_me';
  rewardScope: 'kipper_founder_feedback';
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
  access: 'paid' | 'kipper_free' | 'twitter';
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

export type UserActionEvent = UserActionInput & {
  id: string;
  createdAt: string;
  accountId?: string;
  email?: string;
  handle?: string;
  access?: Account['access'];
};

export type UserActionDashboard = {
  generatedAt: string;
  totals: {
    events: number;
    users: number;
    identifiedUsers: number;
  };
  funnel: Array<{ action: string; events: number; users: number }>;
  pathways: Array<{ pathway: string; events: number; users: number }>;
  recentUsers: Array<{ userKey: string; handle?: string; email?: string; access?: Account['access']; events: number; firstSeen: string; lastSeen: string; lastAction: string; lastPath?: string }>;
  recentEvents: UserActionEvent[];
};
