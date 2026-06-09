import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '@acs/db';
import { getImaConfig } from '../src/config.js';
import { imaRequest } from '../src/client.js';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..'
);
const envFile = path.join(repoRoot, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const kb = await prisma.imaKnowledgeBase.findFirst({
  where: { enabled: true },
  orderBy: [{ isDefault: 'desc' }, { syncedAt: 'desc' }],
});
const cfg = await getImaConfig();
const kbId = kb!.externalId;

const paths = [
  [
    'openapi/wiki/v1/search_knowledge_base',
    { query: '', cursor: '', limit: 20 },
  ],
  [
    'openapi/wiki/v1/search_knowledge',
    { query: '', knowledge_base_id: kbId, cursor: '', limit: 20 },
  ],
  [
    'openapi/wiki/v1/get_knowledge_list',
    { knowledge_base_id: kbId, cursor: '', limit: 20 },
  ],
  [
    'openapi/wiki/v1/list_knowledge',
    { knowledge_base_id: kbId, cursor: '', limit: 20 },
  ],
];

for (const [p, body] of paths) {
  try {
    const res = await imaRequest(cfg, p, body as Record<string, unknown>);
    console.log('\n===', p, '===');
    console.log(JSON.stringify(res, null, 2).slice(0, 1500));
  } catch (e) {
    console.log('\n===', p, 'FAILED ===', e instanceof Error ? e.message : e);
  }
}

await prisma.$disconnect();
