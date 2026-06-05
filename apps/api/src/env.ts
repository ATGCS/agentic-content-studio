import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(apiDir, '../../..');

config({ path: resolve(repoRoot, '.env') });

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('./')) {
  const dbPath = resolve(repoRoot, 'packages/db/prisma/dev.db').replace(
    /\\/g,
    '/'
  );
  // Prisma resolves file: URLs relative to schema dir; actual DB is at prisma/dev.db next to schema
  process.env.DATABASE_URL = `file:${dbPath}`;
}
