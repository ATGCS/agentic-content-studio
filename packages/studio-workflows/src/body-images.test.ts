import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { injectImagesIntoBody } from './body-images.js';

describe('injectImagesIntoBody', () => {
  it('replaces placeholders with markdown images', () => {
    const body = '段落1\n\n[[IMAGE:fig-1]]\n\n段落2';
    const map = new Map([
      ['fig-1', { url: 'https://example.com/a.png', alt: '图1' }],
    ]);
    const result = injectImagesIntoBody(body, map);
    assert.ok(result.includes('![图1](https://example.com/a.png)'));
    assert.ok(!result.includes('[[IMAGE:'));
  });

  it('marks failed slots as html comment', () => {
    const body = '[[IMAGE:fig-2]]';
    const result = injectImagesIntoBody(body, new Map(), new Set(['fig-2']));
    assert.ok(result.includes('配图生成失败'));
  });
});
