import { prisma } from '@acs/db';
import { assertTransition } from '@acs/content-center';
import type { WorkflowNodeHandler } from '../engine/types.js';
import type { ContentStatus } from '@acs/db';

export const contentSetStatusNode: WorkflowNodeHandler = async (ctx, input) => {
  const status = String(input.status ?? '');
  if (!status) throw new Error('content.setStatus requires status');

  const current = await prisma.content.findUnique({
    where: { id: ctx.contentId },
    select: { status: true },
  });
  if (current) {
    assertTransition(current.status as ContentStatus, status as ContentStatus);
  }

  await prisma.content.update({
    where: { id: ctx.contentId },
    data: { status: status as never },
  });

  return { output: { contentStatus: status } };
};
