import { prisma } from '@acs/db';
import type { KnowledgeItem } from './types.js';
import { formatKnowledgeSummary } from './summary.js';

export type LocalSearchInput = {
  query: string;
  agentType?: string;
  kbAgentTypes?: string[];
  knowledgeBaseId?: string;
  limit?: number;
};

export type LocalSearchResult = {
  items: KnowledgeItem[];
  summary: string;
  mode: 'search' | 'list' | 'none';
  knowledgeBaseIds: string[];
};

function tokenize(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length >= 1);
}

function scoreDocument(
  doc: { title: string; summary: string | null; content: string | null },
  keywords: string[]
): number {
  const haystack =
    `${doc.title} ${doc.summary ?? ''} ${doc.content ?? ''}`.toLowerCase();
  if (keywords.length === 0) return 0;
  return keywords.reduce(
    (score, word) =>
      haystack.includes(word.toLowerCase()) ? score + 1 : score,
    0
  );
}

async function resolveKnowledgeBaseIds(
  input: LocalSearchInput
): Promise<string[]> {
  if (input.knowledgeBaseId) {
    const kb = await prisma.imaKnowledgeBase.findFirst({
      where: {
        OR: [
          { id: input.knowledgeBaseId },
          { externalId: input.knowledgeBaseId },
        ],
        enabled: true,
      },
    });
    return kb ? [kb.id] : [];
  }

  const preferredTypes = input.kbAgentTypes;
  if (preferredTypes?.length) {
    const matched = await prisma.imaKnowledgeBase.findMany({
      where: {
        enabled: true,
        agentType: { in: preferredTypes },
      },
      orderBy: [{ isDefault: 'desc' }, { syncedAt: 'desc' }],
    });
    if (matched.length > 0) return matched.map((kb) => kb.id);
  }

  const fallback = await prisma.imaKnowledgeBase.findFirst({
    where: { enabled: true },
    orderBy: [{ isDefault: 'desc' }, { syncedAt: 'desc' }],
  });
  return fallback ? [fallback.id] : [];
}

function toKnowledgeItem(doc: {
  title: string;
  summary: string | null;
  content: string | null;
  sourceUrl: string | null;
  externalMediaId: string;
}): KnowledgeItem {
  const summary = doc.content?.trim() || doc.summary?.trim() || doc.title;
  return {
    title: doc.title,
    summary,
    url: doc.sourceUrl ?? undefined,
    source: 'local',
    mediaId: doc.externalMediaId,
  };
}

export async function searchLocalKnowledge(
  input: LocalSearchInput
): Promise<LocalSearchResult> {
  const limit = input.limit ?? 10;
  const knowledgeBaseIds = await resolveKnowledgeBaseIds(input);

  if (knowledgeBaseIds.length === 0) {
    return { items: [], summary: '', mode: 'none', knowledgeBaseIds: [] };
  }

  const docs = await prisma.imaKnowledgeDocument.findMany({
    where: { knowledgeBaseId: { in: knowledgeBaseIds } },
    orderBy: { syncedAt: 'desc' },
    take: 200,
  });

  if (docs.length === 0) {
    return { items: [], summary: '', mode: 'none', knowledgeBaseIds };
  }

  const keywords = tokenize(input.query);
  const ranked = docs
    .map((doc) => ({ doc, score: scoreDocument(doc, keywords) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.doc.syncedAt.getTime() - a.doc.syncedAt.getTime();
    });

  const hasMatch = ranked.some((row) => row.score > 0);
  const selected = (hasMatch ? ranked.filter((row) => row.score > 0) : ranked)
    .slice(0, limit)
    .map((row) => row.doc);

  const items = selected.map(toKnowledgeItem);
  return {
    items,
    summary: formatKnowledgeSummary(items),
    mode: hasMatch ? 'search' : 'list',
    knowledgeBaseIds,
  };
}
