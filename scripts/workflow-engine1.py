from pathlib import Path
import json

root = Path('.')

def write(rel, content):
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')
    print('wrote', rel)

write('packages/studio-workflows/src/engine/types.ts', r'''import type { Platform } from '@acs/db';

export type WorkflowContext = {
  contentId: string;
  accountId?: string;
  platforms: Platform[];
  platform?: Platform;
  versionId?: string;
  versions: Array<{ id: string; platform: Platform }>;
  vars: Record<string, unknown>;
};

export type NodeInput = Record<string, unknown>;

export type NodeResult = {
  output?: Record<string, unknown>;
  patch?: Partial<WorkflowContext>;
};

export type WorkflowNodeHandler = (
  ctx: WorkflowContext,
  input: NodeInput
) => Promise<NodeResult>;

export type WorkflowStep = {
  id?: string;
  node?: string;
  input?: NodeInput;
  when?: string;
  foreach?: string;
  as?: string;
  steps?: WorkflowStep[];
};

export type WorkflowDefinition = {
  id: string;
  name: string;
  steps: WorkflowStep[];
  onError?: {
    node: string;
    input?: NodeInput;
  };
};

export type StepRunRecord = {
  stepId: string;
  node: string;
  status: 'skipped' | 'success' | 'failed';
  output?: Record<string, unknown>;
  error?: string;
};

export type WorkflowRunResult = {
  workflowId: string;
  context: WorkflowContext;
  steps: StepRunRecord[];
};
''')

write('packages/studio-workflows/src/engine/conditions.ts', r'''import { canGenerateImages } from '@acs/image-provider';
import type { WorkflowContext } from './types.js';

export function evaluateCondition(
  expression: string | undefined,
  ctx: WorkflowContext
): boolean {
  if (!expression?.trim()) return true;

  return expression
    .split('&&')
    .map((part) => part.trim())
    .every((part) => evaluateAtom(part, ctx));
}

function evaluateAtom(atom: string, ctx: WorkflowContext): boolean {
  const negated = atom.startsWith('!');
  const key = negated ? atom.slice(1).trim() : atom;

  let value = false;
  switch (key) {
    case 'canGenerateImages':
      value = canGenerateImages();
      break;
    case 'hasImageSlots':
      value = Boolean(ctx.vars.hasImageSlots);
      break;
    default:
      value = Boolean(ctx.vars[key]);
  }

  return negated ? !value : value;
}
''')

write('packages/studio-workflows/src/engine/registry.ts', r'''import type { WorkflowNodeHandler } from './types.js';

export class NodeRegistry {
  private readonly handlers = new Map<string, WorkflowNodeHandler>();

  register(id: string, handler: WorkflowNodeHandler): void {
    this.handlers.set(id, handler);
  }

  registerMany(nodes: Record<string, WorkflowNodeHandler>): void {
    for (const [id, handler] of Object.entries(nodes)) {
      this.register(id, handler);
    }
  }

  get(id: string): WorkflowNodeHandler {
    const handler = this.handlers.get(id);
    if (!handler) throw new Error(`workflow node not found: ${id}`);
    return handler;
  }

  has(id: string): boolean {
    return this.handlers.has(id);
  }
}

export const nodeRegistry = new NodeRegistry();
''')

write('packages/studio-workflows/src/engine/resolve-input.ts', r'''import type { NodeInput, WorkflowContext } from './types.js';

export function resolveInput(
  template: NodeInput | undefined,
  ctx: WorkflowContext
): NodeInput {
  if (!template) return {};

  const resolved: NodeInput = {};
  for (const [key, value] of Object.entries(template)) {
    resolved[key] = resolveValue(value, ctx);
  }
  return resolved;
}

function resolveValue(value: unknown, ctx: WorkflowContext): unknown {
  if (typeof value === 'string' && value.startsWith('$')) {
    const path = value.slice(1);
    return getByPath(ctx, path);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, ctx));
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = resolveValue(v, ctx);
    }
    return out;
  }
  return value;
}

function getByPath(ctx: WorkflowContext, path: string): unknown {
  const [head, ...rest] = path.split('.');
  if (head === 'ctx') {
    return rest.length === 0 ? ctx : getNested(ctx, rest);
  }
  if (head === 'vars') {
    return rest.length === 0 ? ctx.vars : getNested(ctx.vars, rest);
  }
  return getNested(ctx as unknown as Record<string, unknown>, [head, ...rest]);
}

function getNested(source: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = source;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
''')

write('packages/studio-workflows/src/engine/executor.ts', r'''import { evaluateCondition } from './conditions.js';
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

function applyPatch(ctx: WorkflowContext, patch?: Partial<WorkflowContext>): void {
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
      records.push({ stepId: id, node: step.node ?? 'group', status: 'skipped' });
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
      records.push({ stepId: id, node: step.node, status: 'failed', error: message });
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
''')

write('packages/studio-workflows/src/engine/load-definition.ts', r'''import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WorkflowDefinition } from './types.js';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

const cache = new Map<string, WorkflowDefinition>();

export function loadWorkflowDefinition(id: string): WorkflowDefinition {
  const cached = cache.get(id);
  if (cached) return cached;

  const filePath = join(packageRoot, 'definitions', `${id}.json`);
  const raw = readFileSync(filePath, 'utf8');
  const definition = JSON.parse(raw) as WorkflowDefinition;
  cache.set(id, definition);
  return definition;
}

export function listWorkflowDefinitionIds(): string[] {
  return ['content.generate'];
}
''')

print('engine files done')
