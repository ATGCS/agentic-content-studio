import type { ChatMessage } from '../model/types.js';

const defaultSystemPrompt = 'You are a helpful content operations assistant. Respond in JSON only.';

type AgentConfig = {
  systemPrompt?: string;
};

export function buildMessages(input: {
  userPrompt: string;
  agentConfig?: unknown;
}): ChatMessage[] {
  const config = isAgentConfig(input.agentConfig) ? input.agentConfig : {};
  return [
    { role: 'system', content: config.systemPrompt ?? defaultSystemPrompt },
    { role: 'user', content: input.userPrompt },
  ];
}

function isAgentConfig(value: unknown): value is AgentConfig {
  return typeof value === 'object' && value !== null;
}
