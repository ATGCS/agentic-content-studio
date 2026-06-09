import type { WorkflowDefinition } from './types.js';
import {
  getBuiltinWorkflowDefinition,
  listBuiltinWorkflowIds,
} from './builtin-definitions.js';

export function loadWorkflowDefinition(id: string): WorkflowDefinition {
  const definition = getBuiltinWorkflowDefinition(id);
  if (!definition) {
    throw new Error(`workflow definition not found: ${id}`);
  }
  if (definition.id !== id) {
    throw new Error(
      `workflow definition id mismatch: file ${id}, json ${definition.id}`
    );
  }
  return definition;
}

export function listWorkflowDefinitionIds(): string[] {
  return listBuiltinWorkflowIds();
}
