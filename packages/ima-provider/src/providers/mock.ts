import type { KnowledgeProvider, KnowledgeSearchInput } from '../types.js';

export class MockImaProvider implements KnowledgeProvider {
  async search(input: KnowledgeSearchInput) {
    const limit = input.limit ?? 5;
    const kb = input.knowledgeBaseId ? ` [KB:${input.knowledgeBaseId}]` : '';
    return Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
      title: `参考：${input.query}${kb} #${i + 1}`,
      summary: `关于「${input.query}」的行业参考摘要 ${i + 1}`,
      url: `https://example.com/ref/${i + 1}`,
      source: 'mock-ima',
    }));
  }

  async listKnowledgeBases() {
    return [
      {
        externalId: 'mock-kb-default',
        name: 'Mock 默认知识库',
        description: '开发环境模拟知识库',
      },
      {
        externalId: 'mock-kb-industry',
        name: 'Mock 行业参考库',
        description: '开发环境模拟知识库',
      },
    ];
  }
}
