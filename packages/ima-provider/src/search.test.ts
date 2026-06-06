import '@acs/db/test-env';
import { before, describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '@acs/db';
import { searchAndLog } from './search.js';
import { syncKnowledgeBasesFromIma } from './knowledge-bases.js';

describe('searchAndLog', () => {
  let contentId: string;

  before(async () => {
    await syncKnowledgeBasesFromIma();
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@acs.local' },
    });
    const content = await prisma.content.create({
      data: {
        title: 'ima-test',
        createdBy: admin.id,
        status: 'DRAFT',
      },
    });
    contentId = content.id;
  });

  it('writes ima_search_logs row with knowledge base', async () => {
    const defaultKb = await prisma.imaKnowledgeBase.findFirst({
      where: { isDefault: true },
    });
    assert.ok(defaultKb);
    const { items, log } = await searchAndLog(contentId, '行业趋势', {
      limit: 2,
      knowledgeBaseId: defaultKb.id,
    });
    assert.ok(items.length > 0);
    assert.strictEqual(log.contentId, contentId);
    assert.strictEqual(log.knowledgeBaseId, defaultKb.id);
    const row = await prisma.imaSearchLog.findUnique({ where: { id: log.id } });
    assert.ok(row);
  });
});
