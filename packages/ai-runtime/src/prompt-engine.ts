import { prisma, type AgentType } from '@acs/db';

export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => variables[key] ?? ''
  );
}

export async function loadPromptForAgent(agentId: string) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { prompt: true },
  });
  if (!agent?.prompt) throw new Error('agent or prompt not found');
  return { agent, prompt: agent.prompt };
}

export async function loadPromptByType(type: AgentType) {
  const agent = await prisma.agent.findFirst({
    where: { type, enabled: true },
    include: { prompt: true },
  });
  if (!agent?.prompt) throw new Error(`no enabled agent for type ${type}`);
  return { agent, prompt: agent.prompt };
}
