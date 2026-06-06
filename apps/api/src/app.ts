import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { registerResponseHelpers } from './plugins/response.js';
import { registerAuth } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { topicRoutes } from './routes/topics.js';
import { contentRoutes } from './routes/contents.js';
import { materialRoutes, registerContentMaterialRoutes } from './routes/materials.js';
import { agentRoutes } from './routes/agents.js';
import { accountRoutes, oauthRoutes } from './routes/accounts.js';
import { imaRoutes } from './routes/ima.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, { origin: true });
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  });

  registerResponseHelpers(app);
  registerAuth(app);

  await app.register(
    async (api) => {
      await authRoutes(api);
      await topicRoutes(api);
      await contentRoutes(api);
      registerContentMaterialRoutes(api);
      await materialRoutes(api);
      await agentRoutes(api);
      await accountRoutes(api);
      await imaRoutes(api);
    },
    { prefix: '/api' }
  );

  await app.register(
    async (api) => {
      await oauthRoutes(api);
    },
    { prefix: '/api' }
  );

  app.get('/health', async () => ({ ok: true }));

  return app;
}
