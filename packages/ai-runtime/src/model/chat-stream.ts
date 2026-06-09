import { getModelGateway } from './factory.js';
import type { ChatMessage } from './types.js';

export async function streamChat(input: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  onDelta?: (chunk: string) => void;
}): Promise<string> {
  const gateway = getModelGateway();
  if (gateway.chatStream) {
    let full = '';
    for await (const chunk of gateway.chatStream({
      model: input.model,
      messages: input.messages,
      temperature: input.temperature,
    })) {
      full += chunk;
      input.onDelta?.(chunk);
    }
    return full;
  }

  const { content } = await gateway.chat({
    model: input.model,
    messages: input.messages,
    temperature: input.temperature,
  });
  if (content) input.onDelta?.(content);
  return content;
}
