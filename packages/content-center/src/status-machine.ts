import type { ContentStatus } from '@acs/db';

const TRANSITIONS: Partial<Record<ContentStatus, ContentStatus[]>> = {
  DRAFT: ['PENDING_GENERATE', 'GENERATING', 'PENDING_REVIEW', 'ARCHIVED'],
  PENDING_GENERATE: ['GENERATING', 'DRAFT'],
  GENERATING: ['PENDING_REVIEW', 'FAILED', 'DRAFT'],
  PENDING_REVIEW: ['APPROVED', 'REJECTED', 'DRAFT'],
  REJECTED: ['PENDING_GENERATE', 'DRAFT', 'GENERATING', 'PENDING_REVIEW'],
  APPROVED: ['PENDING_PUBLISH', 'PENDING_REVIEW', 'PUBLISHED', 'DRAFT'],
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
 * 用于多版本独立审核场景
 */
export function computeContentStatus(versionStatuses: string[]): ContentStatus {
  if (versionStatuses.length === 0) return 'DRAFT';

  const has = (s: string) => versionStatuses.includes(s);
  const all = (s: string) => versionStatuses.every((v) => v === s);

  if (all('PUBLISHED')) return 'PUBLISHED';
  if (all('APPROVED')) return 'APPROVED';
  if (has('PENDING_REVIEW')) return 'PENDING_REVIEW';
  if (has('GENERATING')) return 'GENERATING';
  if (has('REJECTED') && !has('PENDING_REVIEW')) return 'REJECTED';
  if (has('APPROVED')) return 'APPROVED';
  return 'DRAFT';
}
