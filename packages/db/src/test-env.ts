import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.env.DATABASE_URL = `file:${resolve(pkgRoot, 'prisma/test.db').replace(/\\/g, '/')}`;
