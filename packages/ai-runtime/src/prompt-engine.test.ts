import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  extractTemplateVariables,
  previewPrompt,
  renderPrompt,
  renderTemplate,
} from './prompt-engine.js';

describe('renderTemplate', () => {
  it('replaces variables', () => {
    const out = renderTemplate('Hello {{name}}', { name: 'ACS' });
    assert.strictEqual(out, 'Hello ACS');
  });
  it('empty missing vars', () => {
    const out = renderTemplate('{{missing}}', {});
    assert.strictEqual(out, '');
  });

  it('reports missing variables', () => {
    const out = renderPrompt('{{name}} {{missing}}', { name: 'ACS' });
    assert.strictEqual(out.text, 'ACS ');
    assert.deepStrictEqual(out.missingVariables, ['missing']);
  });

  it('extracts unique declared variables', () => {
    assert.deepStrictEqual(extractTemplateVariables('{{title}} {{body}} {{title}}'), [
      'title',
      'body',
    ]);
  });

  it('previews missing and extra variables', () => {
    const out = previewPrompt('{{title}} {{body}}', { title: '标题', extra: '额外' });
    assert.strictEqual(out.text, '标题 ');
    assert.deepStrictEqual(out.declaredVariables, ['title', 'body']);
    assert.deepStrictEqual(out.missingVariables, ['body']);
    assert.deepStrictEqual(out.extraVariables, ['extra']);
  });
});
