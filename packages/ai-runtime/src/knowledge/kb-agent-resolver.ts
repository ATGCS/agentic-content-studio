export type KbAgentTypeResolver = (agentType?: string) => string[] | undefined;

const RESOLVER_KEY = Symbol.for('@acs/kbAgentTypeResolver');

export function setKbAgentTypeResolver(fn: KbAgentTypeResolver): void {
  (
    globalThis as typeof globalThis & {
      [RESOLVER_KEY]?: KbAgentTypeResolver;
    }
  )[RESOLVER_KEY] = fn;
}

export function resolveKbAgentTypes(agentType?: string): string[] | undefined {
  const resolver = (
    globalThis as typeof globalThis & {
      [RESOLVER_KEY]?: KbAgentTypeResolver;
    }
  )[RESOLVER_KEY];
  return resolver?.(agentType);
}
