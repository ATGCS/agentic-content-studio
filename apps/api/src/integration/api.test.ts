import '../test/setup-env.js';
import { before, describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app.js';
import { authInject, login } from '../test/helpers.js';

const repoRoot = resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../../..'
);

let app: FastifyInstance;
let adminToken: string;
let operatorToken: string;
let reviewerToken: string;

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
  adminToken = await login(app, 'admin@acs.local', 'admin123');
  operatorToken = await login(app, 'operator@acs.local', 'operator123');
  reviewerToken = await login(app, 'reviewer@acs.local', 'reviewer123');
});

type ApiBody<T = unknown> = { code: number; message: string; data: T };

/** Helper: parse response body */
function body<T = unknown>(res: { body: string }): ApiBody<T> {
  return JSON.parse(res.body);
}

/** Helper: extract data from a successful response */
function data<T = unknown>(res: { body: string }): T {
  const b = JSON.parse(res.body) as ApiBody<T>;
  if (b.code !== 0) {
    throw new Error(
      `expected code 0, got ${b.code}: ${JSON.stringify(b.message)}`
    );
  }
  return b.data;
}

// ─── 1. Health & Auth ───────────────────────────────────────────────────────

describe('1. Health & Auth', () => {
  it('GET /health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(JSON.parse(res.body).ok, true);
  });

  it('POST /api/auth/login returns token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@acs.local', password: 'admin123' },
    });
    const b = body<{ token: string }>(res);
    assert.strictEqual(b.code, 0);
    assert.ok(b.data.token.length > 10);
  });

  it('POST /api/auth/login rejects wrong password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@acs.local', password: 'wrong' },
    });
    assert.notStrictEqual(body(res).code, 0);
  });

  it('GET /api/auth/me rejects no token (401)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    assert.strictEqual(res.statusCode, 401);
  });

  it('GET /api/auth/me returns user info', async () => {
    const res = await authInject(app, adminToken, {
      method: 'GET',
      url: '/api/auth/me',
    });
    const d = data<{ id: string; email: string; role: string }>(res);
    assert.strictEqual(d.email, 'admin@acs.local');
    assert.strictEqual(d.role, 'ADMIN');
  });
});

// ─── 2. Topics ───────────────────────────────────────────────────────────────

describe('2. Topics CRUD', () => {
  let topicId: string;

  it('POST /api/topics creates topic', async () => {
    const d = data<{ id: string; title: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/topics',
        payload: { title: `T ${Date.now()}` },
      })
    );
    assert.ok(d.id);
    topicId = d.id;
  });

  it('GET /api/topics lists topics', async () => {
    const d = data<{ items: unknown[] }>(
      await authInject(app, adminToken, { method: 'GET', url: '/api/topics' })
    );
    assert.ok(d.items.length >= 1);
  });

  it('GET /api/topics/:id returns topic', async () => {
    const d = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/topics/${topicId}`,
      })
    );
    assert.strictEqual(d.id, topicId);
  });

  it('PATCH /api/topics/:id updates topic', async () => {
    const d = data<{ description: string }>(
      await authInject(app, adminToken, {
        method: 'PATCH',
        url: `/api/topics/${topicId}`,
        payload: { description: 'Updated' },
      })
    );
    assert.strictEqual(d.description, 'Updated');
  });

  it('DELETE /api/topics/:id deletes topic', async () => {
    data(
      await authInject(app, adminToken, {
        method: 'DELETE',
        url: `/api/topics/${topicId}`,
      })
    );
    const res = await authInject(app, adminToken, {
      method: 'GET',
      url: `/api/topics/${topicId}`,
    });
    assert.strictEqual(res.statusCode, 404);
  });

  it('GET /api/topics/:id 404 for non-existent', async () => {
    const res = await authInject(app, adminToken, {
      method: 'GET',
      url: '/api/topics/none',
    });
    assert.strictEqual(res.statusCode, 404);
  });
});

// ─── 3. Contents ─────────────────────────────────────────────────────────────

describe('3. Contents CRUD', () => {
  let contentId: string;

  it('POST /api/contents creates content', async () => {
    const d = data<{ id: string; title: string; status: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/contents',
        payload: { title: `C ${Date.now()}` },
      })
    );
    assert.ok(d.id);
    contentId = d.id;
  });

  it('GET /api/contents lists all', async () => {
    const d = data<{ items: unknown[] }>(
      await authInject(app, adminToken, { method: 'GET', url: '/api/contents' })
    );
    assert.ok(d.items.length >= 1);
  });

  it('GET /api/contents/:id returns one', async () => {
    const d = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/contents/${contentId}`,
      })
    );
    assert.strictEqual(d.id, contentId);
  });

  it('PATCH /api/contents/:id updates', async () => {
    const d = data<{ summary: string }>(
      await authInject(app, adminToken, {
        method: 'PATCH',
        url: `/api/contents/${contentId}`,
        payload: { summary: 'Sum' },
      })
    );
    assert.strictEqual(d.summary, 'Sum');
  });

  it('GET /api/contents/:id/versions', async () => {
    const d = data<{ items: { id: string }[] }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/contents/${contentId}/versions`,
      })
    );
    // versions may be empty initially
    assert.ok(Array.isArray(d.items));
  });

  it('POST /api/contents/:id/versions/generate', async () => {
    data<{ id: string; platform: string }[]>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/contents/${contentId}/versions/generate`,
        payload: { platforms: ['XIAOHONGSHU'] },
      })
    );
  });

  it('POST /api/contents/:id/generate triggers AI generation', async () => {
    data(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/contents/${contentId}/generate`,
      })
    );
  });

  it('GET /api/contents/:id returns 404 for non-existent', async () => {
    const res = await authInject(app, adminToken, {
      method: 'GET',
      url: '/api/contents/none',
    });
    assert.strictEqual(res.statusCode, 404);
  });
});

// ─── 4. Versions ─────────────────────────────────────────────────────────────

describe('4. Versions API', () => {
  let vid: string;

  before(async () => {
    const c = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/contents',
        payload: { title: `V ${Date.now()}` },
      })
    );
    const versions = data<{ id: string }[]>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/contents/${c.id}/versions/generate`,
        payload: { platforms: ['WECHAT'] },
      })
    );
    vid = versions[0].id;
  });

  it('GET /api/versions/:id returns detail', async () => {
    const d = data<{ id: string; platform: string }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/versions/${vid}`,
      })
    );
    assert.strictEqual(d.id, vid);
  });

  it('PATCH /api/versions/:id updates', async () => {
    const d = data<{ title: string }>(
      await authInject(app, adminToken, {
        method: 'PATCH',
        url: `/api/versions/${vid}`,
        payload: { title: 'Updated V' },
      })
    );
    assert.strictEqual(d.title, 'Updated V');
  });

  it('GET /api/versions/:id 404 for missing', async () => {
    const res = await authInject(app, adminToken, {
      method: 'GET',
      url: '/api/versions/none',
    });
    assert.strictEqual(res.statusCode, 404);
  });
});

// ─── 5. Agents ───────────────────────────────────────────────────────────────

describe('5. Agents', () => {
  let agentId: string;

  it('GET /api/agents lists', async () => {
    const d = data<{ items: { id: string; name: string; type: string }[] }>(
      await authInject(app, adminToken, { method: 'GET', url: '/api/agents' })
    );
    assert.ok(d.items.length >= 4);
    agentId = d.items[0].id;
  });

  it('GET /api/agents with type filter', async () => {
    const d = data<{ items: { type: string }[] }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/agents?type=TITLE',
      })
    );
    d.items.forEach((a) => assert.strictEqual(a.type, 'TITLE'));
  });

  it('GET /api/agents/:id returns one', async () => {
    const d = data<{ id: string; name: string }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/agents/${agentId}`,
      })
    );
    assert.strictEqual(d.id, agentId);
  });

  it('POST /api/agents (ADMIN only)', async () => {
    const d = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/agents',
        payload: {
          name: 'Test Agent',
          type: 'TITLE',
          promptId: 'seed-prompt-title',
        },
      })
    );
    assert.ok(d.id);
    agentId = d.id;
  });

  it('PATCH /api/agents/:id (ADMIN only)', async () => {
    const d = data<{ name: string }>(
      await authInject(app, adminToken, {
        method: 'PATCH',
        url: `/api/agents/${agentId}`,
        payload: { name: 'Upd Agent' },
      })
    );
    assert.strictEqual(d.name, 'Upd Agent');
  });

  it('POST /api/agents by REVIEWER forbidden (403)', async () => {
    const res = await authInject(app, reviewerToken, {
      method: 'POST',
      url: '/api/agents',
      payload: { name: 'x', type: 'TITLE', promptId: 'seed-prompt-title' },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it('POST /api/agents/run triggers execution', async () => {
    const c = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/contents',
        payload: { title: `AR ${Date.now()}` },
      })
    );
    data(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/agents/run',
        payload: {
          agentType: 'TITLE',
          contentId: c.id,
          overrides: { count: 3 },
        },
      })
    );
  });
});

// ─── 6. Agent Runs ───────────────────────────────────────────────────────────

describe('6. Agent Runs', () => {
  let runId: string;

  before(async () => {
    const c = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/contents',
        payload: { title: `RUN ${Date.now()}` },
      })
    );
    const r = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/agents/run',
        payload: { agentType: 'TITLE', contentId: c.id },
      })
    );
    runId = r.id;
  });

  it('GET /api/agent-runs lists', async () => {
    const d = data<{ items: unknown[] }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/agent-runs',
      })
    );
    assert.ok(d.items.length >= 1);
  });

  it('GET /api/agent-runs supports filters', async () => {
    data(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/agent-runs?agentType=TITLE',
      })
    );
  });

  it('GET /api/agent-runs/:id returns one', async () => {
    const d = data<{ id: string; status: string }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/agent-runs/${runId}`,
      })
    );
    assert.strictEqual(d.id, runId);
  });

  it('POST /api/agent-runs/:id/retry', async () => {
    data(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/agent-runs/${runId}/retry`,
      })
    );
  });

  it('POST /api/agent-runs/:id/cancel', async () => {
    data(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/agent-runs/${runId}/cancel`,
      })
    );
  });
});

// ─── 7. Prompts ──────────────────────────────────────────────────────────────

describe('7. Prompts', () => {
  let promptId: string;

  it('GET /api/prompts lists', async () => {
    const d = data<{ items: { id: string; name: string }[] }>(
      await authInject(app, adminToken, { method: 'GET', url: '/api/prompts' })
    );
    assert.ok(d.items.length >= 4);
    promptId = d.items[0].id;
  });

  it('GET /api/prompts with agentType filter', async () => {
    const d = data<{ items: { agentType: string }[] }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/prompts?agentType=TITLE',
      })
    );
    d.items.forEach((p) => assert.strictEqual(p.agentType, 'TITLE'));
  });

  it('GET /api/prompts/:id returns one', async () => {
    const d = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/prompts/${promptId}`,
      })
    );
    assert.strictEqual(d.id, promptId);
  });

  it('POST /api/prompts (ADMIN only)', async () => {
    const d = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/prompts',
        payload: {
          name: 'T P',
          agentType: 'TITLE',
          template: 'Hello {{name}}',
        },
      })
    );
    assert.ok(d.id);
    promptId = d.id;
  });

  it('PATCH /api/prompts/:id (ADMIN only)', async () => {
    const d = data<{ name: string }>(
      await authInject(app, adminToken, {
        method: 'PATCH',
        url: `/api/prompts/${promptId}`,
        payload: { name: 'Upd P' },
      })
    );
    assert.strictEqual(d.name, 'Upd P');
  });

  it('POST /api/prompts by REVIEWER forbidden', async () => {
    const res = await authInject(app, reviewerToken, {
      method: 'POST',
      url: '/api/prompts',
      payload: { name: 'x', agentType: 'TITLE', template: 'test' },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it('POST /api/prompts/preview renders template', async () => {
    data(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/prompts/preview',
        payload: { promptId, variables: { name: 'World' } },
      })
    );
  });
});

// ─── 8. Accounts ─────────────────────────────────────────────────────────────

describe('8. Accounts', () => {
  let accountId: string;

  it('GET /api/accounts lists', async () => {
    const d = data<{ items: { id: string; platform: string }[] }>(
      await authInject(app, adminToken, { method: 'GET', url: '/api/accounts' })
    );
    assert.ok(d.items.length >= 4);
    accountId = d.items[0].id;
  });

  it('GET /api/accounts with platform filter', async () => {
    const d = data<{ items: { platform: string }[] }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/accounts?platform=WECHAT',
      })
    );
    d.items.forEach((a) => assert.strictEqual(a.platform, 'WECHAT'));
  });

  it('GET /api/accounts/:id returns detail', async () => {
    const d = data<{ id: string; accountName: string }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/accounts/${accountId}`,
      })
    );
    assert.strictEqual(d.id, accountId);
  });

  it('PATCH /api/accounts/:id (ADMIN/OPERATOR)', async () => {
    const d = data<{ accountName: string }>(
      await authInject(app, adminToken, {
        method: 'PATCH',
        url: `/api/accounts/${accountId}`,
        payload: { accountName: 'Upd Acct' },
      })
    );
    assert.strictEqual(d.accountName, 'Upd Acct');
  });

  it('POST /api/accounts/sync triggers sync', async () => {
    data(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/accounts/sync',
      })
    );
  });

  it('POST /api/accounts/bind/start initiates bind', async () => {
    const d = data<{ state: string; authUrl?: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/accounts/bind/start',
        payload: { platform: 'WECHAT' },
      })
    );
    assert.ok(d.state);
  });

  it('POST /api/accounts/:id/reauthorize', async () => {
    const d = data<{ state: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/accounts/${accountId}/reauthorize`,
      })
    );
    assert.ok(d.state);
  });

  it('POST /api/accounts/:id/sync-works', async () => {
    data(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/accounts/${accountId}/sync-works`,
      })
    );
  });

  it('POST /api/accounts/:id/sync-metrics', async () => {
    data(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/accounts/${accountId}/sync-metrics`,
      })
    );
  });
});

// ─── 9. Account Profiles ─────────────────────────────────────────────────────

describe('9. Account Profiles', () => {
  let accountId: string;

  before(async () => {
    const d = data<{ items: { id: string }[] }>(
      await authInject(app, adminToken, { method: 'GET', url: '/api/accounts' })
    );
    accountId = d.items[0].id;
  });

  it('GET /api/account-profiles returns profile (null allowed)', async () => {
    const b = body<{ positioning?: string }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/account-profiles?accountId=${accountId}`,
      })
    );
    assert.strictEqual(b.code, 0);
    // data may be null if no profile exists yet
  });

  it('PUT /api/account-profiles/:accountId creates/updates', async () => {
    const d = data<{ positioning: string; contentStyle: string }>(
      await authInject(app, adminToken, {
        method: 'PUT',
        url: `/api/account-profiles/${accountId}`,
        payload: { positioning: '高端', contentStyle: '专业' },
      })
    );
    assert.strictEqual(d.positioning, '高端');
    assert.strictEqual(d.contentStyle, '专业');
  });

  it('PUT /api/account-profiles/:accountId updates existing', async () => {
    const d = data<{ positioning: string; tone: string }>(
      await authInject(app, adminToken, {
        method: 'PUT',
        url: `/api/account-profiles/${accountId}`,
        payload: { positioning: '新定位', tone: '轻松' },
      })
    );
    assert.strictEqual(d.positioning, '新定位');
  });
});

// ─── 10. Reviews ─────────────────────────────────────────────────────────────

describe('10. Reviews', () => {
  let reviewId: string;
  let contentId: string;
  let versionId: string;

  before(async () => {
    const c = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/contents',
        payload: { title: `RV ${Date.now()}` },
      })
    );
    contentId = c.id;
    const versions = data<{ id: string }[]>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/contents/${c.id}/versions/generate`,
        payload: { platforms: ['WECHAT'] },
      })
    );
    versionId = versions[0].id;
  });

  it('GET /api/reviews/stats returns stats', async () => {
    const d = data<{
      total: number;
      pending: number;
      platformDistribution: unknown[];
    }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/reviews/stats',
      })
    );
    assert.ok(typeof d.total === 'number');
    assert.ok(typeof d.pending === 'number');
  });

  it('POST /api/reviews submits review', async () => {
    const d = data<{ id: string; status: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/reviews',
        payload: { contentId, versionId },
      })
    );
    assert.ok(d.id);
    reviewId = d.id;
  });

  it('GET /api/reviews lists', async () => {
    const d = data<{ items: unknown[] }>(
      await authInject(app, adminToken, { method: 'GET', url: '/api/reviews' })
    );
    assert.ok(d.items.length >= 1);
  });

  it('GET /api/reviews/:id returns one', async () => {
    const d = data<{ id: string; status: string; content: unknown }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/reviews/${reviewId}`,
      })
    );
    assert.strictEqual(d.id, reviewId);
  });

  it('POST /api/reviews/:id/approve (reviewer)', async () => {
    const d = data<{ status: string }>(
      await authInject(app, reviewerToken, {
        method: 'POST',
        url: `/api/reviews/${reviewId}/approve`,
      })
    );
    assert.strictEqual(d.status, 'APPROVED');
  });

  it('POST /api/reviews/:id/reject with comment', async () => {
    const r = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/reviews',
        payload: { contentId, versionId },
      })
    );
    const d = data<{ status: string; comment: string }>(
      await authInject(app, reviewerToken, {
        method: 'POST',
        url: `/api/reviews/${r.id}/reject`,
        payload: { comment: '修改' },
      })
    );
    assert.strictEqual(d.status, 'REJECTED');
    assert.strictEqual(d.comment, '修改');
  });

  it('operator cannot approve own review (403)', async () => {
    const c = data<{ id: string }>(
      await authInject(app, operatorToken, {
        method: 'POST',
        url: '/api/contents',
        payload: { title: `OWN ${Date.now()}` },
      })
    );
    const versions = data<{ id: string }[]>(
      await authInject(app, operatorToken, {
        method: 'POST',
        url: `/api/contents/${c.id}/versions/generate`,
        payload: { platforms: ['XIAOHONGSHU'] },
      })
    );
    const r = data<{ id: string }>(
      await authInject(app, operatorToken, {
        method: 'POST',
        url: '/api/reviews',
        payload: { contentId: c.id, versionId: versions[0]?.id },
      })
    );
    const res = await authInject(app, operatorToken, {
      method: 'POST',
      url: `/api/reviews/${r.id}/approve`,
    });
    assert.strictEqual(res.statusCode, 403);
  });
});

// ─── 11. Publishing ──────────────────────────────────────────────────────────

describe('11. Publishing', () => {
  let taskId: string;
  let wechatAccountId: string;
  let xiaohongshuAccountId: string;

  before(async () => {
    const accts = data<{ items: { id: string; platform: string }[] }>(
      await authInject(app, adminToken, { method: 'GET', url: '/api/accounts' })
    );
    const wechat = accts.items.find((a) => a.platform === 'WECHAT');
    const xhs = accts.items.find((a) => a.platform === 'XIAOHONGSHU');
    if (wechat) wechatAccountId = wechat.id;
    if (xhs) xiaohongshuAccountId = xhs.id;
  });

  it('GET /api/publishing/drafts returns drafts', async () => {
    const d = data<{ id: string }[]>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/publishing/drafts',
      })
    );
    assert.ok(Array.isArray(d));
  });

  it('GET /api/publishing/packages returns packages', async () => {
    const d = data<{ id: string }[]>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/publishing/packages',
      })
    );
    assert.ok(Array.isArray(d));
  });

  it('GET /api/publishing/packages with platform filter', async () => {
    data(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/publishing/packages?platform=WECHAT',
      })
    );
  });

  it('GET /api/publishing/tasks lists', async () => {
    const d = data<{ items: unknown[] }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/publishing/tasks',
      })
    );
    assert.ok(Array.isArray(d.items));
  });

  it('GET /api/publishing/tasks with status filter', async () => {
    data(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/publishing/tasks?status=PENDING',
      })
    );
  });

  it('POST /api/publishing/tasks creates task', async () => {
    const c = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/contents',
        payload: { title: `PUB ${Date.now()}` },
      })
    );
    const versions = data<{ id: string }[]>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/contents/${c.id}/versions/generate`,
        payload: { platforms: ['WECHAT'] },
      })
    );
    const d = data<{ id: string; status: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/publishing/tasks',
        payload: { versionId: versions[0].id, accountId: wechatAccountId },
      })
    );
    assert.ok(d.id);
    taskId = d.id;
  });

  it('GET /api/publishing/tasks/:id returns detail', async () => {
    if (!taskId) return; // skip if previous test failed
    const d = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/publishing/tasks/${taskId}`,
      })
    );
    assert.strictEqual(d.id, taskId);
  });

  it('POST /api/publishing/tasks/:id/publish executes', async () => {
    if (!taskId) return;
    data(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/publishing/tasks/${taskId}/publish`,
      })
    );
  });

  it('POST /api/publishing/tasks/:id/cancel cancels', async () => {
    const c = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/contents',
        payload: { title: `CNCL ${Date.now()}` },
      })
    );
    const versions = data<{ id: string }[]>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/contents/${c.id}/versions/generate`,
        payload: { platforms: ['XIAOHONGSHU'] },
      })
    );
    const t = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/publishing/tasks',
        payload: { versionId: versions[0].id, accountId: xiaohongshuAccountId },
      })
    );
    const d = data<{ status: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/publishing/tasks/${t.id}/cancel`,
      })
    );
    assert.strictEqual(d.status, 'CANCELLED');
  });
});

// ─── 12. IMA ─────────────────────────────────────────────────────────────────

describe('12. IMA', () => {
  let kbId: string;

  it('GET /api/ima/config returns config', async () => {
    const d = data<{ baseUrl: string; useMock: boolean }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/ima/config',
      })
    );
    assert.ok(typeof d.baseUrl === 'string');
  });

  it('PUT /api/ima/config (ADMIN only)', async () => {
    const d = data<{ baseUrl: string }>(
      await authInject(app, adminToken, {
        method: 'PUT',
        url: '/api/ima/config',
        payload: { baseUrl: 'https://ima.test.com', useMock: true },
      })
    );
    assert.strictEqual(d.baseUrl, 'https://ima.test.com');
  });

  it('PUT /api/ima/config by REVIEWER forbidden', async () => {
    const res = await authInject(app, reviewerToken, {
      method: 'PUT',
      url: '/api/ima/config',
      payload: { baseUrl: 'x' },
    });
    assert.strictEqual(res.statusCode, 403);
  });

  it('GET /api/ima/knowledge-bases lists', async () => {
    const d = data<{ id: string; name: string; enabled: boolean }[]>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/ima/knowledge-bases',
      })
    );
    assert.ok(d.length >= 2);
    kbId = d[0].id;
  });

  it('GET /api/ima/knowledge-bases with enabledOnly filter', async () => {
    const d = data<{ enabled: boolean }[]>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/ima/knowledge-bases?enabledOnly=true',
      })
    );
    d.forEach((kb) => assert.strictEqual(kb.enabled, true));
  });

  it('POST /api/ima/knowledge-bases/sync', async () => {
    data(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/ima/knowledge-bases/sync',
      })
    );
  });

  it('PATCH /api/ima/knowledge-bases/:id updates name', async () => {
    const d = data<{ name: string }>(
      await authInject(app, adminToken, {
        method: 'PATCH',
        url: `/api/ima/knowledge-bases/${kbId}`,
        payload: { name: 'Upd KB' },
      })
    );
    assert.strictEqual(d.name, 'Upd KB');
  });

  it('PATCH /api/ima/knowledge-bases/:id toggles enabled', async () => {
    const d = data<{ enabled: boolean }>(
      await authInject(app, adminToken, {
        method: 'PATCH',
        url: `/api/ima/knowledge-bases/${kbId}`,
        payload: { enabled: false },
      })
    );
    assert.strictEqual(d.enabled, false);
  });

  it('POST /api/ima/search searches KB', async () => {
    const c = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/contents',
        payload: { title: `IMA ${Date.now()}` },
      })
    );
    data(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/ima/search',
        payload: {
          query: '测试',
          contentId: c.id,
          limit: 3,
          knowledgeBaseId: kbId,
        },
      })
    );
  });
});

// ─── 13. Materials ───────────────────────────────────────────────────────────

describe('13. Materials', () => {
  let materialId: string;
  let contentId: string;

  before(async () => {
    const c = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/contents',
        payload: { title: `MAT ${Date.now()}` },
      })
    );
    contentId = c.id;
  });

  it('GET /api/materials/stats returns stats', async () => {
    const d = data<{ total: number; byType: unknown }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/materials/stats',
      })
    );
    assert.ok(typeof d.total === 'number');
  });

  it('POST /api/materials creates material', async () => {
    const d = data<{ id: string; name: string; type: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/materials',
        payload: { contentId, type: 'IMAGE', role: 'COVER', name: 'cover.png' },
      })
    );
    assert.ok(d.id);
    materialId = d.id;
  });

  it('GET /api/materials lists', async () => {
    const d = data<{ items: { id: string }[] }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/materials',
      })
    );
    assert.ok(d.items.length >= 1);
  });

  it('GET /api/materials/:id returns one', async () => {
    const d = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/materials/${materialId}`,
      })
    );
    assert.strictEqual(d.id, materialId);
  });

  it('PATCH /api/materials/:id updates', async () => {
    const d = data<{ name: string }>(
      await authInject(app, adminToken, {
        method: 'PATCH',
        url: `/api/materials/${materialId}`,
        payload: { name: 'upd.png' },
      })
    );
    assert.strictEqual(d.name, 'upd.png');
  });

  it('GET /api/contents/:id/materials lists content materials', async () => {
    const d = data<{ id: string }[]>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/contents/${contentId}/materials`,
      })
    );
    assert.ok(d.length >= 1);
  });

  it('POST /api/contents/:id/materials creates for content', async () => {
    const d = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/contents/${contentId}/materials`,
        payload: { type: 'VIDEO', role: 'BODY', name: 'vid.mp4' },
      })
    );
    assert.ok(d.id);
  });

  it('DELETE /api/materials/:id deletes', async () => {
    data(
      await authInject(app, adminToken, {
        method: 'DELETE',
        url: `/api/materials/${materialId}`,
      })
    );
    const res = await authInject(app, adminToken, {
      method: 'GET',
      url: `/api/materials/${materialId}`,
    });
    assert.strictEqual(res.statusCode, 404);
  });
});

// ─── 14. Analytics ───────────────────────────────────────────────────────────

describe('14. Analytics', () => {
  it('GET /api/analytics/aggregate returns metrics', async () => {
    const d = data<{
      metrics: { totalViews: number; totalLikes: number };
      top10: unknown[];
    }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/analytics/aggregate',
      })
    );
    assert.ok(typeof d.metrics.totalViews === 'number');
    assert.ok(Array.isArray(d.top10));
  });

  it('GET /api/analytics/contents/:contentId returns content analytics', async () => {
    const c = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/contents',
        payload: { title: `AN ${Date.now()}` },
      })
    );
    data(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/analytics/contents/${c.id}`,
      })
    );
  });

  it('POST /api/analytics/reports/generate generates report', async () => {
    const c = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/contents',
        payload: { title: `RPT ${Date.now()}` },
      })
    );
    data(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/analytics/reports/generate',
        payload: { contentId: c.id },
      })
    );
  });

  it('GET /api/analytics/reports lists', async () => {
    const d = data<{ items: { id: string }[] }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/analytics/reports',
      })
    );
    assert.ok(Array.isArray(d.items ?? d));
  });

  it('GET /api/analytics/reports/:id returns one', async () => {
    const d = data<{ items: { id: string }[] }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/analytics/reports',
      })
    );
    const list = Array.isArray(d) ? d : (d.items ?? []);
    if (list.length > 0) {
      data(
        await authInject(app, adminToken, {
          method: 'GET',
          url: `/api/analytics/reports/${list[0].id}`,
        })
      );
    }
  });

  it('POST /api/analytics/sync with invalid recordId', async () => {
    const res = await authInject(app, adminToken, {
      method: 'POST',
      url: '/api/analytics/sync',
      payload: { publishRecordId: 'none' },
    });
    const b = body(res);
    assert.ok(b.code !== 0); // expected to fail
  });
});

// ─── 15. Dashboard ───────────────────────────────────────────────────────────

describe('15. Dashboard', () => {
  it('GET /api/dashboard/stats returns stats', async () => {
    const d = data<{ pendingGenerate: number; pendingReview: number }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/dashboard/stats',
      })
    );
    assert.ok(typeof d.pendingGenerate === 'number');
    assert.ok(typeof d.pendingReview === 'number');
  });
});

// ─── 16. RBAC & Error Cases ──────────────────────────────────────────────────

describe('16. RBAC & Error Cases', () => {
  it('REVIEWER cannot create agents (403)', async () => {
    const res = await authInject(app, reviewerToken, {
      method: 'POST',
      url: '/api/agents',
      payload: { name: 'x', type: 'TITLE', promptId: 'seed-prompt-title' },
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(body(res).code, 40300);
  });

  it('NOT_FOUND non-existent content returns 404', async () => {
    const res = await authInject(app, adminToken, {
      method: 'GET',
      url: '/api/contents/none',
    });
    assert.strictEqual(res.statusCode, 404);
  });

  it('NOT_FOUND non-existent account returns 404', async () => {
    const res = await authInject(app, adminToken, {
      method: 'GET',
      url: '/api/accounts/none',
    });
    assert.strictEqual(res.statusCode, 404);
  });

  it('UNAUTHORIZED requests without token return 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/topics' });
    assert.strictEqual(res.statusCode, 401);
  });

  it('UNAUTHORIZED invalid token returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/topics',
      headers: { authorization: 'Bearer invalid' },
    });
    assert.strictEqual(res.statusCode, 401);
  });

  it('VALIDATION empty title on create content returns 400', async () => {
    const res = await authInject(app, adminToken, {
      method: 'POST',
      url: '/api/contents',
      payload: { title: '' },
    });
    assert.ok(res.statusCode === 400 || res.statusCode === 422);
  });

  it('VALIDATION missing fields on create material', async () => {
    const res = await authInject(app, adminToken, {
      method: 'POST',
      url: '/api/materials',
      payload: {},
    });
    assert.ok(res.statusCode === 400 || res.statusCode === 422);
  });

  it('NOT_FOUND non-existent review returns 404', async () => {
    const res = await authInject(app, adminToken, {
      method: 'GET',
      url: '/api/reviews/none',
    });
    assert.strictEqual(res.statusCode, 404);
  });

  it('NOT_FOUND non-existent version returns 404', async () => {
    const res = await authInject(app, adminToken, {
      method: 'GET',
      url: '/api/versions/none',
    });
    assert.strictEqual(res.statusCode, 404);
  });
});

// ─── 17. OAuth ───────────────────────────────────────────────────────────────

describe('17. OAuth', () => {
  it('GET /api/oauth/:platform/dev-authorize with valid state', async () => {
    const bind = data<{ state: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/accounts/bind/start',
        payload: { platform: 'WECHAT' },
      })
    );
    const res = await app.inject({
      method: 'GET',
      url: `/api/oauth/wechat/dev-authorize?state=${bind.state}`,
    });
    assert.ok(res.statusCode === 302 || res.statusCode === 303);
  });

  it('GET /api/oauth/:platform/callback with invalid state', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/oauth/wechat/callback?code=test&state=bad',
    });
    assert.ok(res.statusCode !== 500);
  });

  it('GET /api/oauth/:platform/dev-authorize with invalid platform returns 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/oauth/invalid/dev-authorize?state=test',
    });
    assert.strictEqual(res.statusCode, 404);
  });

  it('GET /api/oauth/:platform/callback without code fails validation', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/oauth/wechat/callback?state=test',
    });
    assert.ok(res.statusCode === 400 || res.statusCode === 422);
  });
});

// ─── 18. Combined Filters ────────────────────────────────────────────────────

describe('18. Combined Filters', () => {
  it('GET /api/accounts with platform + authStatus', async () => {
    const d = data<{ items: { platform: string; authStatus: string }[] }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/accounts?platform=WECHAT&authStatus=authorized',
      })
    );
    d.items.forEach((a) => {
      assert.strictEqual(a.platform, 'WECHAT');
      assert.strictEqual(a.authStatus, 'authorized');
    });
  });

  it('GET /api/agents with enabled filter', async () => {
    const d = data<{ items: { enabled: boolean }[] }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/agents?enabled=true',
      })
    );
    d.items.forEach((a) => assert.strictEqual(a.enabled, true));
  });

  it('GET /api/prompts with enabled filter', async () => {
    const d = data<{ items: { enabled: boolean }[] }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/prompts?enabled=true',
      })
    );
    d.items.forEach((p) => assert.strictEqual(p.enabled, true));
  });
});

// ─── 19. Full E2E Content Lifecycle ──────────────────────────────────────────

describe('19. Full E2E Content Lifecycle', () => {
  it('topic → content → versions → agent → review → publish → analytics', async () => {
    // 0. Get a real account ID
    const accts = data<{ items: { id: string; platform: string }[] }>(
      await authInject(app, adminToken, { method: 'GET', url: '/api/accounts' })
    );
    const xhsAccount = accts.items.find((a) => a.platform === 'XIAOHONGSHU');
    if (!xhsAccount) return;

    // 1. Create topic
    const topic = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/topics',
        payload: { title: `E2E ${Date.now()}` },
      })
    );

    // 2. Create content
    const content = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/contents',
        payload: { title: 'E2E Content', topicId: topic.id },
      })
    );

    // 3. Generate versions
    const versions = data<{ id: string; platform: string }[]>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/contents/${content.id}/versions/generate`,
        payload: { platforms: ['XIAOHONGSHU', 'DOUYIN'] },
      })
    );
    assert.ok(versions.length >= 1);

    // 4. Run AI agent (TITLE type, no required input fields)
    data(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/agents/run',
        payload: {
          agentType: 'TITLE',
          contentId: content.id,
          overrides: { count: 3 },
        },
      })
    );

    // 5. Submit for review
    const review = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/reviews',
        payload: { contentId: content.id, versionId: versions[0].id },
      })
    );

    // 6. Approve (as reviewer)
    data(
      await authInject(app, reviewerToken, {
        method: 'POST',
        url: `/api/reviews/${review.id}/approve`,
      })
    );

    // 7. Check review stats updated
    const stats = data<{ approved: number }>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/reviews/stats',
      })
    );
    assert.ok(typeof stats.approved === 'number');

    // 8. Create publish task
    const task = data<{ id: string }>(
      await authInject(app, adminToken, {
        method: 'POST',
        url: '/api/publishing/tasks',
        payload: { versionId: versions[0].id, accountId: xhsAccount.id },
      })
    );

    // 9. Get dashboard stats
    data(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/dashboard/stats',
      })
    );

    // 10. Aggregate analytics
    data(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/analytics/aggregate',
      })
    );

    // 11. Get version detail
    data(
      await authInject(app, adminToken, {
        method: 'GET',
        url: `/api/versions/${versions[0].id}`,
      })
    );

    // 12. Search knowledge base
    const kbs = data<{ id: string }[]>(
      await authInject(app, adminToken, {
        method: 'GET',
        url: '/api/ima/knowledge-bases',
      })
    );
    if (kbs.length > 0) {
      data(
        await authInject(app, adminToken, {
          method: 'POST',
          url: '/api/ima/search',
          payload: {
            query: 'E2E',
            contentId: content.id,
            knowledgeBaseId: kbs[0].id,
          },
        })
      );
    }

    // 13. Cancel task
    data(
      await authInject(app, adminToken, {
        method: 'POST',
        url: `/api/publishing/tasks/${task.id}/cancel`,
      })
    );
  });
});
