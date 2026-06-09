import { prisma } from '../src/index.js';

const log = await prisma.imaSearchLog.findFirst({
  orderBy: { createdAt: 'desc' },
});
console.log('query:', log?.query);
console.log('summary:', log?.resultSummary);
console.log('raw:', JSON.stringify(log?.rawResult, null, 2));
await prisma.$disconnect();
