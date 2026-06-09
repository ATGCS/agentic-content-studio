import { z } from 'zod';

const titleSchema = z.object({ titles: z.array(z.string()) });
const bodySchema = z.object({
  body: z.string(),
  /** 首选标题（与 titles 二选一或同时提供） */
  title: z.string().optional(),
  titles: z.array(z.string()).optional(),
});
const imageSlotSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(8),
  alt: z.string().optional(),
});

const rewriteBaseSchema = z.object({
  title: z.string(),
  body: z.string(),
  coverText: z.string().optional(),
  tags: z.array(z.string()).optional(),
  imageSlots: z.array(imageSlotSchema).max(3).optional(),
});

/** 模型漏写 [[IMAGE:id]] 时自动插入，避免整段生成失败 */
export function normalizeRewriteOutput(
  data: z.infer<typeof rewriteBaseSchema>
): z.infer<typeof rewriteBaseSchema> {
  const slots = data.imageSlots ?? [];
  if (slots.length === 0) return data;

  const missing = slots.filter(
    (slot) => !data.body.includes(`[[IMAGE:${slot.id}]]`)
  );
  if (missing.length === 0) return data;

  const paragraphs = data.body.split(/\n\n+/);
  const positions = distributeImageInsertPositions(
    paragraphs.length,
    missing.length
  );

  missing.forEach((slot, index) => {
    const placeholder = `[[IMAGE:${slot.id}]]`;
    const pos = positions[index] ?? paragraphs.length;
    paragraphs.splice(Math.min(pos, paragraphs.length), 0, placeholder);
  });

  return { ...data, body: paragraphs.join('\n\n') };
}

function distributeImageInsertPositions(
  paragraphCount: number,
  slotCount: number
): number[] {
  if (paragraphCount <= 1) {
    return Array.from({ length: slotCount }, () => paragraphCount);
  }
  return Array.from({ length: slotCount }, (_, index) => {
    const ratio = (index + 1) / (slotCount + 1);
    return Math.max(1, Math.round(paragraphCount * ratio));
  });
}

const rewriteSchema = rewriteBaseSchema.superRefine((data, ctx) => {
  const slots = data.imageSlots ?? [];
  const placeholderRe = /\[\[IMAGE:([^\]]+)\]\]/g;
  const idsInBody = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = placeholderRe.exec(data.body)) !== null) {
    idsInBody.add(match[1]);
  }
  const slotIds = new Set(slots.map((s) => s.id));
  for (const id of idsInBody) {
    if (!slotIds.has(id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `body 占位符 [[IMAGE:${id}]] 在 imageSlots 中无定义`,
      });
    }
  }
  for (const slot of slots) {
    if (!idsInBody.has(slot.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `imageSlots 中 ${slot.id} 在 body 中缺少 [[IMAGE:${slot.id}]] 占位符`,
      });
    }
  }
});
const reviewSchema = z.object({
  passed: z.boolean(),
  checks: z.array(
    z.object({
      name: z.string(),
      ok: z.boolean(),
      detail: z.string().optional(),
    })
  ),
  riskLevel: z.string().optional(),
});
const summarySchema = z.object({
  summary: z.string(),
  insights: z.array(z.unknown()).optional(),
  suggestions: z.array(z.unknown()).optional(),
});
const tagSchema = z.object({
  tags: z.array(z.string()),
  categories: z.array(z.string()).optional(),
});
const imageSchema = z
  .object({
    /** 完整 Seedream 提示词，150–450 字，含主体/场景/元素/光影/构图/风格 */
    seedreamPrompt: z.string().min(60).optional(),
    prompt: z.string().optional(),
    /** 必须与文章主题一致的核心视觉主体（人/物/场景） */
    subject: z.string().optional(),
    scene: z.string().optional(),
    keyElements: z.array(z.string()).min(1).max(8).optional(),
    mood: z.string().optional(),
    colorPalette: z.string().optional(),
    composition: z.string().optional(),
    style: z.string().optional(),
    textOverlayZone: z.string().optional(),
    avoid: z.array(z.string()).optional(),
    aspectRatio: z.string().optional(),
  })
  .refine((o) => Boolean(o.seedreamPrompt?.trim() || o.prompt?.trim()), {
    message: 'seedreamPrompt or prompt is required',
  });
const videoScriptSchema = z.object({
  title: z.string(),
  scenes: z.array(
    z.object({
      order: z.number(),
      duration: z.number().optional(),
      visual: z.string(),
      narration: z.string(),
    })
  ),
});
const topicSchema = z.object({
  title: z.string(),
  description: z.string(),
  reasons: z.array(z.string()).optional(),
  targetPlatforms: z.array(z.string()).optional(),
});
const coverCopySchema = z.object({
  headline: z.string(),
  subhead: z.string().optional(),
  bodyCopy: z.string().optional(),
});
const competitorSchema = z.object({
  competitors: z.array(
    z.object({
      name: z.string(),
      url: z.string().optional(),
      strengths: z.array(z.string()).optional(),
      weaknesses: z.array(z.string()).optional(),
      contentTopics: z.array(z.string()).optional(),
    })
  ),
  suggestions: z.array(z.string()).optional(),
});

export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const raw = fence ? fence[1].trim() : trimmed;

  try {
    return JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid JSON output: ${message}`);
  }
}

export const outputParsers = {
  title: (rawText: string) => titleSchema.parse(extractJson(rawText)),
  body: (rawText: string) => bodySchema.parse(extractJson(rawText)),
  rewrite: (rawText: string) =>
    rewriteSchema.parse(
      normalizeRewriteOutput(rewriteBaseSchema.parse(extractJson(rawText)))
    ),
  review: (rawText: string) => reviewSchema.parse(extractJson(rawText)),
  summary: (rawText: string) => summarySchema.parse(extractJson(rawText)),
  tag: (rawText: string) => tagSchema.parse(extractJson(rawText)),
  image: (rawText: string) => imageSchema.parse(extractJson(rawText)),
  videoScript: (rawText: string) =>
    videoScriptSchema.parse(extractJson(rawText)),
  topic: (rawText: string) => topicSchema.parse(extractJson(rawText)),
  coverCopy: (rawText: string) => coverCopySchema.parse(extractJson(rawText)),
  competitor: (rawText: string) => competitorSchema.parse(extractJson(rawText)),
};
