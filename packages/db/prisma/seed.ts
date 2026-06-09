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

  const defaultModel =
    process.env.AGNES_MODEL?.trim() ||
    (process.env.AGNES_API_KEY?.trim() ? 'agnes-2.0-flash' : 'deepseek-chat');
  const defaultProvider = process.env.AGNES_API_KEY?.trim()
    ? 'agnes'
    : 'deepseek';

  await prisma.systemConfig.upsert({
    where: { key: 'model.default' },
    update: {
      value: { provider: defaultProvider, model: defaultModel },
    },
    create: {
      key: 'model.default',
      value: { provider: defaultProvider, model: defaultModel },
      description: 'Default LLM',
    },
  });

  await prisma.systemConfig.upsert({
    where: { key: 'ima.config' },
    update: {},
    create: {
      key: 'ima.config',
      value: {
        clientId: process.env.IMA_OPENAPI_CLIENTID ?? '',
        apiKey: process.env.IMA_OPENAPI_APIKEY ?? process.env.IMA_API_KEY ?? '',
        baseUrl: process.env.IMA_BASE_URL ?? 'https://ima.qq.com',
        useMock: process.env.USE_MOCK_IMA !== 'false',
      },
      description: 'IMA OpenAPI credentials and mode',
    },
  });

  const useMockIma =
    process.env.USE_MOCK_IMA === 'true' ||
    !(
      process.env.IMA_OPENAPI_CLIENTID?.trim() &&
      (process.env.IMA_OPENAPI_APIKEY?.trim() ||
        process.env.IMA_API_KEY?.trim())
    );

  if (useMockIma) {
    const mockKbs = [
      {
        externalId: 'mock-kb-default',
        name: 'Mock 默认知识库',
        description: '开发环境模拟知识库',
        isDefault: true,
      },
      {
        externalId: 'mock-kb-industry',
        name: 'Mock 行业参考库',
        description: '开发环境模拟知识库',
        isDefault: false,
      },
    ];
    for (const kb of mockKbs) {
      await prisma.imaKnowledgeBase.upsert({
        where: { externalId: kb.externalId },
        update: { name: kb.name, description: kb.description },
        create: {
          externalId: kb.externalId,
          name: kb.name,
          description: kb.description,
          isDefault: kb.isDefault,
          enabled: true,
          syncedAt: new Date(),
        },
      });
    }
  } else {
    await prisma.imaKnowledgeBase.deleteMany({
      where: {
        externalId: { startsWith: 'mock-kb-' },
      },
    });
  }

  const titleTemplate = `# 任务
为本次内容生成 {{count}} 个可发布标题。

# 输入
- 选题/主题：{{topicTitle}}
- 账号风格：{{accountStyle}}
- 方法论参考（仅提炼钩子套路，禁止照搬原文）：
{{imaSummary}}

# 优化目标（按优先级）
1. 点击率：让人产生「必须点开」的冲动
2. 停留好奇：标题留缺口或具体承诺，但不标题党
3. 匹配账号调性

# 写法要求
- 可用：数字+利益、冲突对立、痛点共鸣、反常识、具体场景
- 禁止：空洞形容词堆砌、与正文无关的噱头、抄袭知识库原句

# 输出
仅 JSON：{"titles":["标题1","标题2",...]}`;

  const titlePrompt = await prisma.prompt.upsert({
    where: { id: 'seed-prompt-title' },
    update: { template: titleTemplate },
    create: {
      id: 'seed-prompt-title',
      name: 'Title Agent V1',
      agentType: AgentType.TITLE,
      version: 'v1',
      template: titleTemplate,
      enabled: true,
    },
  });

  const bodyTemplate = `# 任务
撰写可发布的正文（Markdown）。

# 输入
- 选题：{{topicTitle}}
- 已定标题：{{title}}
- 方法论参考（仅借鉴结构与节奏，禁止大段复制）：
{{imaSummary}}

# 优化目标（按优先级）
1. 完读率/完播率：开头 3 秒/首段必须抓住注意力
2. 防划走：每 2–3 段有小钩子、转折或信息增量
3. 互动：适当提问、清单、可收藏的结构化信息
4. 手机阅读：短段、小标题、列表，避免大 wall of text

# 输出
仅 JSON：{"body":"markdown正文"}`;

  const bodyPrompt = await prisma.prompt.upsert({
    where: { id: 'seed-prompt-body' },
    update: { template: bodyTemplate },
    create: {
      id: 'seed-prompt-body',
      name: 'Body Agent V1',
      agentType: AgentType.BODY,
      version: 'v1',
      template: bodyTemplate,
      enabled: true,
    },
  });

  const rewriteTemplate = `# 任务
将母稿改写为 **{{platform}}** 平台独立版本（标题、正文、封面文案、标签均须重写，不可只替换几个词）。

# 输入
- 母稿标题：{{title}}
- 母稿正文：{{body}}
- 平台版本标题（如有）：{{versionTitle}}
- 平台版本正文（如有）：{{versionBody}}

# 平台侧重点（{{platform}}）
- 标题：Feed 流里 1 秒抓点击
- 正文：该平台用户习惯的篇幅、语气、排版（emoji/分段/话题感等）
- 封面文案 coverText：适合叠在封面上的 1 行主文案 + 可选副文案，提升点击率
- 标签 tags：搜索与推荐兼顾

# 优化目标
点击率 > 完读/完播 > 评论收藏转发

# 输出
仅 JSON：{"title":"","body":"","coverText":"","tags":[]}`;

  const rewritePrompt = await prisma.prompt.upsert({
    where: { id: 'seed-prompt-rewrite' },
    update: { template: rewriteTemplate },
    create: {
      id: 'seed-prompt-rewrite',
      name: 'Rewrite Agent V1',
      agentType: AgentType.REWRITE,
      version: 'v1',
      template: rewriteTemplate,
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

  const imageTemplate = `# 任务
为 **{{platform}}** 生成 **{{imageRole}}** 的 AI 绘图提示词（供 Seedream 出图）。

# 输入
- 标题：{{title}}
- 摘要：{{summary}}
- 封面文案：{{versionCoverText}}
- 正文摘要：{{body}}
- 账号风格：{{accountStyle}}
- 视觉方法论参考（仅借鉴构图/色彩套路，禁止复刻知识库配图）：
{{imaSummary}}

# 优化目标
1. 点击率：Feed 缩略图一眼看懂主题与情绪
2. 划走停留：主体突出、对比清晰、有视觉焦点
3. 可叠字：构图预留标题区域，勿主体铺满

# 要求
- 提示词 ≤300 字，描述主体、场景、光线、风格、画幅（如竖版 3:4）
- 禁止侵权、真人无授权肖像

# 输出
仅 JSON：{"prompt":"绘图提示词","style":"风格","aspectRatio":"1728x2304"}`;

  const imagePrompt = await prisma.prompt.upsert({
    where: { id: 'seed-prompt-image' },
    update: { template: imageTemplate },
    create: {
      id: 'seed-prompt-image',
      name: 'Image Agent V1',
      agentType: AgentType.IMAGE,
      version: 'v1',
      template: imageTemplate,
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
    {
      id: 'seed-agent-image',
      type: AgentType.IMAGE,
      name: 'Image Agent',
      promptId: imagePrompt.id,
    },
  ];

  for (const a of prompts) {
    await prisma.agent.upsert({
      where: { id: a.id },
      update: { model: defaultModel },
      create: {
        id: a.id,
        name: a.name,
        type: a.type,
        promptId: a.promptId,
        model: defaultModel,
        enabled: true,
      },
    });
  }

  const existingAccounts = await prisma.platformAccount.count();
  if (existingAccounts === 0) {
    const platformAccounts = [
      {
        platform: 'WECHAT',
        accountName: '品牌增长研究所',
        accountType: '订阅号',
        authStatus: 'authorized',
        ownerId: admin.id,
      },
      {
        platform: 'XIAOHONGSHU',
        accountName: '时尚穿搭研究所',
        accountType: '企业号',
        authStatus: 'authorized',
        ownerId: admin.id,
      },
      {
        platform: 'DOUYIN',
        accountName: '运营成长笔记',
        accountType: '企业号',
        authStatus: 'authorized',
        ownerId: admin.id,
      },
      {
        platform: 'VIDEO_CHANNEL',
        accountName: '品牌观点',
        accountType: '视频号',
        authStatus: 'pending',
        ownerId: admin.id,
      },
      {
        platform: 'BILIBILI',
        accountName: '品牌研究所',
        accountType: 'UP主',
        authStatus: 'authorized',
        ownerId: admin.id,
      },
      {
        platform: 'ZHIHU',
        accountName: '品牌增长实战',
        accountType: '机构号',
        authStatus: 'authorized',
        ownerId: admin.id,
      },
    ];
    await prisma.platformAccount.createMany({ data: platformAccounts });
  }

  console.log('Seed OK. Admin:', admin.email, '/ admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
