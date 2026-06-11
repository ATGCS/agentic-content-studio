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
- 同系列前序内容（标题角度勿重复，可形成系列递进）：
{{seriesContext}}
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
撰写可发布的**标题与正文**（Markdown）。一次输出，减少多 Agent 串联损耗。

# 输入
- 选题：{{topicTitle}}
- 系列说明：{{topicDesc}}
- 同系列前序内容（保持连贯，避免重复，可递进深化）：
{{seriesContext}}
- 方法论参考（仅借鉴结构与节奏，禁止大段复制）：
{{imaSummary}}
- 账号风格：{{accountStyle}}；定位：{{accountPositioning}}；语气：{{accountTone}}

# 优化目标（按优先级）
1. 点击率：标题让人产生「必须点开」的冲动
2. 完读率/完播率：开头 3 秒/首段必须抓住注意力
3. 防划走：每 2–3 段有小钩子、转折或信息增量
4. 互动：适当提问、清单、可收藏的结构化信息
5. 手机阅读：短段、小标题、列表，避免大 wall of text

# 标题要求
- 输出 1 个首选 title + 3–5 个备选 titles
- 可用：数字+利益、冲突对立、痛点共鸣、反常识、具体场景
- 禁止：空洞形容词、与正文无关的噱头

# 输出
仅 JSON：{"title":"首选标题","titles":["备选1","备选2"],"body":"markdown正文"}`;

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
将母稿改写为 **{{platform}}** 平台独立版本（标题、正文、封面文案、标签、正文插图规划均须重写）。

# 输入
- 母稿标题：{{title}}
- 母稿正文：{{body}}
- 平台版本标题（如有）：{{versionTitle}}
- 平台版本正文（如有）：{{versionBody}}
- 同系列前序内容（平台改写时保持系列叙事连贯）：
{{seriesContext}}
- 方法论参考（仅借鉴结构与表达套路，禁止照搬）：
{{imaSummary}}

# 平台正文排版规范
{{platformBodyGuide}}

# 平台侧重点（{{platform}}）
- 标题：Feed 流里 1 秒抓点击
- 正文：严格按上述排版规范改写，不可只替换几个词
- 封面文案 coverText：适合叠在封面上的 1 行主文案，提升点击率
- 标签 tags：搜索与推荐兼顾

# 正文插图规划（imageSlots，自动 0–3 张）
- 根据正文信息密度规划：长文 2–3 张、短文 0–1 张；抖音/视频号偏 0–1 张
- 每张图须有独立 id（如 fig-1）、可画的中文 prompt、alt 图说
- prompt 须具体可画：小红书手绘信息图/步骤卡片/生活场景（木桌、手机、便签），单信息点；禁止「商务插图」「科技背景」「抽象概念图」
- 在 body 对应位置插入占位符 [[IMAGE:fig-1]]，与 imageSlots.id 一一对应
- 无配图时 imageSlots 为 []，body 中不出现 [[IMAGE:...]]

# 优化目标
点击率 > 完读/完播 > 评论收藏转发

# 输出
仅 JSON：
{
  "title": "",
  "body": "含 [[IMAGE:slotId]] 占位符的正文",
  "coverText": "",
  "tags": [],
  "imageSlots": [{ "id": "fig-1", "prompt": "配图画面描述", "alt": "图说" }]
}`;

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
为 **{{platform}}** 生成 **{{imageRole}}** 的 Seedream 绘图提示词。你的输出将直接生成图片——必须**贴合用户内容**，禁止无关泛化图。

# 用户内容（必须从中提取可画的具体元素）
- 选题/系列：{{topicTitle}}
- 选题说明：{{topicDesc}}
- 文章标题：{{title}}
- 平台版本标题（优先参考）：{{versionTitle}}
- 摘要：{{summary}}
- 封面文案（表达利益/情绪，勿把长句直接画进图）：{{versionCoverText}}
- 版本标签：{{versionTags}}
- 正文摘录（从中找 1–2 个可视觉化的信息点或场景）：
{{bodyExcerpt}}
- 账号风格：{{accountStyle}}；定位：{{accountPositioning}}；语气：{{accountTone}}
- 平台封面规范：{{platformCoverGuide}}
- 视觉方法论参考（只借鉴构图/色彩套路，禁止复刻无关配图）：
{{imaSummary}}

# 你必须完成的思考（不要输出思考过程，只输出 JSON）
1. 读者需求：这篇内容要解决什么问题/传达什么价值？封面应暗示什么？
2. 必现元素：从标题+封面文案+正文摘提取 3–6 个**具体**视觉元素（例：「笔记本电脑+上升曲线+办公桌面」而非「科技感」）
3. 主体与场景：谁/什么在哪里做什么？与主题如何一眼相关？
4. 构图：{{imageRole}} 为 COVER 时，大字报/备忘录风，主标题 3–8 字意象，上方或中部留白叠字；BODY 配图用单信息点手绘卡片
5. 画风：小红书原生笔记风（奶油/莫兰迪/手绘/生活场景），**禁止商务企业风**
6. 禁忌：商务宣传、深蓝科技渐变、西装会议室、isometric 办公、抽象科技球（写入 avoid）

# 反面示例（禁止）
- ❌ 「简约商务风格封面、深蓝渐变、科技感背景」—— 像公司宣传，用户会划走
- ❌ 「一张精美的抽象科技插图」—— 与标题无关
- ❌ 「西装白领在会议室微笑」—— stock 商务风
- ✅ 「小红书大字报封面，奶油米白底，超大粗黑字「周报8分钟」，番茄红高亮标签，右下角咖啡杯与便签手绘贴纸，竖版3:4，可爱接地气」
- ✅ 「手绘步骤卡片信息图，木桌俯拍笔记本与手机，自然光，Q版打工人，莫兰迪浅粉浅绿，禁止商务蓝」

# 输出 JSON（字段均必填，seedreamPrompt 150–450 字中文）
{
  "seedreamPrompt": "完整 Seedream 中文提示词：主体+场景+必现元素+光影+构图留白+色彩+画风+画幅",
  "subject": "核心主体一句话",
  "scene": "具体场景",
  "keyElements": ["元素1","元素2","元素3"],
  "mood": "情绪氛围",
  "colorPalette": "主色与辅色",
  "composition": "构图与留白说明",
  "style": "画风",
  "textOverlayZone": "叠字留白位置",
  "avoid": ["不要出现的无关元素"],
  "aspectRatio": "1728x2304"
}`;

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
