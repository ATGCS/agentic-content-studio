import type { ContextProvider } from './types.js';
import { defaultContextProviders } from './providers.js';

import { knowledgeLocalProvider } from './providers.js';

export class ContextProviderRegistry {
  private readonly providers = new Map<string, ContextProvider>();

  constructor(providers: ContextProvider[] = defaultContextProviders) {
    for (const provider of providers) {
      this.providers.set(provider.id, provider);
    }
    // 兼容旧 provider id
    this.providers.set('knowledge.ima.latest', knowledgeLocalProvider);
  }

  get(id: string): ContextProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`context provider not found: ${id}`);
    return provider;
  }
}

export const contextProviderRegistry = new ContextProviderRegistry();
