import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseOutput } from './parsers.js';

describe('parseOutput', () => {
  it('parses TITLE json', () => {
    const out = parseOutput(
      'TITLE',
      '{"titles":["标题A","标题B"]}'
    ) as { titles: string[] };
    assert.deepStrictEqual(out.titles, ['标题A', '标题B']);
  });

  it('parses BODY from fenced json', () => {
    const out = parseOutput(
      'BODY',
      '```json\n{"body":"hello world"}\n```'
    ) as { body: string };
    assert.strictEqual(out.body, 'hello world');
  });

  it('parses REWRITE fields', () => {
    const out = parseOutput(
      'REWRITE',
      '{"title":"T","body":"B","tags":["a"]}'
    ) as { title: string; body: string; tags: string[] };
    assert.strictEqual(out.title, 'T');
    assert.strictEqual(out.body, 'B');
    assert.deepStrictEqual(out.tags, ['a']);
  });

  it('throws clear error for invalid json', () => {
    assert.throws(() => parseOutput('BODY', 'not json'), /invalid JSON output/);
  });
});
