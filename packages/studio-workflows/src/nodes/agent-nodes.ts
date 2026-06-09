import { runAgentByType } from '@acs/ai-runtime';
import type { AgentType } from '@acs/db';
import { ensureStudioAgents } from '../ensure-studio-agents.js';
import type { WorkflowNodeHandler } from '../engine/types.js';

export const agentRunNode: WorkflowNodeHandler = async (ctx, input) => {
  ensureStudioAgents();
  const agentType = String(input.agentType ?? '') as AgentType;
  if (!agentType) throw new Error('agent.run requires agentType');

  const run = await runAgentByType(agentType, {
    contentId: ctx.contentId,
    versionId: ctx.versionId,
    accountId: ctx.accountId,
    overrides: ctx.platform ? { platform: ctx.platform } : undefined,
  });

  return {
    output: {
      agentType,
      agentRunId: run?.id,
      agentStatus: run?.status,
    },
  };
};
