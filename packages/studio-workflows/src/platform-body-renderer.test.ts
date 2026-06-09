import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderWechatHtml } from './platform-body-renderer.js';

describe('renderWechatHtml', () => {
  it('renders headings and images', () => {
    const html = renderWechatHtml('## 小标题\n\n![配图](https://x.com/a.png)');
    assert.ok(html.includes('<h2'));
    assert.ok(html.includes('<img src="https://x.com/a.png"'));
  });
});
