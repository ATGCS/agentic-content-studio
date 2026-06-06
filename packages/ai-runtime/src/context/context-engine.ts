import type { ContextBuildInput } from './types.js';
import type { RuntimeVariables } from '../runtime/types.js';
import { contextProviderRegistry, type ContextProviderRegistry } from './registry.js';

export class ContextEngine {
  constructor(private readonly registry: ContextProviderRegistry = contextProviderRegistry) {}

  async build(input: ContextBuildInput, providerIds: string[]): Promise<RuntimeVariables> {
    const variables: RuntimeVariables = {};

    for (const id of providerIds) {
      Object.assign(variables, await this.registry.get(id).build(input));
    }

    return variables;
  }
}

export const contextEngine = new ContextEngine();

export async function buildContext(input: ContextBuildInput): Promise<RuntimeVariables> {
  return contextEngine.build(input, [
    'content.basic',
    'knowledge.ima.latest',
    'account.profile',
    'runtime.overrides',
  ]);
}
