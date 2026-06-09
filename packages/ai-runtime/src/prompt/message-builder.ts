import type { ChatMessage } from '../model/types.js';
import type { AgentType } from '@acs/db';
import { getAgentSystemPrompt } from './agent-system-prompts.js';

type AgentConfig = {
  systemPrompt?: string;
};

export function buildMessages(input: {
  userPrompt: string;
  agentType?: AgentType;
  agentConfig?: unknown;
}): ChatMessage[] {
  const config = isAgentConfig(input.agentConfig) ? input.agentConfig : {};
  const systemContent =
    config.systemPrompt?.trim() ||
    (input.agentType ? getAgentSystemPrompt(input.agentType) : undefined) ||
    'You are a helpful content operations assistant. Respond in JSON only.';

  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: input.userPrompt },
  ];
}

function isAgentConfig(value: unknown): value is AgentConfig {
  return typeof value === 'object' && value !== null;
}
