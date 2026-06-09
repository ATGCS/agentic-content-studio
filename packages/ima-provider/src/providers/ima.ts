import type {
  ImaConfig,
  KnowledgeProvider,
  KnowledgeSearchInput,
  KnowledgeItem,
  KnowledgeSearchResult,
} from '../types.js';
import { imaRequest } from '../client.js';
import { extractKnowledgeBases, extractSearchItems } from '../parsers.js';
import { fetchMediaContent, itemNeedsContentFetch } from '../content.js';

function filterByQuery(items: KnowledgeItem[], query: string) {
  const keywords = query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length >= 2);
  if (keywords.length === 0) return items;

  const matched = items.filter((item) => {
    const haystack = `${item.title} ${item.summary}`.toLowerCase();
    return keywords.some((word) => haystack.includes(word.toLowerCase()));
  });
  return matched.length > 0 ? matched : items;
}

async function enrichItemsWithContent(
  config: ImaConfig,
  items: KnowledgeItem[]
): Promise<KnowledgeItem[]> {
  const enriched = await Promise.all(
    items.map(async (item) => {
      if (!itemNeedsContentFetch(item)) return item;
      try {
        const content = await fetchMediaContent(config, item.mediaId!);
        if (content) return { ...item, summary: content };
      } catch {
        // 单条失败不影响其余条目
      }
      return item;
    })
  );

  return enriched.filter(
    (item) =>
      !(
        item.title === '未命名笔记' &&
        (item.summary === item.title || item.summary.length < 10)
      )
  );
}

export class ImaKnowledgeProvider implements KnowledgeProvider {
  constructor(private config: ImaConfig) {}

  async listKnowledgeBases() {
    const res = await imaRequest(
      this.config,
      'openapi/wiki/v1/search_knowledge_base',
      { query: '', cursor: '', limit: 20 }
    );
    return extractKnowledgeBases(res).map(
      ({ externalId, name, description }) => ({
        externalId,
        name,
        description,
      })
    );
  }

  async search(input: KnowledgeSearchInput): Promise<KnowledgeSearchResult> {
    if (!input.knowledgeBaseId) {
      throw new Error('knowledgeBaseId is required for IMA search');
    }
    const limit = input.limit ?? 10;

    const searchRes = await imaRequest(
      this.config,
      'openapi/wiki/v1/search_knowledge',
      {
        query: input.query,
        knowledge_base_id: input.knowledgeBaseId,
        cursor: '',
        limit,
      }
    );
    const searchItems = await enrichItemsWithContent(
      this.config,
      extractSearchItems(searchRes, limit)
    );
    if (searchItems.length > 0) {
      return { items: searchItems, raw: searchRes, mode: 'search' };
    }

    const listRes = await imaRequest(
      this.config,
      'openapi/wiki/v1/get_knowledge_list',
      {
        knowledge_base_id: input.knowledgeBaseId,
        cursor: '',
        limit: Math.min(limit, 50),
      }
    );
    const listItems = await enrichItemsWithContent(
      this.config,
      filterByQuery(extractSearchItems(listRes, limit), input.query)
    );
    if (listItems.length > 0) {
      return {
        items: listItems,
        raw: { search: searchRes, list: listRes },
        mode: 'list',
      };
    }

    return {
      items: [],
      raw: { search: searchRes, list: listRes },
      mode: 'none',
    };
  }
}
