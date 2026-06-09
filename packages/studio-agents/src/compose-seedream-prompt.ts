import { getPlatformCoverGuide } from '@acs/ai-runtime';

export type ImageAgentOutput = {
  /** 新版：完整 Seedream 中文提示词（优先） */
  seedreamPrompt?: string;
  prompt?: string;
  style?: string;
  aspectRatio?: string;
  keyElements?: string[];
  avoid?: string[];
  mood?: string;
  composition?: string;
};

export type SeedreamPromptContext = {
  title?: string;
  coverText?: string;
  platform?: string;
  imageRole?: string;
};

/** 将 IMAGE Agent 结构化输出组装为传给 Seedream 的最终提示词 */
export function composeSeedreamPrompt(
  output: ImageAgentOutput,
  ctx: SeedreamPromptContext = {}
): string {
  const core = (output.seedreamPrompt ?? output.prompt ?? '').trim();
  if (!core) {
    throw new Error('IMAGE Agent 未返回 seedreamPrompt 或 prompt');
  }

  const segments: string[] = [core];

  if (output.mood?.trim() && !core.includes(output.mood)) {
    segments.push(`情绪氛围：${output.mood.trim()}`);
  }
  if (output.composition?.trim() && !core.includes(output.composition)) {
    segments.push(`构图：${output.composition.trim()}`);
  }
  if (output.style?.trim() && !core.includes(output.style)) {
    segments.push(`画风：${output.style.trim()}`);
  }
  if (output.keyElements?.length) {
    const joined = output.keyElements.filter(Boolean).join('、');
    if (joined && !core.includes(joined.slice(0, 12))) {
      segments.push(`画面必须清晰呈现：${joined}`);
    }
  }
  if (output.avoid?.length) {
    segments.push(`禁止出现：${output.avoid.filter(Boolean).join('、')}`);
  }

  const title = ctx.title?.trim();
  const coverText = ctx.coverText?.trim();
  if (title && title.length >= 4 && !core.includes(title.slice(0, 8))) {
    segments.push(`内容主题：${title}`);
  }
  if (
    coverText &&
    coverText.length >= 2 &&
    !core.includes(coverText.slice(0, 6))
  ) {
    segments.push(
      `封面文案意象（可预留叠字区，不要把长句直接画进图里）：${coverText}`
    );
  }

  if (ctx.platform) {
    const guide = getPlatformCoverGuide(ctx.platform);
    if (!core.includes(ctx.platform)) {
      segments.push(guide);
    }
  }

  if (ctx.imageRole === 'BODY') {
    segments.push('正文配图：与段落内容强相关，信息点可视化，非泛化装饰图');
  }

  return segments.join('。').slice(0, 800);
}

/** 用户自定义短提示词 + 内容上下文 enrichment */
export function enrichUserImagePrompt(
  userPrompt: string,
  ctx: SeedreamPromptContext & { summary?: string; topicTitle?: string }
): string {
  const parts = [userPrompt.trim()];
  if (ctx.topicTitle) parts.push(`系列/选题：${ctx.topicTitle}`);
  if (ctx.title) parts.push(`文章标题：${ctx.title}`);
  if (ctx.summary) parts.push(`内容摘要：${ctx.summary.slice(0, 200)}`);
  if (ctx.coverText) parts.push(`封面文案：${ctx.coverText}`);
  if (ctx.platform) parts.push(getPlatformCoverGuide(ctx.platform));
  parts.push(
    '要求：画面元素必须与上述内容主题严格相关，禁止无关泛化图、禁止随机装饰'
  );
  return parts.join('。').slice(0, 800);
}
