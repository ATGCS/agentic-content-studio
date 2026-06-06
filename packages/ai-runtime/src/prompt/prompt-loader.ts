import { prisma, type AgentType } from '@acs/db';
import type { LoadedAgentPrompt } from '../runtime/types.js';

export async function loadPromptForAgent(agentId: string): Promise<LoadedAgentPrompt> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { prompt: true },
  });
  if (!agent?.prompt) throw new Error('agent or prompt not found');
  if (!agent.enabled) throw new Error('agent is disabled');
  if (!agent.prompt.enabled) throw new Error('prompt is disabled');
  return { agent, prompt: agent.prompt };
}

export async function loadPromptByType(type: AgentType): Promise<LoadedAgentPrompt> {
  const agent = await prisma.agent.findFirst({
    where: { type, enabled: true, prompt: { enabled: true } },
    include: { prompt: true },
  });
  if (!agent?.prompt) throw new Error(`no enabled agent for type ${type}`);
  return { agent, prompt: agent.prompt };
}
