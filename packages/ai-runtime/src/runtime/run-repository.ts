import { prisma } from '@acs/db';
import type { AgentRunQuery, RunAgentInput } from './types.js';

export class AgentRunRepository {
  create(input: {
    agentId: string;
    contentId: string;
    versionId?: string;
    runInput: RunAgentInput;
    model?: string;
    promptVersion?: string;
  }) {
    return prisma.agentRun.create({
      data: {
        agentId: input.agentId,
        contentId: input.contentId,
        versionId: input.versionId,
        input: input.runInput as object,
        model: input.model,
        promptVersion: input.promptVersion,
        status: 'RUNNING',
      },
    });
  }

  markSuccess(id: string, output: unknown) {
    return prisma.agentRun.update({
      where: { id },
      data: {
        status: 'SUCCESS',
        output: output as object,
        finishedAt: new Date(),
      },
    });
  }

  markFailed(id: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return prisma.agentRun.update({
      where: { id },
      data: { status: 'FAILED', error: message, finishedAt: new Date() },
    });
  }

  findById(id: string) {
    return prisma.agentRun.findUnique({ where: { id } });
  }

  list(query: AgentRunQuery) {
    const where: {
      contentId?: string;
      status?: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
      agent?: { type: AgentRunQuery['agentType'] };
    } = {};
    if (query.contentId) where.contentId = query.contentId;
    if (query.status) {
      where.status = query.status as 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
    }
    if (query.agentType) where.agent = { type: query.agentType };

    return prisma.agentRun.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 50,
      include: {
        agent: true,
        content: true,
        version: { include: { account: true } },
      },
    });
  }
}

export const agentRunRepository = new AgentRunRepository();

export function listAgentRuns(query: AgentRunQuery) {
  return agentRunRepository.list(query);
}
