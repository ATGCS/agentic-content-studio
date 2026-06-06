import { getImaConfig } from './config.js';
import { MockImaProvider } from './providers/mock.js';
import { ImaKnowledgeProvider } from './providers/ima.js';
import type { KnowledgeProvider } from './types.js';

export async function getKnowledgeProvider(): Promise<KnowledgeProvider> {
  const config = await getImaConfig();
  if (config.useMock) {
    return new MockImaProvider();
  }
  return new ImaKnowledgeProvider(config);
}
