import type { WorkflowDefinition } from './types.js';
import contentGenerate from '../../definitions/content.generate.json' with { type: 'json' };

const BUILTIN_WORKFLOWS: Record<string, WorkflowDefinition> = {
  'content.generate': contentGenerate as WorkflowDefinition,
};

export function getBuiltinWorkflowDefinition(
  id: string
): WorkflowDefinition | undefined {
  return BUILTIN_WORKFLOWS[id];
}

export function listBuiltinWorkflowIds(): string[] {
  return Object.keys(BUILTIN_WORKFLOWS).sort();
}
