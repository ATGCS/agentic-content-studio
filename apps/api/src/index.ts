import './env.js';
import { buildApp } from './app.js';

const port = parseInt(process.env.API_PORT ?? '3002', 10);

async function main() {
  const app = await buildApp();
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`API http://localhost:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
