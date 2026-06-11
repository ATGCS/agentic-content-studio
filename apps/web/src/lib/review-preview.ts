import type { GenerationPreviewData } from '@/components/studio/generation-result-preview';

/** 审核详情 API 返回（含 materials，供与内容详情同款预览） */
export type ReviewPreviewPayload = {
  id: string;
  status: string;
  comment?: string | null;
  createdAt: string;
  contentId: string;
  content: {
    id: string;
    title: string;
    summary?: string | null;
    body?: string | null;
    coverText?: string | null;
    topic?: { title: string } | null;
    materials?: GenerationPreviewData['materials'];
  };
  version: {
    id: string;
    platform: string;
    title?: string | null;
    body?: string | null;
    coverText?: string | null;
    tags?: unknown;
    status: string;
    formatConfig?: GenerationPreviewData['versions'] extends Array<infer V>
      ? V extends { formatConfig?: infer F }
        ? F
        : never
      : never;
    account?: { accountName: string } | null;
  } | null;
};

export function toGenerationPreviewData(
  review: ReviewPreviewPayload
): GenerationPreviewData {
  const v = review.version;
  return {
    title: review.content.title,
    summary: review.content.summary,
    body: review.content.body,
    coverText: review.content.coverText,
    topic: review.content.topic,
    materials: review.content.materials,
    versions: v
      ? [
          {
            id: v.id,
            platform: v.platform,
            title: v.title,
            body: v.body,
            coverText: v.coverText,
            tags: v.tags,
            status: v.status,
            formatConfig: v.formatConfig ?? null,
            account: v.account,
          },
        ]
      : [],
  };
}

export function reviewPreviewPlatform(review: ReviewPreviewPayload): string {
  return review.version?.platform ?? 'draft';
}
