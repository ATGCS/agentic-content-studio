import { z } from 'zod';
import type { AgentType } from '@acs/db';

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

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

export function parseOutput(type: AgentType, rawText: string): unknown {
  const json = extractJson(rawText);
  switch (type) {
    case 'TITLE':
      return titleSchema.parse(json);
    case 'BODY':
      return bodySchema.parse(json);
    case 'REWRITE':
      return rewriteSchema.parse(json);
    case 'REVIEW':
      return reviewSchema.parse(json);
    case 'SUMMARY':
      return summarySchema.parse(json);
    default:
      return json;
  }
}
