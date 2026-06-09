import type { ChatMessage, ChatOutput, ModelGateway } from '../types.js';
import { streamOpenAIChatCompletions } from '../stream-openai.js';

export class DeepSeekGateway implements ModelGateway {
  async chat(input: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
  }): Promise<ChatOutput> {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error('DEEPSEEK_API_KEY not set');

    const res = await fetch('https://api.deepseek.com/chat/completions', {
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
      throw new Error(`DeepSeek API error: ${res.status}`);
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
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) throw new Error('DEEPSEEK_API_KEY not set');
    yield* streamOpenAIChatCompletions(
      'https://api.deepseek.com/chat/completions',
      key,
      {
        model: input.model,
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
      }
    );
  }
}
