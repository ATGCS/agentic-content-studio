import '@acs/db/test-env';
import { before, describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '@acs/db';
import {
  createDocument,
  listDocuments,
  updateDocument,
  deleteDocument,
} from './documents.js';
import { createLocalKnowledgeBase } from './knowledge-bases.js';

describe('documents CRUD', () => {
  let knowledgeBaseId: string;

  before(async () => {
    const kb = await createLocalKnowledgeBase({
      name: `本地库-${Date.now()}`,
      agentType: 'BODY',
      description: '测试',
    });
    knowledgeBaseId = kb.id;
  });

  it('creates and lists documents', async () => {
    const doc = await createDocument(knowledgeBaseId, {
      title: '品牌话术',
      content: '强调专业、可信赖的语气。',
    });
    assert.ok(doc.id);
    const list = await listDocuments(knowledgeBaseId);
    assert.ok(list.some((row) => row.id === doc.id));
  });

  it('updates and deletes documents', async () => {
    const doc = await createDocument(knowledgeBaseId, {
      title: '待更新',
      content: '原始内容',
    });
    const updated = await updateDocument(knowledgeBaseId, doc.id, {
      title: '已更新',
      content: '新内容',
    });
    assert.strictEqual(updated.title, '已更新');
    await deleteDocument(knowledgeBaseId, doc.id);
    const list = await listDocuments(knowledgeBaseId);
    assert.ok(!list.some((row) => row.id === doc.id));
  });
});
