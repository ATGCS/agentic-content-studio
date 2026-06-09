'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
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
import { StudioCard } from '@/components/studio/studio-card';
import {
  StudioTable,
  StudioTableBody,
  StudioTableCell,
  StudioTableHead,
  StudioTableHeader,
  StudioTableRow,
} from '@/components/studio/studio-table';
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
import {
  agentTypeLabels,
  copy,
  statLabels,
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
  content?: { id: string; title: string };
  version?: {
    id: string;
    platform: string;
    account?: { id: string; accountName: string } | null;
  } | null;
};

type AgentTask = {
  id: string;
  name: string;
  agentType: string;
  status: AgentRun['status'];
  content?: { id: string; title: string };
  platform?: string;
  account?: { accountName: string };
  model?: string;
  error?: string | null;
  createdAt: string;
  duration?: string;
};

const pageSizeOptions = ['10', '20', '50'];

export default function AgentTasksPage() {
  const [items, setItems] = useState<AgentTask[]>([]);
  const [taskType, setTaskType] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState('10');
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
      setItems(res.data.map(mapRunToTask));
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRuns();
  }, [taskType, statusFilter]);

  const stats = useMemo(() => {
    const counts = { PENDING: 0, RUNNING: 0, SUCCESS: 0, FAILED: 0 };
    for (const item of items) counts[item.status] += 1;
    return [
      {
        label: statLabels.pending,
        count: counts.PENDING,
        icon: FileText,
        bg: '#FFF7E6',
        color: '#FF7D00',
      },
      {
        label: statLabels.running,
        count: counts.RUNNING,
        icon: Clock,
        bg: '#E8F3FF',
        color: '#1664FF',
      },
      {
        label: statLabels.success,
        count: counts.SUCCESS,
        icon: CheckCircle2,
        bg: '#E8FFEA',
        color: '#00B42A',
      },
      {
        label: statLabels.failed,
        count: counts.FAILED,
        icon: XCircle,
        bg: '#FFF1F0',
        color: '#F53F3F',
      },
    ];
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(items.length / Number(pageSize)));
  const pagedItems = items.slice(
    (currentPage - 1) * Number(pageSize),
    currentPage * Number(pageSize)
  );

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

  return (
    <StudioLayout>
      <PageContainer>
        <StudioCard contentClassName="mb-4 border-[#E8F3FF] bg-[#F7FAFF] p-4">
          <p className="text-sm font-medium text-[#1D2129]">{copy.infoTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#4e5969]">
            {copy.infoBody}
          </p>
        </StudioCard>

        {notice && (
          <div
            className={cn(
              'mb-4 rounded-lg px-4 py-2 text-sm',
              notice.type === 'success'
                ? 'bg-[#E8FFEA] text-[#00B42A]'
                : 'bg-[#FFF1F0] text-[#F53F3F]'
            )}
          >
            {notice.text}
          </div>
        )}

        <StudioCard contentClassName="p-5">
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#86909C]">{copy.taskType}</span>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger size="sm" className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#86909C]">{copy.status}</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger size="sm" className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto flex items-center gap-2">
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
                {copy.reset}
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs"
                isLoading={loading}
                onClick={loadRuns}
              >
                {copy.query}
              </Button>
            </div>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex items-center gap-3 rounded-lg border border-[#E5E8EF] bg-white p-4"
                >
                  <div
                    className="flex size-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: stat.bg }}
                  >
                    <Icon className="size-5" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-[#1D2129]">
                      {stat.count}
                    </div>
                    <div className="text-xs text-[#86909C]">{stat.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-medium text-[#1D2129]">
              {copy.taskList}
            </div>
            <div className="text-xs text-[#86909C]">
              {copy.total(items.length)}
            </div>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-[#1664FF]" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState title={copy.emptyTitle} description={copy.emptyDesc} />
          ) : (
            <>
              <StudioTable size="compact">
                <StudioTableHeader>
                  <StudioTableRow className="hover:bg-transparent">
                    <StudioTableHead className="min-w-[220px]">
                      {copy.colTask}
                    </StudioTableHead>
                    <StudioTableHead>{copy.colContent}</StudioTableHead>
                    <StudioTableHead>{copy.colPlatform}</StudioTableHead>
                    <StudioTableHead>{copy.colAccount}</StudioTableHead>
                    <StudioTableHead>{copy.colAgent}</StudioTableHead>
                    <StudioTableHead>{copy.colStatus}</StudioTableHead>
                    <StudioTableHead>{copy.colModel}</StudioTableHead>
                    <StudioTableHead>{copy.colTime}</StudioTableHead>
                    <StudioTableHead>{copy.colDuration}</StudioTableHead>
                    <StudioTableHead align="right">
                      {copy.colActions}
                    </StudioTableHead>
                  </StudioTableRow>
                </StudioTableHeader>
                <StudioTableBody>
                  {pagedItems.map((task) => (
                    <StudioTableRow key={task.id}>
                      <StudioTableCell>
                        <div className="flex flex-col">
                          <Link
                            href={`/agent-tasks/${task.id}`}
                            className="text-sm font-medium text-[#1D2129] hover:text-[#1664FF] hover:underline"
                          >
                            {task.name}
                          </Link>
                          {task.error ? (
                            <div className="mt-1 max-w-[260px] truncate text-xs text-[#F53F3F]">
                              {task.error}
                            </div>
                          ) : null}
                        </div>
                      </StudioTableCell>
                      <StudioTableCell>
                        {task.content ? (
                          <Link
                            href={`/contents/${task.content.id}`}
                            className="text-sm text-[#1664FF] hover:underline"
                          >
                            {task.content.title}
                          </Link>
                        ) : (
                          <span className="text-sm text-[#86909c]">
                            {copy.emDash}
                          </span>
                        )}
                      </StudioTableCell>
                      <StudioTableCell>
                        {task.platform ? (
                          <PlatformBadge platform={task.platform} size="sm" />
                        ) : (
                          <span className="text-xs text-[#86909c]">
                            {copy.emDash}
                          </span>
                        )}
                      </StudioTableCell>
                      <StudioTableCell variant="muted">
                        {task.account?.accountName ?? copy.emDash}
                      </StudioTableCell>
                      <StudioTableCell variant="muted">
                        {agentTypeLabels[task.agentType] ?? task.agentType}
                      </StudioTableCell>
                      <StudioTableCell>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                            taskStatusStyles[task.status]?.className
                          )}
                        >
                          {taskStatusStyles[task.status]?.label ?? task.status}
                        </span>
                      </StudioTableCell>
                      <StudioTableCell variant="muted">
                        {task.model ?? copy.emDash}
                      </StudioTableCell>
                      <StudioTableCell variant="muted">
                        {task.createdAt}
                      </StudioTableCell>
                      <StudioTableCell variant="muted">
                        {task.duration ?? copy.emDash}
                      </StudioTableCell>
                      <StudioTableCell variant="actions">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/agent-tasks/${task.id}`}
                            className="rounded p-1.5 hover:bg-[#F5F7FA]"
                            title={copy.viewDetail}
                          >
                            <Eye className="size-4 text-[#86909C]" />
                          </Link>
                          {task.status === 'FAILED' ? (
                            <button
                              type="button"
                              className="rounded p-1.5 hover:bg-[#F5F7FA]"
                              disabled={actionId === task.id}
                              onClick={() => retryRun(task.id)}
                              title={copy.retry}
                            >
                              <RefreshCw
                                className={cn(
                                  'size-4 text-[#F53F3F]',
                                  actionId === task.id && 'animate-spin'
                                )}
                              />
                            </button>
                          ) : null}
                          {task.status === 'RUNNING' ||
                          task.status === 'PENDING' ? (
                            <button
                              type="button"
                              className="rounded p-1.5 hover:bg-[#F5F7FA]"
                              disabled={actionId === task.id}
                              onClick={() => cancelRun(task.id)}
                              title={copy.cancel}
                            >
                              <StopCircle className="size-4 text-[#F53F3F]" />
                            </button>
                          ) : null}
                        </div>
                      </StudioTableCell>
                    </StudioTableRow>
                  ))}
                </StudioTableBody>
              </StudioTable>

              <div className="mt-6 flex items-center justify-between border-t border-[#E5E8EF] pt-4">
                <div className="text-sm text-[#86909C]">
                  {copy.page(currentPage, totalPages)}
                </div>
                <div className="flex items-center gap-4">
                  <Select
                    value={pageSize}
                    onValueChange={(value) => {
                      setPageSize(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger size="sm" className="h-8 w-24 text-xs">
                      <SelectValue placeholder={copy.pageSizePlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizeOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {copy.pageSize(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="size-8 p-0"
                      disabled={currentPage <= 1}
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                    >
                      <ChevronLeft className="size-4 text-[#86909C]" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="size-8 p-0"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </StudioCard>
      </PageContainer>
    </StudioLayout>
  );
}

function mapRunToTask(run: AgentRun): AgentTask {
  return {
    id: run.id,
    name: run.agent?.name ?? run.agent?.type ?? 'Agent Run',
    agentType: run.agent?.type ?? 'UNKNOWN',
    status: run.status,
    content: run.content,
    platform: run.version?.platform,
    account: run.version?.account
      ? { accountName: run.version.account.accountName }
      : undefined,
    model: run.model ?? undefined,
    error: run.error,
    createdAt: formatDateTime(run.startedAt),
    duration: formatDuration(run.startedAt, run.finishedAt),
  };
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
  if (!end) return undefined;
  const seconds = Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000)
  );
  if (seconds < 60) return copy.sec(seconds);
  const minutes = Math.floor(seconds / 60);
  return copy.minSec(minutes, seconds % 60);
}
