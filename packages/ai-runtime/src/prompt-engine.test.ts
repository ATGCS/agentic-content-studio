import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renderTemplate } from './prompt-engine.js';

describe('renderTemplate', () => {
  it('replaces variables', () => {
    const out = renderTemplate('Hello {{name}}', { name: 'ACS' });
    assert.strictEqual(out, 'Hello ACS');
  });
  it('empty missing vars', () => {
    const out = renderTemplate('{{missing}}', {});
    assert.strictEqual(out, '');
  });
});
