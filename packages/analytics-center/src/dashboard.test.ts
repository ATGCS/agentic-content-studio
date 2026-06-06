import '@acs/db/test-env';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getDashboardStats } from './index.js';

describe('getDashboardStats', () => {
  it('returns expected metric keys', async () => {
    const stats = await getDashboardStats();
    assert.ok(typeof stats.pendingGenerate === 'number');
    assert.ok(typeof stats.generating === 'number');
    assert.ok(typeof stats.pendingReview === 'number');
    assert.ok(typeof stats.pendingPublish === 'number');
    assert.ok(typeof stats.publishedTotal === 'number');
    assert.ok(typeof stats.reviewed === 'number');
  });
});
