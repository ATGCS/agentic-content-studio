'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  StopCircle,
  XCircle,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PlatformBadge } from '@/components/platform-icon';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/studio/empty-state';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { AgentTaskDetailDialog } from '@/components/dialogs/agent-task-detail-dialog';
import {
  agentTypeLabels,
  copy,
  statusOptions,
  taskStatusStyles,
  taskTypeOptions,
} from './strings';

type AgentRun = {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  error?: string | null;
  model?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  agent?: { id: string; name: string; type: string };
  content?: { id: string; title: string; summary?: string | null };
  version?: {
    id: string;
    platform: string;
    account?: { id: string; accountName: string } | null;
  } | null;
};

type TaskBatch = {
  contentId: string;
  contentTitle: string;
  contentSummary?: string | null;
  runs: AgentRun[];
  status: AgentRun['status'];
  startedAt: string;
  agentCount: number;
  successCount: number;
  failedCount: number;
};

export default function AgentTasksPage() {
  const searchParams = useSearchParams();
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [taskType, setTaskType] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRunId, setDetailRunId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  function notify(type: 'success' | 'error', text: string) {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 4000);
  }

  async function loadRuns() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (taskType !== 'ALL') params.set('agentType', taskType);
      const query = params.toString();
      const res = await api<AgentRun[]>(
        `/api/agent-runs${query ? `?${query}` : ''}`
      );
      setRuns(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRuns();
  }, [taskType, statusFilter]);

  useEffect(() => {
    const runId = searchParams.get('run');
    if (runId) {
      setDetailRunId(runId);
      setDetailOpen(true);
    }
  }, [searchParams]);

  function openDetail(runId: string) {
    setDetailRunId(runId);
    setDetailOpen(true);
  }

  function closeDetail(open: boolean) {
    setDetailOpen(open);
    if (!open) {
      setDetailRunId(null);
      if (searchParams.get('run')) {
        window.history.replaceState(null, '', '/agent-tasks');
      }
    }
  }

  // 按内容分组为批次
  const batches = useMemo(() => {
    const grouped = new Map<string, AgentRun[]>();
    for (const run of runs) {
      const key = run.content?.id ?? 'no-content';
      const list = grouped.get(key) ?? [];
      list.push(run);
      grouped.set(key, list);
    }

    const result: TaskBatch[] = [];
    for (const [contentId, batchRuns] of grouped) {
      const firstRun = batchRuns[0];
      const status = computeBatchStatus(batchRuns);
      result.push({
        contentId,
        contentTitle: firstRun.content?.title ?? '未关联内容',
        contentSummary: firstRun.content?.summary,
        runs: batchRuns,
        status,
        startedAt: batchRuns.reduce(
          (earliest, r) => (r.startedAt < earliest ? r.startedAt : earliest),
          batchRuns[0].startedAt
        ),
        agentCount: batchRuns.length,
        successCount: batchRuns.filter((r) => r.status === 'SUCCESS').length,
        failedCount: batchRuns.filter((r) => r.status === 'FAILED').length,
      });
    }

    return result.sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }, [runs]);

  const stats = useMemo(() => {
    const counts = { PENDING: 0, RUNNING: 0, SUCCESS: 0, FAILED: 0 };
    for (const run of runs) counts[run.status] += 1;
    return [
      {
        label: '待执行',
        count: counts.PENDING,
        color: '#FF7D00',
        bg: '#FFF7E6',
      },
      {
        label: '执行中',
        count: counts.RUNNING,
        color: '#1664FF',
        bg: '#E8F3FF',
      },
      {
        label: '已完成',
        count: counts.SUCCESS,
        color: '#00B42A',
        bg: '#E8FFEA',
      },
      { label: '失败', count: counts.FAILED, color: '#F53F3F', bg: '#FFF1F0' },
    ];
  }, [runs]);

  async function retryRun(id: string) {
    setActionId(id);
    try {
      await api(`/api/agent-runs/${id}/retry`, { method: 'POST' });
      notify('success', copy.retryOk);
      await loadRuns();
    } catch (e) {
      notify('error', e instanceof ApiError ? e.message : copy.retryFail);
    } finally {
      setActionId(null);
    }
  }

  async function cancelRun(id: string) {
    setActionId(id);
    try {
      await api(`/api/agent-runs/${id}/cancel`, { method: 'POST' });
      notify('success', copy.cancelOk);
      await loadRuns();
    } catch (e) {
      notify('error', e instanceof ApiError ? e.message : copy.cancelFail);
    } finally {
      setActionId(null);
    }
  }

  function toggleBatch(contentId: string) {
    setExpandedBatch((prev) => (prev === contentId ? null : contentId));
  }

  return (
    <StudioLayout>
      <PageContainer className="gap-2 !p-2 md:!p-3">
        {notice && (
          <div
            className={cn(
              'rounded-lg px-4 py-2 text-sm',
              notice.type === 'success'
                ? 'bg-[#E8FFEA] text-[#00B42A]'
                : 'bg-[#FFF1F0] text-[#F53F3F]'
            )}
          >
            {notice.text}
          </div>
        )}

        {/* 顶部栏 */}
        <div className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-sm">
              <Clock className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-gray-900">
                任务记录
              </h1>
              <p className="text-xs text-gray-400">
                {batches.length} 个批次 / {runs.length} 个任务
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger size="sm" className="h-8 w-24 text-xs">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                {taskTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger size="sm" className="h-8 w-24 text-xs">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={loadRuns}
              disabled={loading}
            >
              <RefreshCw
                className={`size-3.5 text-gray-500 ${loading ? 'animate-spin' : ''}`}
              />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                setTaskType('ALL');
                setStatusFilter('ALL');
              }}
            >
              <RotateCcw className="size-3.5" />
              重置
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
            >
              <div
                className="flex size-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: stat.bg }}
              >
                <span
                  className="text-sm font-bold"
                  style={{ color: stat.color }}
                >
                  {stat.count}
                </span>
              </div>
              <span className="text-xs text-gray-600">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* 批次列表 */}
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
            <div className="flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-[#1664FF]" />
            </div>
          </div>
        ) : batches.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
            <EmptyState title={copy.emptyTitle} description={copy.emptyDesc} />
          </div>
        ) : (
          <div className="space-y-2">
            {batches.map((batch) => (
              <div
                key={batch.contentId}
                className="rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                {/* 批次头部 */}
                <button
                  type="button"
                  onClick={() => toggleBatch(batch.contentId)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-gray-50"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-900">
                      {batch.contentTitle}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      <span>{batch.agentCount} 个 Agent</span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-green-500" />
                        {batch.successCount} 成功
                      </span>
                      {batch.failedCount > 0 && (
                        <span className="flex items-center gap-1">
                          <XCircle className="size-3 text-red-500" />
                          {batch.failedCount} 失败
                        </span>
                      )}
                      <span>{formatDateTime(batch.startedAt)}</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                      taskStatusStyles[batch.status]?.className
                    )}
                  >
                    {taskStatusStyles[batch.status]?.label ?? batch.status}
                  </span>
                  {expandedBatch === batch.contentId ? (
                    <ChevronDown className="size-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="size-4 text-gray-400" />
                  )}
                </button>

                {/* 展开的任务列表 */}
                {expandedBatch === batch.contentId && (
                  <div className="border-t border-gray-100 px-4 py-3">
                    <div className="space-y-2">
                      {batch.runs.map((run) => (
                        <div
                          key={run.id}
                          className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {agentTypeLabels[run.agent?.type ?? ''] ??
                                  run.agent?.type ??
                                  'Unknown'}
                              </span>
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium',
                                  taskStatusStyles[run.status]?.className
                                )}
                              >
                                {taskStatusStyles[run.status]?.label ??
                                  run.status}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                              {run.version?.platform && (
                                <PlatformBadge
                                  platform={run.version.platform}
                                  size="sm"
                                />
                              )}
                              {run.model && <span>{run.model}</span>}
                              <span>
                                {formatDuration(run.startedAt, run.finishedAt)}
                              </span>
                            </div>
                            {run.error && (
                              <p className="mt-1 truncate text-xs text-red-500">
                                {run.error}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => openDetail(run.id)}
                            >
                              详情
                            </Button>
                            {run.status === 'FAILED' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-red-500"
                                disabled={actionId === run.id}
                                onClick={() => retryRun(run.id)}
                              >
                                <RefreshCw
                                  className={cn(
                                    'size-3',
                                    actionId === run.id && 'animate-spin'
                                  )}
                                />
                                重试
                              </Button>
                            )}
                            {(run.status === 'RUNNING' ||
                              run.status === 'PENDING') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-red-500"
                                disabled={actionId === run.id}
                                onClick={() => cancelRun(run.id)}
                              >
                                <StopCircle className="size-3" />
                                取消
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <AgentTaskDetailDialog
          open={detailOpen}
          onOpenChange={closeDetail}
          runId={detailRunId}
          onRunIdChange={setDetailRunId}
          onChanged={loadRuns}
        />
      </PageContainer>
    </StudioLayout>
  );
}

function computeBatchStatus(runs: AgentRun[]): AgentRun['status'] {
  if (runs.some((r) => r.status === 'FAILED')) return 'FAILED';
  if (runs.some((r) => r.status === 'RUNNING')) return 'RUNNING';
  if (runs.some((r) => r.status === 'PENDING')) return 'PENDING';
  return 'SUCCESS';
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDuration(start: string, end?: string | null) {
  if (!end) return '—';
  const seconds = Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000)
  );
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}分${seconds % 60}秒`;
}
