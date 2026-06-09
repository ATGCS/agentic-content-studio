export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOutput {
  content: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface ModelGateway {
  chat(input: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
  }): Promise<ChatOutput>;
  chatStream?(input: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
  }): AsyncGenerator<string>;
}
