import { evaluateCondition } from './conditions.js';
import { resolveInput } from './resolve-input.js';
import type { NodeRegistry } from './registry.js';
import type {
  StepRunRecord,
  WorkflowContext,
  WorkflowDefinition,
  WorkflowRunResult,
  WorkflowStep,
} from './types.js';

function stepId(step: WorkflowStep, index: number, prefix = ''): string {
  return step.id ?? `${prefix}step-${index}`;
}

function getForeachItems(ctx: WorkflowContext, key: string): unknown[] {
  if (key === 'platforms') return ctx.platforms;
  const fromVars = ctx.vars[key];
  return Array.isArray(fromVars) ? fromVars : [];
}

function applyPatch(
  ctx: WorkflowContext,
  patch?: Partial<WorkflowContext>
): void {
  if (!patch) return;
  if (patch.platform !== undefined) ctx.platform = patch.platform;
  if (patch.versionId !== undefined) ctx.versionId = patch.versionId;
  if (patch.accountId !== undefined) ctx.accountId = patch.accountId;
  if (patch.versions) ctx.versions = patch.versions;
  if (patch.vars) ctx.vars = { ...ctx.vars, ...patch.vars };
}

async function runSteps(
  steps: WorkflowStep[],
  ctx: WorkflowContext,
  registry: NodeRegistry,
  records: StepRunRecord[],
  prefix = ''
): Promise<void> {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const id = stepId(step, i, prefix);

    if (!evaluateCondition(step.when, ctx)) {
      records.push({
        stepId: id,
        node: step.node ?? 'group',
        status: 'skipped',
      });
      continue;
    }

    if (step.foreach && step.steps?.length) {
      const items = getForeachItems(ctx, step.foreach);
      const as = step.as ?? 'item';
      for (let j = 0; j < items.length; j++) {
        const item = items[j];
        const loopPrefix = `${id}:${j}:`;
        const prevPlatform = ctx.platform;
        const prevVersionId = ctx.versionId;
        ctx.vars[as] = item;
        if (step.foreach === 'platforms') {
          ctx.platform = item as WorkflowContext['platform'];
        }
        await runSteps(step.steps, ctx, registry, records, loopPrefix);
        ctx.platform = prevPlatform;
        ctx.versionId = prevVersionId;
      }
      continue;
    }

    if (!step.node) {
      if (step.steps?.length) {
        await runSteps(step.steps, ctx, registry, records, `${id}:`);
      }
      continue;
    }

    const handler = registry.get(step.node);
    const input = resolveInput(step.input, ctx);

    try {
      const result = await handler(ctx, input);
      applyPatch(ctx, result.patch);
      if (result.output) {
        ctx.vars = { ...ctx.vars, ...result.output };
      }
      records.push({
        stepId: id,
        node: step.node,
        status: 'success',
        output: result.output,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      records.push({
        stepId: id,
        node: step.node,
        status: 'failed',
        error: message,
      });
      throw error;
    }
  }
}

export async function executeWorkflow(
  definition: WorkflowDefinition,
  initial: Pick<WorkflowContext, 'contentId' | 'accountId' | 'platforms'>,
  registry: NodeRegistry
): Promise<WorkflowRunResult> {
  const ctx: WorkflowContext = {
    contentId: initial.contentId,
    accountId: initial.accountId,
    platforms: initial.platforms,
    versions: [],
    vars: {},
  };

  const records: StepRunRecord[] = [];

  try {
    await runSteps(definition.steps, ctx, registry, records);
    return { workflowId: definition.id, context: ctx, steps: records };
  } catch (error) {
    if (definition.onError?.node) {
      const handler = registry.get(definition.onError.node);
      const input = resolveInput(definition.onError.input, ctx);
      await handler(ctx, input);
    }
    throw error;
  }
}
