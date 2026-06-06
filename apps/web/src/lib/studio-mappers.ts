/** Map API entities to studio UI display shapes */

export type ApiAgentRun = {
  id: string;
  agentId: string;
  contentId: string;
  versionId?: string | null;
  model?: string | null;
  status: string;
  error?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  agent?: { type: string; name: string };
  content?: { id: string; title: string };
  version?: { platform: string; account?: { accountName: string } | null };
};

export function mapAgentRunStatus(status: string): string {
  if (status === 'SUCCESS') return 'COMPLETED';
  return status;
}

export function formatDurationMs(startedAt: string, finishedAt?: string | null): string {
  if (!finishedAt) return '—';
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}毫秒`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  const min = Math.floor(sec / 60);
  return `${min}分${sec % 60}秒`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

export function mapAgentRunToTask(run: ApiAgentRun) {
  const agentType = run.agent?.type ?? 'TITLE';
  return {
    id: run.id,
    taskId: run.id.slice(0, 12),
    name: run.content?.title
      ? `${run.content.title} · ${agentType}`
      : `Agent 任务 ${run.id.slice(0, 8)}`,
    agentType,
    status: mapAgentRunStatus(run.status),
    contentId: run.contentId,
    content: run.content ? { title: run.content.title } : undefined,
    platform: run.version?.platform?.toLowerCase() ?? '',
    account: run.version?.account
      ? { accountName: run.version.account.accountName }
      : undefined,
    model: run.model ?? undefined,
    knowledgeBase: undefined as string | undefined,
    cost: undefined as number | undefined,
    duration: formatDurationMs(run.startedAt, run.finishedAt),
    createdAt: formatDateTime(run.startedAt),
    updatedAt: formatDateTime(run.finishedAt ?? run.startedAt),
  };
}

export type ApiPublishingTask = {
  id: string;
  contentId: string;
  platform: string;
  status: string;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  error?: string | null;
  createdAt: string;
  content?: { title: string };
  account?: { accountName: string };
  version?: { title?: string | null };
  publishRecord?: { views?: number } | null;
};

export type ApiReviewTask = {
  id: string;
  status: string;
  createdAt: string;
  content?: { title: string };
  version?: { platform?: string; account?: { accountName: string } | null };
};

export function mapReviewTask(task: ApiReviewTask) {
  return {
    id: task.id,
    title: task.content?.title ?? '',
    platform: task.version?.platform ?? 'OTHER',
    account: task.version?.account?.accountName ?? '-',
    reviewType: '内容合规',
    riskLevel: 'low' as const,
    submittedAt: formatDateTime(task.createdAt),
    source: 'Agent生成',
    status: task.status,
    content: task.content,
  };
}

export const publishStatusLabels: Record<string, string> = {
  PENDING: '待发布',
  PUBLISHING: '发布中',
  SUCCESS: '已发布',
  FAILED: '失败',
  CANCELLED: '已取消',
};
