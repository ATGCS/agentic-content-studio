import '@acs/db/test-env';
import { before, describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '@acs/db';
import { searchAndLog } from './search.js';

describe('searchAndLog', () => {
  let contentId: string;
  let knowledgeBaseId: string;

  before(async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@acs.local' },
    });
    const content = await prisma.content.create({
      data: {
        title: 'local-kb-test',
        createdBy: admin.id,
        status: 'DRAFT',
      },
    });
    contentId = content.id;

    const kb = await prisma.imaKnowledgeBase.create({
      data: {
        externalId: `search-log-kb-${Date.now()}`,
        name: `检索日志测试库-${Date.now()}`,
        agentType: 'BODY',
        enabled: true,
        isDefault: true,
      },
    });
    knowledgeBaseId = kb.id;

    await prisma.imaKnowledgeDocument.create({
      data: {
        knowledgeBaseId,
        externalMediaId: 'log-doc-1',
        title: '行业趋势报告',
        content: '内容运营需要结合平台规则与账号风格。',
      },
    });
  });

  it('writes ima_search_logs row from local knowledge', async () => {
    const { items, log } = await searchAndLog(contentId, '行业趋势', {
      limit: 2,
      knowledgeBaseId,
      agentType: 'BODY',
    });
    assert.ok(items.length > 0);
    assert.strictEqual(log.contentId, contentId);
    assert.strictEqual(log.knowledgeBaseId, knowledgeBaseId);
    const row = await prisma.imaSearchLog.findUnique({ where: { id: log.id } });
    assert.ok(row);
    assert.strictEqual(
      (row?.rawResult as { source?: string })?.source,
      'local'
    );
  });
});
