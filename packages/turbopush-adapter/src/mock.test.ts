import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MockPublishProvider } from './index.js';

describe('MockPublishProvider', () => {
  const provider = new MockPublishProvider();

  it('listAccounts returns mock accounts', async () => {
    const accounts = await provider.listAccounts('user-1');
    assert.ok(accounts.length >= 2);
    assert.ok(accounts[0].id);
  });

  it('publish returns success structure', async () => {
    const result = await provider.publish({
      versionId: 'v1',
      accountId: 'mock-acc-wechat',
      platform: 'WECHAT',
    });
    assert.strictEqual(result.success, true);
    assert.ok(result.externalPostId);
  });

  it('syncMetrics returns numeric fields', async () => {
    const metrics = await provider.syncMetrics();
    assert.ok(typeof metrics.views === 'number');
  });
});
