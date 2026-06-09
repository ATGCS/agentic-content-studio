import type { NodeInput, WorkflowContext } from './types.js';

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
