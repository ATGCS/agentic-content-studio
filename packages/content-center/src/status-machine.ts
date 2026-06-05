import type { ContentStatus } from '@acs/db';

const TRANSITIONS: Partial<Record<ContentStatus, ContentStatus[]>> = {
  DRAFT: ['PENDING_GENERATE', 'ARCHIVED'],
  PENDING_GENERATE: ['GENERATING', 'DRAFT'],
  GENERATING: ['PENDING_REVIEW', 'FAILED', 'DRAFT'],
  PENDING_REVIEW: ['APPROVED', 'REJECTED'],
  REJECTED: ['PENDING_GENERATE', 'DRAFT', 'GENERATING'],
  APPROVED: ['PENDING_PUBLISH', 'PENDING_REVIEW'],
  PENDING_PUBLISH: ['PUBLISHING', 'APPROVED'],
  PUBLISHING: ['PUBLISHED', 'FAILED'],
  PUBLISHED: ['REVIEWED'],
  FAILED: ['PENDING_GENERATE', 'DRAFT'],
  REVIEWED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function canTransitionContent(
  from: ContentStatus,
  to: ContentStatus
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: ContentStatus, to: ContentStatus): void {
  if (!canTransitionContent(from, to)) {
    throw new Error(`Invalid transition ${from} -> ${to}`);
  }
}
