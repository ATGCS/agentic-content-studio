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

for (const query of ['', '标题', '内容', '智能运营', 'AAA']) {
  const res = await imaRequest(cfg, 'openapi/wiki/v1/search_knowledge', {
    query,
    knowledge_base_id: kb!.externalId,
    cursor: '',
    limit: 10,
  });
  const data = (res as { data?: { info_list?: unknown[] } }).data;
  console.log(
    'query:',
    JSON.stringify(query),
    'count:',
    data?.info_list?.length ?? 0
  );
  if (data?.info_list?.length) {
    console.log(JSON.stringify(data.info_list[0], null, 2));
  }
}

await prisma.$disconnect();
