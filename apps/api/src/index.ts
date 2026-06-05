import './env.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { registerResponseHelpers } from './plugins/response.js';
import { registerAuth } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { topicRoutes } from './routes/topics.js';
import { contentRoutes } from './routes/contents.js';
import { agentRoutes } from './routes/agents.js';
import { accountRoutes } from './routes/accounts.js';

const port = parseInt(process.env.API_PORT ?? '3002', 10);

async function main() {
  const app = Fastify({ logger: true });

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
      await agentRoutes(api);
      await accountRoutes(api);
    },
    { prefix: '/api' }
  );

  app.get('/health', async () => ({ ok: true }));

  await app.listen({ port, host: '0.0.0.0' });
  console.log(`API http://localhost:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
