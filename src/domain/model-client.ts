import type { ChatMessage } from './schema';

type OpenAiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ModelResult = {
  text: string;
  model: string;
};

const defaultBaseUrl = 'https://api.openai.com/v1';
const defaultModel = 'gpt-5-mini';

export function modelConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function generateModelAnswer(instructions: string, message: string, history: ChatMessage[]): Promise<ModelResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = (process.env.OPENAI_BASE_URL ?? defaultBaseUrl).replace(/\/$/, '');
  const model = process.env.OPENAI_MODEL ?? defaultModel;
  const messages: OpenAiMessage[] = [
    { role: 'system', content: instructions },
    ...history.filter((turn) => turn.role !== 'system').slice(-12).map((turn): OpenAiMessage => ({ role: turn.role, content: turn.content })),
    { role: 'user', content: message },
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`model request failed ${response.status}: ${text.slice(0, 500)}`);
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('model returned no text');
  return { text, model };
}
