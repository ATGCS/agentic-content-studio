import { prisma } from '@acs/db';
import type { ImaKnowledgeBase } from '@acs/db';
import { getImaConfig } from './config.js';
import { imaRequest } from './client.js';
import { extractSearchItems } from './parsers.js';
import { fetchMediaContent, itemNeedsContentFetch } from './content.js';
import {
  getKnowledgeBase,
  isImaRemoteKnowledgeBase,
} from './knowledge-bases.js';

const SYNC_CONTENT_MAX = 4000;
const LIST_PAGE_SIZE = 50;

async function enrichItems(
  config: Awaited<ReturnType<typeof getImaConfig>>,
  items: ReturnType<typeof extractSearchItems>
) {
  return Promise.all(
    items.map(async (item) => {
      if (!itemNeedsContentFetch(item)) return item;
      try {
        const content = await fetchMediaContent(
          config,
          item.mediaId!,
          SYNC_CONTENT_MAX
        );
        if (content) return { ...item, summary: content };
      } catch {
        // 单条失败不影响其余条目
      }
      return item;
    })
  );
}

async function listRemoteItems(
  config: Awaited<ReturnType<typeof getImaConfig>>,
  externalId: string
) {
  const listRes = await imaRequest(
    config,
    'openapi/wiki/v1/get_knowledge_list',
    {
      knowledge_base_id: externalId,
      cursor: '',
      limit: LIST_PAGE_SIZE,
    }
  );
  return extractSearchItems(listRes, LIST_PAGE_SIZE);
}

export async function syncDocumentsForKnowledgeBase(kb: ImaKnowledgeBase) {
  if (!isImaRemoteKnowledgeBase(kb)) return 0;

  const config = await getImaConfig();
  if (!config.clientId || !config.apiKey) return 0;

  const remoteItems = await enrichItems(
    config,
    await listRemoteItems(config, kb.externalId)
  );

  const syncedMediaIds: string[] = [];
  let upserted = 0;

  for (const [index, item] of remoteItems.entries()) {
    const externalMediaId =
      item.mediaId ?? `title-${index}-${item.title.slice(0, 40)}`;
    const content = item.summary?.trim() || null;
    const summary =
      content && content !== item.title ? content.slice(0, 500) : item.title;

    await prisma.imaKnowledgeDocument.upsert({
      where: {
        knowledgeBaseId_externalMediaId: {
          knowledgeBaseId: kb.id,
          externalMediaId,
        },
      },
      create: {
        knowledgeBaseId: kb.id,
        externalMediaId,
        title: item.title,
        summary,
        content,
        sourceUrl: item.url,
        source: 'ima',
        rawData: item as object,
        syncedAt: new Date(),
      },
      update: {
        title: item.title,
        summary,
        content,
        sourceUrl: item.url,
        source: 'ima',
        rawData: item as object,
        syncedAt: new Date(),
      },
    });

    syncedMediaIds.push(externalMediaId);
    upserted += 1;
  }

  if (syncedMediaIds.length > 0) {
    await prisma.imaKnowledgeDocument.deleteMany({
      where: {
        knowledgeBaseId: kb.id,
        source: 'ima',
        externalMediaId: { notIn: syncedMediaIds },
      },
    });
  } else {
    await prisma.imaKnowledgeDocument.deleteMany({
      where: { knowledgeBaseId: kb.id, source: 'ima' },
    });
  }

  return upserted;
}

export async function syncKnowledgeDocumentsFromIma(options?: {
  knowledgeBaseId?: string;
  enabledOnly?: boolean;
}) {
  const config = await getImaConfig();
  if (!config.clientId || !config.apiKey) return [];

  const kbs = options?.knowledgeBaseId
    ? [await getKnowledgeBase(options.knowledgeBaseId)]
    : await prisma.imaKnowledgeBase.findMany({
        where: options?.enabledOnly === false ? {} : { enabled: true },
        orderBy: { name: 'asc' },
      });

  const results: Array<{
    knowledgeBaseId: string;
    name: string;
    count: number;
    skipped?: boolean;
    error?: string;
  }> = [];

  for (const kb of kbs) {
    if (!isImaRemoteKnowledgeBase(kb)) {
      results.push({
        knowledgeBaseId: kb.id,
        name: kb.name,
        count: 0,
        skipped: true,
      });
      continue;
    }

    try {
      const count = await syncDocumentsForKnowledgeBase(kb);
      results.push({ knowledgeBaseId: kb.id, name: kb.name, count });
    } catch (err) {
      results.push({
        knowledgeBaseId: kb.id,
        name: kb.name,
        count: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}
