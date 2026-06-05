import { prisma, type AgentType, type Platform } from '@acs/db';
import { getModelGateway } from './model-gateway.js';
import { parseOutput } from './parsers.js';
import {
  loadPromptByType,
  loadPromptForAgent,
  renderTemplate,
} from './prompt-engine.js';
import { buildContext } from './tool-engine.js';

export interface RunAgentInput {
  agentId?: string;
  agentType: AgentType;
  contentId: string;
  versionId?: string;
  accountId?: string;
  overrides?: { count?: number; platform?: Platform };
}

export async function runAgent(input: RunAgentInput) {
  const { agent, prompt } = input.agentId
    ? await loadPromptForAgent(input.agentId)
    : await loadPromptByType(input.agentType);

  const variables = await buildContext({
    contentId: input.contentId,
    accountId: input.accountId,
    platform: input.overrides?.platform,
    count: input.overrides?.count,
  });

  const run = await prisma.agentRun.create({
    data: {
      agentId: agent.id,
      contentId: input.contentId,
      versionId: input.versionId,
      input: input as object,
      model: agent.model,
      promptVersion: prompt.version,
      status: 'RUNNING',
    },
  });

  try {
    const userPrompt = renderTemplate(prompt.template, variables);
    const gateway = getModelGateway();
    const { content: raw } = await gateway.chat({
      model: agent.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful content operations assistant. Respond in JSON only.',
        },
        { role: 'user', content: userPrompt },
      ],
    });

    const output = parseOutput(agent.type, raw);

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        output: output as object,
        finishedAt: new Date(),
      },
    });

    await applyOutput(agent.type, input.contentId, input.versionId, output);

    return prisma.agentRun.findUnique({ where: { id: run.id } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', error: message, finishedAt: new Date() },
    });
    throw err;
  }
}

async function applyOutput(
  type: AgentType,
  contentId: string,
  versionId: string | undefined,
  output: unknown
) {
  if (type === 'TITLE') {
    const o = output as { titles: string[] };
    if (o.titles[0]) {
      await prisma.content.update({
        where: { id: contentId },
        data: { title: o.titles[0], aiGenerated: true },
      });
    }
  }
  if (type === 'BODY') {
    const o = output as { body: string };
    await prisma.content.update({
      where: { id: contentId },
      data: { body: o.body, aiGenerated: true, status: 'PENDING_REVIEW' },
    });
  }
  if (type === 'REWRITE' && versionId) {
    const o = output as {
      title: string;
      body: string;
      coverText?: string;
      tags?: string[];
    };
    await prisma.contentVersion.update({
      where: { id: versionId },
      data: {
        title: o.title,
        body: o.body,
        coverText: o.coverText,
        tags: o.tags ?? [],
        status: 'PENDING_REVIEW',
      },
    });
  }
}

export async function runAgentByType(
  type: AgentType,
  input: Omit<RunAgentInput, 'agentType'>
) {
  return runAgent({ ...input, agentType: type });
}

export async function orchestrateGenerate(
  contentId: string,
  accountId?: string,
  platforms: Platform[] = ['XIAOHONGSHU']
) {
  await prisma.content.update({
    where: { id: contentId },
    data: { status: 'GENERATING' },
  });

  const { runImaSearch } = await import('./tool-engine.js');
  const content = await prisma.content.findUnique({ where: { id: contentId } });
  await runImaSearch(contentId, content?.title ?? '内容运营');

  await runAgentByType('TITLE', {
    contentId,
    accountId,
    overrides: { count: 5 },
  });
  await runAgentByType('BODY', { contentId, accountId });

  const versions = [];
  for (const platform of platforms) {
    let version = await prisma.contentVersion.findFirst({
      where: { contentId, platform },
    });
    if (!version) {
      version = await prisma.contentVersion.create({
        data: { contentId, platform, accountId, status: 'DRAFT' },
      });
    }
    await runAgentByType('REWRITE', {
      contentId,
      versionId: version.id,
      accountId,
      overrides: { platform },
    });
    versions.push(version);
  }

  await prisma.content.update({
    where: { id: contentId },
    data: { status: 'PENDING_REVIEW' },
  });

  return versions;
}

export async function listAgentRuns(query: {
  contentId?: string;
  status?: string;
}) {
  return prisma.agentRun.findMany({
    where: {
      contentId: query.contentId,
      status: query.status as 'SUCCESS' | undefined,
    },
    orderBy: { startedAt: 'desc' },
    take: 50,
    include: { agent: true },
  });
}
