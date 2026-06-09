import type { Platform } from '@acs/db';

export type WorkflowContext = {
  contentId: string;
  accountId?: string;
  platforms: Platform[];
  platform?: Platform;
  versionId?: string;
  versions: Array<{ id: string; platform: Platform }>;
  vars: Record<string, unknown>;
};

export type NodeInput = Record<string, unknown>;

export type NodeResult = {
  output?: Record<string, unknown>;
  patch?: Partial<WorkflowContext>;
};

export type WorkflowNodeHandler = (
  ctx: WorkflowContext,
  input: NodeInput
) => Promise<NodeResult>;

export type WorkflowStep = {
  id?: string;
  node?: string;
  input?: NodeInput;
  when?: string;
  foreach?: string;
  as?: string;
  steps?: WorkflowStep[];
};

export type WorkflowDefinition = {
  id: string;
  name: string;
  steps: WorkflowStep[];
  onError?: {
    node: string;
    input?: NodeInput;
  };
};

export type StepRunRecord = {
  stepId: string;
  node: string;
  status: 'skipped' | 'success' | 'failed';
  output?: Record<string, unknown>;
  error?: string;
};

export type WorkflowRunResult = {
  workflowId: string;
  context: WorkflowContext;
  steps: StepRunRecord[];
};
