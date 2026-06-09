import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getImaConfig } from '../ima-provider/src/config.js';
import { imaRequest } from '../ima-provider/src/client.js';
import { prisma } from '../db/src/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
config({ path: path.join(repoRoot, '.env') });

const kb = await prisma.imaKnowledgeBase.findFirst({
  where: { enabled: true },
  orderBy: [{ isDefault: 'desc' }, { syncedAt: 'desc' }],
});
if (!kb) {
  console.log('no kb');
  process.exit(0);
}

const cfg = await getImaConfig();
const res = await imaRequest(cfg, 'openapi/wiki/v1/search_knowledge', {
  query: 'AAA 幕后 内容运营',
  knowledge_base_id: kb.externalId,
  cursor: '',
  limit: 5,
});
console.log(JSON.stringify(res, null, 2));
await prisma.$disconnect();
