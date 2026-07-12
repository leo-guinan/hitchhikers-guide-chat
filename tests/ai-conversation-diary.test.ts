import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { convertConversationArchiveToDiary, normalizeConversationArchive } from '../src/domain/ai-conversation-diary';

describe('ai conversation diary adapters', () => {
  it('normalizes OpenAI mapping exports including bare string parts', () => {
    const conversations = normalizeConversationArchive('openai', [openAIConversation()]);

    expect(conversations).toHaveLength(1);
    expect(conversations[0].provider).toBe('openai');
    expect(conversations[0].day).toBe('2026-01-02');
    expect(conversations[0].turns.map((turn) => turn.role)).toEqual(['user', 'assistant']);
    expect(conversations[0].turns[0].text).toContain('private product idea');
    expect(conversations[0].turns[1].text).toContain('Use a receipt');
  });

  it('normalizes Anthropic chat_messages exports', () => {
    const conversations = normalizeConversationArchive('anthropic', [anthropicConversation()]);

    expect(conversations).toHaveLength(1);
    expect(conversations[0].provider).toBe('anthropic');
    expect(conversations[0].turns.map((turn) => turn.role)).toEqual(['user', 'assistant']);
    expect(conversations[0].turns[0].text).toContain('Should I import this');
  });

  it('privacy mode writes shape and heat analysis without raw conversation details', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'ai-conv-privacy-'));
    const sourceFile = path.join(dir, 'openai.json');
    await writeFile(sourceFile, JSON.stringify([openAIConversation()], null, 2));

    const result = await convertConversationArchiveToDiary({ provider: 'openai', mode: 'privacy', sourceFile, sessionId: 'acct_test', outputDir: path.join(dir, 'out'), installDataDir: dir });

    expect(result.report.conversationCount).toBe(1);
    expect(result.report.installedPageCount).toBe(1);
    const text = JSON.stringify(result.pages[0]);
    expect(text).toContain('Privacy-conscious openai conversation shape import');
    expect(text).toContain('Heat:');
    expect(text).not.toContain('private product idea');
    expect(text).not.toContain('Use a receipt');
    const shapeSidecar = await readFile(path.join(dir, 'out', 'conversation_shapes.json'), 'utf8');
    expect(shapeSidecar).toContain('turnBuckets');
    expect(shapeSidecar).not.toContain('private product idea');
    expect(shapeSidecar).not.toContain('Use a receipt');
    const installed = JSON.parse(await readFile(path.join(dir, 'diary', '2026-01-02.json'), 'utf8')) as { turns: unknown[] };
    expect(installed.turns).toHaveLength(2);
  });

  it('full mode writes raw turns plus compression analysis', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'ai-conv-full-'));
    const sourceFile = path.join(dir, 'anthropic.json');
    await writeFile(sourceFile, JSON.stringify([anthropicConversation()], null, 2));

    const result = await convertConversationArchiveToDiary({ provider: 'anthropic', mode: 'full', sourceFile, sessionId: 'acct_test', outputDir: path.join(dir, 'out') });

    expect(result.pages[0].turns).toHaveLength(2);
    expect(result.pages[0].turns[0].content).toContain('Should I import this');
    expect(result.pages[0].entry?.summary).toContain('Conversation heat analysis');
    expect(result.pages[0].entry?.summary).toContain('Full turns imported');
  });
});

function openAIConversation() {
  return {
    conversation_id: 'openai-1',
    title: 'Sensitive private title should not enter privacy diary',
    create_time: Date.parse('2026-01-02T03:04:05.000Z') / 1000,
    mapping: {
      a: {
        message: {
          author: { role: 'user' },
          create_time: Date.parse('2026-01-02T03:04:06.000Z') / 1000,
          content: { content_type: 'multimodal_text', parts: ['Here is a private product idea. Should I ship it?'] },
        },
      },
      b: {
        message: {
          author: { role: 'assistant' },
          create_time: Date.parse('2026-01-02T03:04:07.000Z') / 1000,
          content: { content_type: 'text', parts: [{ content_type: 'text', text: 'Use a receipt before belief.```ts\nconst x = 1\n```' }] },
        },
      },
      c: {
        message: {
          author: { role: 'tool' },
          create_time: Date.parse('2026-01-02T03:04:08.000Z') / 1000,
          content: { text: 'tool output' },
        },
      },
    },
  };
}

function anthropicConversation() {
  return {
    uuid: 'anthropic-1',
    name: 'Claude private title',
    created_at: '2026-02-03T01:02:03.000Z',
    chat_messages: [
      { sender: 'human', text: 'Should I import this archive into the diary?' },
      { sender: 'assistant', content: [{ type: 'text', text: 'Yes, but keep a privacy mode and a full mode.' }] },
    ],
  };
}
