export type WorkflowStepId = 'generate' | 'edit' | 'review' | 'publish';

export type ReviewUiState =
  | 'no_version'
  | 'ready'
  | 'pending'
  | 'approved'
  | 'rejected';

export type ContentWorkflowInput = {
  contentStatus: string;
  versions: Array<{ id: string; status: string }>;
};

const STEP_ORDER: WorkflowStepId[] = ['generate', 'edit', 'review', 'publish'];

export function getReviewUiState(
  input: ContentWorkflowInput,
  selectedVersionStatus?: string
): ReviewUiState {
  if (!input.versions.length) return 'no_version';
  // 优先使用当前选中版本的状态（支持多版本独立审核）
  const status = selectedVersionStatus ?? input.contentStatus;
  if (status === 'APPROVED') return 'approved';
  if (status === 'REJECTED') return 'rejected';
  if (status === 'PENDING_REVIEW') return 'pending';
  return 'ready';
}

export function getActiveWorkflowStep(
  input: ContentWorkflowInput
): WorkflowStepId {
  const reviewState = getReviewUiState(input);

  if (reviewState === 'approved') return 'publish';
  if (reviewState === 'pending') return 'review';
  if (reviewState === 'rejected') return 'edit';
  if (!input.versions.length) return 'generate';
  return 'edit';
}

export function getWorkflowStepIndex(step: WorkflowStepId): number {
  return STEP_ORDER.indexOf(step);
}

export function isStepCompleted(
  step: WorkflowStepId,
  input: ContentWorkflowInput
): boolean {
  const active = getActiveWorkflowStep(input);
  return getWorkflowStepIndex(step) < getWorkflowStepIndex(active);
}

export const WORKFLOW_STEPS: Array<{
  id: WorkflowStepId;
  label: string;
  description: string;
}> = [
  {
    id: 'generate',
    label: 'AI 生成',
    description: '一键生成正文与平台版本',
  },
  {
    id: 'edit',
    label: '编辑确认',
    description: '检查标题、正文与封面',
  },
  {
    id: 'review',
    label: '提交审核',
    description: '提交至审核中心',
  },
  {
    id: 'publish',
    label: '发布',
    description: '导出发布包或绑定账号后一键发布',
  },
];
