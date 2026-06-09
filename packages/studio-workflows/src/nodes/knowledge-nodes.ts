import { searchLocalKnowledge } from '@acs/ima-provider';
import { resolveKbAgentTypes } from '@acs/studio-agents';
import type { AgentType } from '@acs/db';
import type { WorkflowNodeHandler } from '../engine/types.js';

export const knowledgeSearchNode: WorkflowNodeHandler = async (ctx, input) => {
  const query = String(input.query ?? ctx.vars.query ?? '');
  if (!query.trim()) throw new Error('knowledge.search requires query');

  const agentType = input.agentType as AgentType | undefined;
  const result = await searchLocalKnowledge({
    query,
    kbAgentTypes: agentType
      ? resolveKbAgentTypes(agentType)
      : (input.kbAgentTypes as string[] | undefined),
    limit: typeof input.limit === 'number' ? input.limit : 8,
  });

  return {
    output: {
      knowledgeSummary: result.summary,
      knowledgeMode: result.mode,
      knowledgeHitCount: result.items.length,
    },
  };
};
