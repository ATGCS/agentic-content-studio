import { getImaConfig } from './config.js';
import { ImaKnowledgeProvider } from './providers/ima.js';
import type { KnowledgeProvider } from './types.js';

export async function getKnowledgeProvider(): Promise<KnowledgeProvider> {
  const config = await getImaConfig();
  if (!config.clientId || !config.apiKey) {
    throw new Error(
      'IMA 知识库未配置：请在 .env 中设置 IMA_OPENAPI_CLIENTID 和 IMA_OPENAPI_APIKEY'
    );
  }
  return new ImaKnowledgeProvider(config);
}
