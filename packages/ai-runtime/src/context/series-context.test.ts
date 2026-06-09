import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildSeriesContext } from './series-context.js';

describe('buildSeriesContext', () => {
  it('formats sibling summaries for prompt injection', () => {
    const text = buildSeriesContext({
      topicTitle: 'EvoFlow 系列',
      siblings: [
        {
          title: '第一篇：认识 Agent',
          summary: '介绍基础概念',
          body: '正文内容 A',
          createdAt: new Date(),
        },
      ],
    });
    assert.match(text, /EvoFlow 系列/);
    assert.match(text, /第一篇：认识 Agent/);
    assert.match(text, /保持叙事主线/);
  });

  it('returns empty string when no siblings', () => {
    assert.strictEqual(
      buildSeriesContext({ topicTitle: '空系列', siblings: [] }),
      ''
    );
  });
});
