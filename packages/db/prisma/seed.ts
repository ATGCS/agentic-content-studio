import { AgentType, PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@acs.local' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@acs.local',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'operator@acs.local' },
    update: {},
    create: {
      name: 'Operator',
      email: 'operator@acs.local',
      passwordHash: await bcrypt.hash('operator123', 10),
      role: UserRole.OPERATOR,
    },
  });

  await prisma.user.upsert({
    where: { email: 'reviewer@acs.local' },
    update: {},
    create: {
      name: 'Reviewer',
      email: 'reviewer@acs.local',
      passwordHash: await bcrypt.hash('reviewer123', 10),
      role: UserRole.REVIEWER,
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'model.default' },
    update: {},
    create: {
      key: 'model.default',
      value: { provider: 'deepseek', model: 'deepseek-chat' },
      description: 'Default LLM',
    },
  });

  const titlePrompt = await prisma.prompt.upsert({
    where: { id: 'seed-prompt-title' },
    update: {},
    create: {
      id: 'seed-prompt-title',
      name: 'Title Agent V1',
      agentType: AgentType.TITLE,
      version: 'v1',
      template:
        '你是内容标题专家。选题：{{topicTitle}}。账号风格：{{accountStyle}}。IMA参考：{{imaSummary}}。请生成{{count}}个标题，以JSON返回：{"titles":["..."]}',
      enabled: true,
    },
  });

  const bodyPrompt = await prisma.prompt.upsert({
    where: { id: 'seed-prompt-body' },
    update: {},
    create: {
      id: 'seed-prompt-body',
      name: 'Body Agent V1',
      agentType: AgentType.BODY,
      version: 'v1',
      template:
        '根据选题「{{topicTitle}}」与参考「{{imaSummary}}」撰写正文。以JSON返回：{"body":"markdown内容"}',
      enabled: true,
    },
  });

  const rewritePrompt = await prisma.prompt.upsert({
    where: { id: 'seed-prompt-rewrite' },
    update: {},
    create: {
      id: 'seed-prompt-rewrite',
      name: 'Rewrite Agent V1',
      agentType: AgentType.REWRITE,
      version: 'v1',
      template:
        '将内容改写为{{platform}}平台版本。标题：{{title}}。正文：{{body}}。以JSON返回：{"title":"","body":"","coverText":"","tags":[]}',
      enabled: true,
    },
  });

  const reviewPrompt = await prisma.prompt.upsert({
    where: { id: 'seed-prompt-review' },
    update: {},
    create: {
      id: 'seed-prompt-review',
      name: 'Review Agent V1',
      agentType: AgentType.REVIEW,
      version: 'v1',
      template:
        '审核以下内容风险。标题：{{title}}。正文：{{body}}。JSON：{"passed":true,"checks":[],"riskLevel":"low"}',
      enabled: true,
    },
  });

  const summaryPrompt = await prisma.prompt.upsert({
    where: { id: 'seed-prompt-summary' },
    update: {},
    create: {
      id: 'seed-prompt-summary',
      name: 'Summary Agent V1',
      agentType: AgentType.SUMMARY,
      version: 'v1',
      template:
        '根据内容数据生成复盘。JSON：{"summary":"","insights":[],"suggestions":[]}',
      enabled: true,
    },
  });

  const prompts = [
    {
      id: 'seed-agent-title',
      type: AgentType.TITLE,
      name: 'Title Agent',
      promptId: titlePrompt.id,
    },
    {
      id: 'seed-agent-body',
      type: AgentType.BODY,
      name: 'Body Agent',
      promptId: bodyPrompt.id,
    },
    {
      id: 'seed-agent-rewrite',
      type: AgentType.REWRITE,
      name: 'Rewrite Agent',
      promptId: rewritePrompt.id,
    },
    {
      id: 'seed-agent-review',
      type: AgentType.REVIEW,
      name: 'Review Agent',
      promptId: reviewPrompt.id,
    },
    {
      id: 'seed-agent-summary',
      type: AgentType.SUMMARY,
      name: 'Summary Agent',
      promptId: summaryPrompt.id,
    },
  ];

  for (const a of prompts) {
    await prisma.agent.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        name: a.name,
        type: a.type,
        promptId: a.promptId,
        enabled: true,
      },
    });
  }

  console.log('Seed OK. Admin:', admin.email, '/ admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
