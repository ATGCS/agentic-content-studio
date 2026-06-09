export interface KnowledgeItem {
  title: string;
  summary: string;
  url?: string;
  source?: string;
  mediaId?: string;
  mediaType?: number;
}

export interface KnowledgeSearchInput {
  query: string;
  knowledgeBaseId?: string;
  platform?: string;
  limit?: number;
}

export interface KnowledgeSearchResult {
  items: KnowledgeItem[];
  raw: unknown;
  mode: 'search' | 'list' | 'none';
}

export interface KnowledgeProvider {
  search(input: KnowledgeSearchInput): Promise<KnowledgeSearchResult>;
  listKnowledgeBases?(): Promise<
    Array<{ externalId: string; name: string; description?: string }>
  >;
}

export type ImaConfig = {
  clientId: string;
  apiKey: string;
  baseUrl: string;
};

export const IMA_CONFIG_KEY = 'ima.config';
export const DEFAULT_IMA_BASE_URL = 'https://ima.qq.com';
