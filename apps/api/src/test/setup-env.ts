import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(apiDir, '../../../..');
const testDb = resolve(repoRoot, 'packages/db/prisma/test.db').replace(
  /\\/g,
  '/'
);

process.env.DATABASE_URL = `file:${testDb}`;
process.env.JWT_SECRET = 'test-secret';
