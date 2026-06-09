import type { Platform } from '@acs/db';
import { executeWorkflow } from './engine/executor.js';
import { loadWorkflowDefinition } from './engine/load-definition.js';
import { nodeRegistry } from './engine/registry.js';
import type { WorkflowRunResult } from './engine/types.js';
import { ensureStudioAgents } from './ensure-studio-agents.js';
import { registerBuiltinNodes } from './nodes/index.js';

let nodesReady = false;

function ensureBuiltinNodes() {
  if (!nodesReady) {
    registerBuiltinNodes(nodeRegistry);
    nodesReady = true;
  }
}

function ensureRuntime() {
  ensureStudioAgents();
  ensureBuiltinNodes();
}

export async function runWorkflow(
  workflowId: string,
  initial: {
    contentId: string;
    accountId?: string;
    platforms?: Platform[];
    vars?: Record<string, unknown>;
  }
): Promise<WorkflowRunResult> {
  ensureRuntime();
  const definition = loadWorkflowDefinition(workflowId);
  const result = await executeWorkflow(
    definition,
    {
      contentId: initial.contentId,
      accountId: initial.accountId,
      platforms: initial.platforms ?? ['XIAOHONGSHU'],
    },
    nodeRegistry
  );

  if (initial.vars) {
    result.context.vars = { ...result.context.vars, ...initial.vars };
  }

  return result;
}
