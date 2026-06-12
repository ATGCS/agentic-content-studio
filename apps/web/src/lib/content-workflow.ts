export type WorkflowStepId = 'generate' | 'edit' | 'publish';

export type ContentWorkflowInput = {
  contentStatus: string;
  versions: Array<{ id: string; status: string }>;
};

const STEP_ORDER: WorkflowStepId[] = ['generate', 'edit', 'publish'];

export function getActiveWorkflowStep(
  input: ContentWorkflowInput
): WorkflowStepId {
  // 简化流程：生成完成 → 编辑确认 → 发布
  if (input.contentStatus === 'APPROVED' || input.contentStatus === 'PENDING_PUBLISH') return 'publish';
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
    id: 'publish',
    label: '发布',
    description: '导出发布包或绑定账号后一键发布',
  },
];
