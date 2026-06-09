import { prisma } from '@acs/db';
import type { WorkflowNodeHandler } from '../engine/types.js';

export const contentSetStatusNode: WorkflowNodeHandler = async (ctx, input) => {
  const status = String(input.status ?? '');
  if (!status) throw new Error('content.setStatus requires status');

  await prisma.content.update({
    where: { id: ctx.contentId },
    data: { status: status as never },
  });

  return { output: { contentStatus: status } };
};
