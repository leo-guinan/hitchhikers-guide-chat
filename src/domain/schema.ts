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

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type EmailAuthRequest = z.infer<typeof EmailAuthRequestSchema>;
export type EmailAuthVerify = z.infer<typeof EmailAuthVerifySchema>;
export type ContextRequestInput = z.infer<typeof ContextRequestSchema>;
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
export type FutureAnalysisRequestInput = z.infer<typeof FutureAnalysisRequestSchema>;

export type Account = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  paid: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
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
