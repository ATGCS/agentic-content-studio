import type { ImaConfig, KnowledgeProvider, KnowledgeSearchInput } from '../types.js';
import { imaRequest } from '../client.js';
import { extractKnowledgeBases, extractSearchItems } from '../parsers.js';

export class ImaKnowledgeProvider implements KnowledgeProvider {
  constructor(private config: ImaConfig) {}

  async listKnowledgeBases() {
    const res = await imaRequest(
      this.config,
      'openapi/wiki/v1/search_knowledge_base',
      { query: '', cursor: '', limit: 50 }
    );
    return extractKnowledgeBases(res).map(({ externalId, name, description }) => ({
      externalId,
      name,
      description,
    }));
  }

  async search(input: KnowledgeSearchInput) {
    if (!input.knowledgeBaseId) {
      throw new Error('knowledgeBaseId is required for IMA search');
    }
    const limit = input.limit ?? 10;
    const res = await imaRequest(
      this.config,
      'openapi/wiki/v1/search_knowledge',
      {
        query: input.query,
        knowledge_base_id: input.knowledgeBaseId,
        cursor: '',
        limit,
      }
    );
    const items = extractSearchItems(res, limit);
    if (items.length > 0) return items;

    return [
      {
        title: `IMA: ${input.query}`,
        summary: '未解析到结构化结果，已记录原始响应',
        source: 'ima',
      },
    ];
  }
}
