import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeRewriteOutput, outputParsers } from './parsers.js';

describe('normalizeRewriteOutput', () => {
  it('injects missing image placeholders into body', () => {
    const normalized = normalizeRewriteOutput({
      title: 'T',
      body: '第一段。\n\n第二段。\n\n第三段。',
      imageSlots: [
        {
          id: 'fig-1',
          prompt: '对比图：左边混乱右边高效',
          alt: '对比',
        },
      ],
    });
    assert.match(normalized.body, /\[\[IMAGE:fig-1\]\]/);
  });
});

describe('rewrite parser', () => {
  it('accepts rewrite json when imageSlots lack placeholders', () => {
    const out = outputParsers.rewrite(
      JSON.stringify({
        title: 'T',
        body: '段落一\n\n段落二',
        tags: ['tag'],
        imageSlots: [
          {
            id: 'fig-1',
            prompt: '一张对比强烈的分割图，左边混乱右边高效',
            alt: '对比',
          },
        ],
      })
    ) as { body: string };
    assert.match(out.body, /\[\[IMAGE:fig-1\]\]/);
  });
});
