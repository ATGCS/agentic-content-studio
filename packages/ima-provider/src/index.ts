import { prisma } from '@acs/db';

export interface KnowledgeItem {
  title: string;
  summary: string;
  url?: string;
  source?: string;
}

export interface KnowledgeProvider {
  search(input: {
    query: string;
    platform?: string;
    limit?: number;
  }): Promise<KnowledgeItem[]>;
}

export class MockImaProvider implements KnowledgeProvider {
  async search(input: {
    query: string;
    limit?: number;
  }): Promise<KnowledgeItem[]> {
    const limit = input.limit ?? 5;
    return Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
      title: `参考：${input.query} #${i + 1}`,
      summary: `关于「${input.query}」的行业参考摘要 ${i + 1}`,
      url: `https://example.com/ref/${i + 1}`,
      source: 'mock-ima',
    }));
  }
}

export function getKnowledgeProvider(): KnowledgeProvider {
  return new MockImaProvider();
}

export async function searchAndLog(
  contentId: string,
  query: string,
  limit = 10
) {
  const provider = getKnowledgeProvider();
  const items = await provider.search({ query, limit });
  const summary = items.map((i) => i.title).join('；');
  const log = await prisma.imaSearchLog.create({
    data: {
      contentId,
      query,
      resultSummary: summary,
      rawResult: items as object,
    },
  });
  return { items, log };
}
