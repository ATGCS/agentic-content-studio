import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '@acs/db';
import { runImaSearch } from '@acs/ai-runtime';

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

const content = await prisma.content.findFirst({
  orderBy: { updatedAt: 'desc' },
});
if (!content) {
  console.log('无内容');
  process.exit(0);
}

process.env.DEBUG_AGENT = 'true';
const result = await runImaSearch(content.id, { platform: 'WECHAT' });
console.log('\n--- 写入 prompt 的 imaSummary ---\n');
console.log(result.log.resultSummary);

await prisma.$disconnect();
