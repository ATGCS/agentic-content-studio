import '@/env';
import { z } from 'zod';
import { prisma, type AgentType, type Platform } from '@acs/db';
import { AppError, ErrorCodes } from '@acs/core';
import { runAgent } from '@acs/ai-runtime';

const agentTypeValues = [
  'TITLE',
  'TAG',
  'REWRITE',
  'BODY',
  'COVER_COPY',
  'REVIEW',
  'SUMMARY',
  'TOPIC',
  'IMAGE',
  'VIDEO_SCRIPT',
  'COMPETITOR',
] as const;

const AgentTypeSchema = z
  .string()
  .refine((v) => agentTypeValues.includes(v as AgentType), {
    message: 'Invalid agentType',
  });

export async function getAgentRunDetail(id: string) {
  const run = await prisma.agentRun.findUnique({
    where: { id },
    include: {
      agent: {
        include: {
          prompt: { select: { id: true, name: true, version: true } },
        },
      },
      content: { select: { id: true, title: true, status: true } },
      version: {
        select: {
          id: true,
          platform: true,
          title: true,
          account: { select: { id: true, accountName: true } },
        },
      },
    },
  });
  if (!run)
    throw new AppError(ErrorCodes.NOT_FOUND, 'agent run not found', 404);
  return run;
}

export async function retryAgentRun(id: string) {
  const oldRun = await prisma.agentRun.findUnique({
    where: { id },
    include: { agent: true },
  });
  if (!oldRun)
    throw new AppError(ErrorCodes.NOT_FOUND, 'agent run not found', 404);

  const input = normalizeRunInput(
    oldRun.input,
    oldRun.agent.type,
    oldRun.contentId,
    oldRun.versionId
  );

  const run = await runAgent({
    ...input,
    agentId: oldRun.agentId,
    agentType: oldRun.agent.type,
    contentId: oldRun.contentId,
    versionId: oldRun.versionId ?? undefined,
    overrides: input.overrides,
  });

  if (run?.id) {
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { input: { ...(input as object), retryOf: id } },
    });
  }

  return getAgentRunDetail(run!.id);
}

export async function cancelAgentRun(id: string) {
  const run = await prisma.agentRun.findUnique({ where: { id } });
  if (!run)
    throw new AppError(ErrorCodes.NOT_FOUND, 'agent run not found', 404);
  if (run.status !== 'PENDING' && run.status !== 'RUNNING') {
    throw new AppError(
      ErrorCodes.BAD_REQUEST,
      'agent run already finished',
      409
    );
  }

  return prisma.agentRun.update({
    where: { id },
    data: {
      status: 'FAILED',
      error: 'CANCELLED_BY_USER',
      finishedAt: new Date(),
    },
  });
}

function normalizeRunInput(
  input: unknown,
  agentType: AgentType,
  contentId: string,
  versionId: string | null
) {
  const parsed = z
    .object({
      agentId: z.string().optional(),
      agentType: AgentTypeSchema.optional(),
      contentId: z.string().optional(),
      versionId: z.string().optional(),
      accountId: z.string().optional(),
      overrides: z
        .object({
          count: z.number().optional(),
          platform: z.string().optional(),
        })
        .optional(),
    })
    .passthrough()
    .safeParse(input ?? {});
  const value = parsed.success ? parsed.data : {};

  return {
    agentId: value.agentId,
    agentType: (value.agentType ?? agentType) as AgentType,
    contentId: value.contentId ?? contentId,
    versionId: value.versionId ?? versionId ?? undefined,
    accountId: value.accountId,
    overrides: value.overrides
      ? {
          count: value.overrides.count,
          platform: value.overrides.platform as Platform | undefined,
        }
      : undefined,
  };
}
