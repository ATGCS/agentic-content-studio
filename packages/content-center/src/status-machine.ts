import type { ContentStatus } from '@acs/db';

const TRANSITIONS: Partial<Record<ContentStatus, ContentStatus[]>> = {
  DRAFT: ['PENDING_GENERATE', 'GENERATING', 'APPROVED', 'ARCHIVED'],
  PENDING_GENERATE: ['GENERATING', 'DRAFT'],
  GENERATING: ['APPROVED', 'FAILED', 'DRAFT'],
  APPROVED: ['PENDING_PUBLISH', 'PUBLISHED', 'DRAFT'],
  PENDING_PUBLISH: ['PUBLISHING', 'APPROVED'],
  PUBLISHING: ['PUBLISHED', 'FAILED'],
  PUBLISHED: ['REVIEWED', 'ARCHIVED'],
  FAILED: ['PENDING_GENERATE', 'DRAFT', 'GENERATING'],
  REVIEWED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function canTransitionContent(
  from: ContentStatus,
  to: ContentStatus
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: ContentStatus, to: ContentStatus): void {
  if (!canTransitionContent(from, to)) {
    throw new Error(`Invalid transition ${from} -> ${to}`);
  }
}

/**
 * 根据所有版本状态计算内容级聚合状态
 * 简化流程：生成完成 → 确认 → 发布
 */
export function computeContentStatus(versionStatuses: string[]): ContentStatus {
  if (versionStatuses.length === 0) return 'DRAFT';

  const has = (s: string) => versionStatuses.includes(s);
  const all = (s: string) => versionStatuses.every((v) => v === s);

  if (all('PUBLISHED')) return 'PUBLISHED';
  if (all('APPROVED')) return 'APPROVED';
  if (has('GENERATING')) return 'GENERATING';
  if (has('APPROVED')) return 'APPROVED';
  return 'DRAFT';
}
