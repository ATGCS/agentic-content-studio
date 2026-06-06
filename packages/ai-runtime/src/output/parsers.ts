import { z } from 'zod';

const titleSchema = z.object({ titles: z.array(z.string()) });
const bodySchema = z.object({ body: z.string() });
const rewriteSchema = z.object({
  title: z.string(),
  body: z.string(),
  coverText: z.string().optional(),
  tags: z.array(z.string()).optional(),
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
const tagSchema = z.object({ tags: z.array(z.string()), categories: z.array(z.string()).optional() });
const imageSchema = z.object({
  prompt: z.string(),
  style: z.string().optional(),
  aspectRatio: z.string().optional(),
});
const videoScriptSchema = z.object({
  title: z.string(),
  scenes: z.array(z.object({
    order: z.number(),
    duration: z.number().optional(),
    visual: z.string(),
    narration: z.string(),
  })),
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
  competitors: z.array(z.object({
    name: z.string(),
    url: z.string().optional(),
    strengths: z.array(z.string()).optional(),
    weaknesses: z.array(z.string()).optional(),
    contentTopics: z.array(z.string()).optional(),
  })),
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
  rewrite: (rawText: string) => rewriteSchema.parse(extractJson(rawText)),
  review: (rawText: string) => reviewSchema.parse(extractJson(rawText)),
  summary: (rawText: string) => summarySchema.parse(extractJson(rawText)),
  tag: (rawText: string) => tagSchema.parse(extractJson(rawText)),
  image: (rawText: string) => imageSchema.parse(extractJson(rawText)),
  videoScript: (rawText: string) => videoScriptSchema.parse(extractJson(rawText)),
  topic: (rawText: string) => topicSchema.parse(extractJson(rawText)),
  coverCopy: (rawText: string) => coverCopySchema.parse(extractJson(rawText)),
  competitor: (rawText: string) => competitorSchema.parse(extractJson(rawText)),
};
