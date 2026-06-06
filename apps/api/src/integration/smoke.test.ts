import '../test/setup-env.js';
import { before, describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import {
  authInject,
  expectOk,
  login,
  parseJson,
} from '../test/helpers.js';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../..');

let app: FastifyInstance;

before(async () => {
  if (process.env.SKIP_TEST_DB_SETUP !== '1') {
    execSync('pnpm db:test:setup', {
      cwd: repoRoot,
      stdio: 'inherit',
      env: { ...process.env },
    });
  }
  app = await buildApp();
  await app.ready();
});

describe('API smoke', () => {
  it('POST /api/auth/login returns token', async () => {
    const token = await login(app, 'admin@acs.local', 'admin123');
    assert.ok(token.length > 10);
  });

  it('GET /api/auth/me without token returns 40100', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    assert.strictEqual(res.statusCode, 401);
    const body = await parseJson(res);
    assert.strictEqual(body.code, 40100);
  });

  it('main flow: content → review → publish → dashboard', async () => {
    const adminToken = await login(app, 'admin@acs.local', 'admin123');
    const reviewerToken = await login(
      app,
      'reviewer@acs.local',
      'reviewer123'
    );

    const topicRes = await authInject(app, adminToken, {
      method: 'POST',
      url: '/api/topics',
      payload: { title: `Smoke topic ${Date.now()}` },
    });
    const topic = expectOk(await parseJson<{ id: string }>(topicRes));

    const contentRes = await authInject(app, adminToken, {
      method: 'POST',
      url: '/api/contents',
      payload: { title: 'Smoke content', topicId: topic.id },
    });
    const content = expectOk(await parseJson<{ id: string }>(contentRes));

    const versionsGenRes = await authInject(app, adminToken, {
      method: 'POST',
      url: `/api/contents/${content.id}/versions/generate`,
      payload: { platforms: ['XIAOHONGSHU'] },
    });
    const versions = expectOk(await parseJson<{ id: string }[]>(versionsGenRes));
    assert.ok(versions.length > 0);
    const versionId = versions[0].id;

    const kbRes = await authInject(app, adminToken, {
      method: 'GET',
      url: '/api/ima/knowledge-bases',
    });
    const kbs = expectOk(await parseJson<{ id: string }[]>(kbRes));
    assert.ok(kbs.length > 0);

    const imaRes = await authInject(app, adminToken, {
      method: 'POST',
      url: '/api/ima/search',
      payload: {
        query: '测试',
        contentId: content.id,
        limit: 3,
        knowledgeBaseId: kbs[0].id,
      },
    });
    expectOk(await parseJson(imaRes));

    const titleAgentRes = await authInject(app, adminToken, {
      method: 'POST',
      url: '/api/agents/run',
      payload: { agentType: 'TITLE', contentId: content.id, overrides: { count: 3 } },
    });
    expectOk(await parseJson(titleAgentRes));

    const submitRes = await authInject(app, adminToken, {
      method: 'POST',
      url: '/api/reviews',
      payload: { contentId: content.id, versionId },
    });
    const review = expectOk(await parseJson<{ id: string }>(submitRes));

    const approveRes = await authInject(app, reviewerToken, {
      method: 'POST',
      url: `/api/reviews/${review.id}/approve`,
    });
    expectOk(await parseJson(approveRes));

    await authInject(app, adminToken, {
      method: 'POST',
      url: '/api/accounts/sync',
    });

    const pubRes = await authInject(app, adminToken, {
      method: 'POST',
      url: '/api/publishing/tasks',
      payload: { versionId, accountId: 'mock-acc-wechat' },
    });
    const task = expectOk(await parseJson<{ id: string }>(pubRes));

    const publishRes = await authInject(app, adminToken, {
      method: 'POST',
      url: `/api/publishing/tasks/${task.id}/publish`,
    });
    expectOk(await parseJson(publishRes));

    const dashRes = await authInject(app, adminToken, {
      method: 'GET',
      url: '/api/dashboard/stats',
    });
    const stats = expectOk(
      await parseJson<{
        pendingGenerate: number;
        pendingReview: number;
        pendingPublish: number;
        publishedWeek: number;
      }>(dashRes)
    );
    assert.ok(typeof stats.pendingReview === 'number');
  });

  it('RBAC: reviewer cannot POST /prompts', async () => {
    const token = await login(app, 'reviewer@acs.local', 'reviewer123');
    const res = await authInject(app, token, {
      method: 'POST',
      url: '/api/prompts',
      payload: {
        name: 'x',
        agentType: 'TITLE',
        template: 'hello {{topic}}',
      },
    });
    assert.strictEqual(res.statusCode, 403);
    const body = await parseJson(res);
    assert.strictEqual(body.code, 40300);
  });

  it('operator cannot approve own content', async () => {
    const token = await login(app, 'operator@acs.local', 'operator123');
    const contentRes = await authInject(app, token, {
      method: 'POST',
      url: '/api/contents',
      payload: { title: 'Operator own content' },
    });
    const content = expectOk(await parseJson<{ id: string }>(contentRes));

    const versionsRes = await authInject(app, token, {
      method: 'GET',
      url: `/api/contents/${content.id}/versions`,
    });
    let versionId: string | undefined;
    const versions = expectOk(await parseJson<{ id: string }[]>(versionsRes));
    versionId = versions[0]?.id;
    if (!versionId) {
      await authInject(app, token, {
        method: 'POST',
        url: `/api/contents/${content.id}/versions/generate`,
        payload: { platforms: ['XIAOHONGSHU'] },
      });
      const again = expectOk(
        await parseJson<{ id: string }[]>(
          await authInject(app, token, {
            method: 'GET',
            url: `/api/contents/${content.id}/versions`,
          })
        )
      );
      versionId = again[0].id;
    }

    const submitRes = await authInject(app, token, {
      method: 'POST',
      url: '/api/reviews',
      payload: { contentId: content.id, versionId },
    });
    const review = expectOk(await parseJson<{ id: string }>(submitRes));

    const approveRes = await authInject(app, token, {
      method: 'POST',
      url: `/api/reviews/${review.id}/approve`,
    });
    assert.strictEqual(approveRes.statusCode, 403);
    const body = await parseJson(approveRes);
    assert.strictEqual(body.code, 40300);
  });
});
