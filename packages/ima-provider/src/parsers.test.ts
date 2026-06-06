import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractKnowledgeBases, extractSearchItems } from './parsers.js';

describe('extractKnowledgeBases', () => {
  it('parses knowledge_base_list', () => {
    const list = extractKnowledgeBases({
      data: {
        knowledge_base_list: [
          { knowledge_base_id: 'kb1', name: '产品库' },
        ],
      },
    });
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].externalId, 'kb1');
    assert.strictEqual(list[0].name, '产品库');
  });
});

describe('extractSearchItems', () => {
  it('parses knowledge_list', () => {
    const items = extractSearchItems(
      {
        data: {
          knowledge_list: [
            { title: '标题A', summary: '摘要A', url: 'https://a.com' },
          ],
        },
      },
      5
    );
    assert.strictEqual(items[0].title, '标题A');
    assert.strictEqual(items[0].url, 'https://a.com');
  });
});
