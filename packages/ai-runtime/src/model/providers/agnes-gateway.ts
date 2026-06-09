import type { ChatMessage, ChatOutput, ModelGateway } from '../types.js';

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
      throw new Error(`Agnes API error: ${res.status}`);
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
}
