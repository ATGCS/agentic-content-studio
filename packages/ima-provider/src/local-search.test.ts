import '@acs/db/test-env';
import { before, describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '@acs/db';
import { searchLocalKnowledge } from './local-search.js';

describe('searchLocalKnowledge', () => {
  let knowledgeBaseId: string;

  before(async () => {
    const kb = await prisma.imaKnowledgeBase.create({
      data: {
        externalId: `test-kb-${Date.now()}`,
        name: `测试正文知识库-${Date.now()}`,
        agentType: 'BODY',
        enabled: true,
        isDefault: true,
      },
    });
    knowledgeBaseId = kb.id;

    await prisma.imaKnowledgeDocument.createMany({
      data: [
        {
          knowledgeBaseId,
          externalMediaId: 'doc-1',
          title: '春季护肤行业趋势',
          summary: '敏感肌与成分党',
          content: '2026 年春季护肤赛道强调屏障修护与温和成分。',
        },
        {
          knowledgeBaseId,
          externalMediaId: 'doc-2',
          title: '竞品活动案例',
          summary: '满减与赠品',
          content: '头部品牌采用限时满减搭配小样赠品。',
        },
      ],
    });
  });

  it('matches documents by keyword', async () => {
    const result = await searchLocalKnowledge({
      query: '护肤 趋势',
      kbAgentTypes: ['BODY'],
      limit: 5,
    });
    assert.ok(result.items.length > 0);
    assert.match(result.summary, /护肤/);
    assert.strictEqual(result.mode, 'search');
  });

  it('falls back to recent documents when no keyword match', async () => {
    const result = await searchLocalKnowledge({
      query: '完全不相关的词',
      knowledgeBaseId,
      limit: 1,
    });
    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.mode, 'list');
  });
});
