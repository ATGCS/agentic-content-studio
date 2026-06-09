import type { ChatMessage, ChatOutput, ModelGateway } from '../types.js';
import { streamOpenAIChatCompletions } from '../stream-openai.js';

const AGNES_BASE_URL =
  process.env.AGNES_BASE_URL ?? 'https://apihub.agnes-ai.com/v1';

export class AgnesGateway implements ModelGateway {
  async chat(input: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
  }): Promise<ChatOutput> {
    const key = process.env.AGNES_API_KEY;
    if (!key) throw new Error('AGNES_API_KEY not set');

    const res = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      const modelHint =
        input.model && !input.model.startsWith('agnes')
          ? `（当前模型 ${input.model}，请检查 AGNES_MODEL 配置）`
          : '';
      throw new Error(
        `Agnes API error: ${res.status}${modelHint}${detail ? ` - ${detail.slice(0, 200)}` : ''}`
      );
    }

    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: json.choices[0]?.message?.content ?? '',
      usage: json.usage
        ? {
            inputTokens: json.usage.prompt_tokens,
            outputTokens: json.usage.completion_tokens,
          }
        : undefined,
    };
  }

  async *chatStream(input: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
  }): AsyncGenerator<string> {
    const key = process.env.AGNES_API_KEY;
    if (!key) throw new Error('AGNES_API_KEY not set');
    yield* streamOpenAIChatCompletions(
      `${AGNES_BASE_URL}/chat/completions`,
      key,
      {
        model: input.model,
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
      }
    );
  }
}
