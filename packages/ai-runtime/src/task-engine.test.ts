import '@acs/db/test-env';
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert';
import { prisma } from '@acs/db';
import { runAgent, runAgentByType } from './task-engine.js';

describe('runAgentByType', () => {
  let contentId: string;
  let titleAgentId: string;
  let titleAgentEnabled: boolean;

  before(async () => {
    const admin = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@acs.local' },
    });
    const content = await prisma.content.create({
      data: {
        title: 'agent-test',
        createdBy: admin.id,
        status: 'DRAFT',
      },
    });
    contentId = content.id;
    const titleAgent = await prisma.agent.findFirstOrThrow({ where: { type: 'TITLE' } });
    titleAgentId = titleAgent.id;
    titleAgentEnabled = titleAgent.enabled;
  });

  after(async () => {
    await prisma.agent.update({
      where: { id: titleAgentId },
      data: { enabled: titleAgentEnabled },
    });
  });

  it('TITLE agent returns success run', async () => {
    const run = await runAgentByType('TITLE', {
      contentId,
      overrides: { count: 2 },
    });
    assert.ok(run);
    assert.strictEqual(run.status, 'SUCCESS');
    assert.ok(run.output);
  });

  it('does not run disabled agents', async () => {
    await prisma.agent.update({
      where: { id: titleAgentId },
      data: { enabled: false },
    });

    await assert.rejects(
      () => runAgentByType('TITLE', { contentId }),
      /no enabled agent for type TITLE/
    );

    await prisma.agent.update({
      where: { id: titleAgentId },
      data: { enabled: true },
    });
  });

  it('marks run failed when prompt variables are missing', async () => {
    const prompt = await prisma.prompt.create({
      data: {
        name: 'missing-var-test',
        agentType: 'TITLE',
        template: '{{notProvided}}',
        variables: ['notProvided'],
      },
    });
    const agent = await prisma.agent.create({
      data: {
        name: 'missing-var-agent',
        type: 'TITLE',
        promptId: prompt.id,
        model: 'mock',
      },
    });

    await assert.rejects(
      () => runAgent({ agentId: agent.id, agentType: 'TITLE', contentId }),
      /missing prompt variables: notProvided/
    );

    const run = await prisma.agentRun.findFirstOrThrow({
      where: { agentId: agent.id },
      orderBy: { startedAt: 'desc' },
    });
    assert.strictEqual(run.status, 'FAILED');
    assert.match(run.error ?? '', /missing prompt variables: notProvided/);
  });
});
