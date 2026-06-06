import type { InjectOptions, LightMyRequestResponse } from 'light-my-request';
import type { FastifyInstance } from 'fastify';

export type ApiBody<T = unknown> = {
  code: number;
  message: string;
  data: T;
};

export async function parseJson<T = unknown>(
  res: LightMyRequestResponse
): Promise<ApiBody<T>> {
  return res.json() as Promise<ApiBody<T>>;
}

export function expectOk<T>(body: ApiBody<T>): T {
  if (body.code !== 0) {
    throw new Error(`expected code 0, got ${body.code}: ${body.message}`);
  }
  return body.data;
}

export async function login(
  app: FastifyInstance,
  email: string,
  password: string
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  });
  const body = await parseJson<{ token: string }>(res);
  return expectOk(body).token;
}

export function authInject(
  app: FastifyInstance,
  token: string,
  opts: InjectOptions
) {
  return app.inject({
    ...opts,
    headers: {
      ...opts.headers,
      authorization: `Bearer ${token}`,
    },
  });
}
