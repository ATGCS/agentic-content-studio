import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '@acs/db';
import { buildImaSearchQuery, searchAndLog } from '../src/index.js';

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
  include: { topic: true },
});
if (!content) {
  console.log('无内容记录');
  process.exit(0);
}

const query = buildImaSearchQuery({
  title: content.title,
  summary: content.summary,
  topicTitle: content.topic?.title,
  topicDesc: content.topic?.description,
  platform: 'WECHAT',
});

console.log('内容:', content.title);
console.log('检索词:', query);
console.log('---');

const result = await searchAndLog(content.id, query, { limit: 5 });
console.log('模式:', result.mode);
console.log('命中:', result.items.length);
console.log('\nimaSummary:\n', result.log.resultSummary);
console.log('\n原始响应 (截断):');
console.log(JSON.stringify(result.log.rawResult, null, 2).slice(0, 2000));

await prisma.$disconnect();
