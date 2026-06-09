import type { FastifyInstance } from 'fastify';

const MAX_BODY_LOG = 800;

function formatTime(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

function truncate(v: unknown): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (!s || s.length <= MAX_BODY_LOG) return s ?? '';
  return s.slice(0, MAX_BODY_LOG) + `… (truncated, total ${s.length} chars)`;
}

export function registerRequestLogger(app: FastifyInstance) {
  // ── Capture response body ──
  app.addHook('onSend', async (_request, _reply, payload) => {
    if (typeof payload === 'string') {
      (_request as any).__responseBody = payload;
    }
  });

  // ── Log incoming request with full details ──
  app.addHook('onRequest', async (request) => {
    const method = request.method.padEnd(6);
    const url = request.url;
    const time = formatTime();

    console.log(`\n╔══ [${time}] → ${method} ${url}`);

    // Query params
    const q = request.query as Record<string, string>;
    if (q && Object.keys(q).length > 0) {
      console.log(`║  query: ${JSON.stringify(q)}`);
    }

    // Headers (key ones)
    const ct = request.headers['content-type'];
    const auth = request.headers.authorization
      ? '✓ (Bearer token)'
      : '✗ (none)';
    console.log(
      `║  headers: content-type=${ct ?? '(not set)'}  authorization=${auth}`
    );
  });

  // ── Log request body (parsed after onRequest) ──
  app.addHook('preHandler', async (request) => {
    const body = request.body;
    if (
      body &&
      typeof body === 'object' &&
      Object.keys(body as object).length > 0
    ) {
      console.log(`║  body: ${truncate(body)}`);
    }
  });

  // ── Log outgoing response with full details ──
  app.addHook('onResponse', async (request, reply) => {
    const method = request.method.padEnd(6);
    const url = request.url;
    const status = reply.statusCode;
    const duration = reply.elapsedTime.toFixed(0);
    const time = formatTime();
    const statusStr =
      status >= 400 ? `\x1b[31m${status}\x1b[0m` : `\x1b[32m${status}\x1b[0m`;

    console.log(`║  response: → ${statusStr} (${duration}ms)`);

    const resBody = (request as any).__responseBody;
    if (resBody) {
      console.log(`╚══ body: ${truncate(resBody)}`);
    } else {
      console.log(`╚══`);
    }
  });
}
