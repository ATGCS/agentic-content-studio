import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parsePagination } from './api-response.js';

describe('parsePagination', () => {
  it('defaults page 1 and pageSize 20', () => {
    const p = parsePagination({});
    assert.strictEqual(p.page, 1);
    assert.strictEqual(p.pageSize, 20);
    assert.strictEqual(p.skip, 0);
  });

  it('computes skip from page', () => {
    const p = parsePagination({ page: '3', pageSize: '10' });
    assert.strictEqual(p.page, 3);
    assert.strictEqual(p.pageSize, 10);
    assert.strictEqual(p.skip, 20);
  });

  it('caps pageSize at 100', () => {
    const p = parsePagination({ pageSize: '500' });
    assert.strictEqual(p.pageSize, 100);
  });
});
