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
import {
  PageContainer,
  PageHeader,
} from '@/components/layout/page-container';
import { EmptyState } from '@/components/studio/empty-state';
import { StudioCard } from '@/components/studio/studio-card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

type AgentRun = {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  input?: unknown;
  output?: unknown;
  error?: string | null;
  model?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  agent?: {
    id: string;
    name: string;
    type: string;
  };
  content?: {
    id: string;
    title: string;
  };
  version?: {
    id: string;
    platform: string;
    account?: {
      id: string;
      accountName: string;
    } | null;
  } | null;
};

type AgentTask = {
  id: string;
  taskId: string;
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

const agentTypeLabels: Record<string, string> = {
  TITLE: '标题生成 Agent',
  BODY: '正文生成 Agent',
  REWRITE: '平台改写 Agent',
  REVIEW: '审核检查 Agent',
  TAG: '标签生成 Agent',
  SUMMARY: '数据分析 Agent',
  IMAGE: '图片提示词 Agent',
  VIDEO_SCRIPT: '视频脚本 Agent',
  TOPIC: '选题生成 Agent',
  COVER_COPY: '封面文案 Agent',
  COMPETITOR: '竞品分析 Agent',
};

const taskTypeOptions = [
  { value: 'ALL', label: '全部' },
  { value: 'TITLE', label: '标题生成' },
  { value: 'BODY', label: '正文生成' },
  { value: 'REWRITE', label: '平台改写' },
  { value: 'REVIEW', label: '审核检查' },
  { value: 'TAG', label: '标签生成' },
  { value: 'SUMMARY', label: '数据分析' },
];

const statusOptions = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING', label: '待执行' },
  { value: 'RUNNING', label: '执行中' },
  { value: 'SUCCESS', label: '已完成' },
  { value: 'FAILED', label: '失败' },
];

const taskStatusStyles: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: '待执行',
    className: 'bg-[#FFF7E6] text-[#FF7D00]',
  },
  RUNNING: {
    label: '执行中',
    className: 'bg-[#E8F3FF] text-[#1664FF]',
  },
  SUCCESS: {
    label: '已完成',
    className: 'bg-[#E8FFEA] text-[#00B42A]',
  },
  FAILED: {
    label: '失败',
    className: 'bg-[#FFF1F0] text-[#F53F3F]',
  },
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

  async function loadRuns() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (taskType !== 'ALL') params.set('agentType', taskType);
      const query = params.toString();
      const res = await api<AgentRun[]>(`/api/agent-runs${query ? `?${query}` : ''}`);
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
      { label: '待执行', count: counts.PENDING, icon: FileText, bg: '#FFF7E6', color: '#FF7D00' },
      { label: '执行中', count: counts.RUNNING, icon: Clock, bg: '#E8F3FF', color: '#1664FF' },
      { label: '已完成', count: counts.SUCCESS, icon: CheckCircle2, bg: '#E8FFEA', color: '#00B42A' },
      { label: '失败', count: counts.FAILED, icon: XCircle, bg: '#FFF1F0', color: '#F53F3F' },
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
      await api<AgentRun>(`/api/agent-runs/${id}/retry`, { method: 'POST' });
      await loadRuns();
    } finally {
      setActionId(null);
    }
  }

  async function cancelRun(id: string) {
    setActionId(id);
    try {
      await api<AgentRun>(`/api/agent-runs/${id}/cancel`, { method: 'POST' });
      await loadRuns();
    } finally {
      setActionId(null);
    }
  }

  return (
    <StudioLayout>
      <PageContainer>
        <PageHeader
          title="Agent 任务中心"
          description="管理和监控所有 Agent 任务的执行情况，生成过程可追踪、可管理、可审计"
        />

        <StudioCard contentClassName="p-5">
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#86909C]">任务类型</span>
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
              <span className="text-xs text-[#86909C]">状态</span>
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
                重置
              </Button>
              <Button size="sm" className="h-8 text-xs" isLoading={loading} onClick={loadRuns}>
                查询
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
                    <div className="text-lg font-semibold text-[#1D2129]">{stat.count}</div>
                    <div className="text-xs text-[#86909C]">{stat.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-medium text-[#1D2129]">任务列表</div>
            <div className="text-xs text-[#86909C]">共 {items.length} 条</div>
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-[#1664FF]" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState title="暂无 Agent 运行记录" description="执行内容生成或审核后，这里会展示真实 AgentRun 记录" />
          ) : (
            <>
              <Table className="studio-table -mx-5 border-t border-[#E5E8EF] px-5">
                <TableHeader>
                  <TableRow className="border-[#E5E8EF] hover:bg-transparent">
                    <TableHead className="min-w-[220px] py-3 text-xs font-normal text-[#86909C]">任务名称</TableHead>
                    <TableHead className="py-3 text-xs font-normal text-[#86909C]">内容项目</TableHead>
                    <TableHead className="py-3 text-xs font-normal text-[#86909C]">目标平台</TableHead>
                    <TableHead className="py-3 text-xs font-normal text-[#86909C]">目标账号</TableHead>
                    <TableHead className="py-3 text-xs font-normal text-[#86909C]">执行 Agent</TableHead>
                    <TableHead className="py-3 text-xs font-normal text-[#86909C]">执行状态</TableHead>
                    <TableHead className="py-3 text-xs font-normal text-[#86909C]">调用模型</TableHead>
                    <TableHead className="py-3 text-xs font-normal text-[#86909C]">生成时间</TableHead>
                    <TableHead className="py-3 text-xs font-normal text-[#86909C]">耗时</TableHead>
                    <TableHead className="py-3 text-right text-xs font-normal text-[#86909C]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedItems.map((task) => (
                    <TableRow key={task.id} className="border-[#E5E8EF] hover:bg-[#F7F8FA]">
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <Link
                            href={`/agent-tasks/${task.id}`}
                            className="text-sm font-medium text-[#1D2129] hover:text-[#1664FF] hover:underline"
                          >
                            {task.name}
                          </Link>
                          <div className="text-xs text-[#86909C]">{task.taskId}</div>
                          {task.error ? <div className="mt-1 max-w-[260px] truncate text-xs text-[#F53F3F]">{task.error}</div> : null}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="text-sm text-[#4E5969]">{task.content?.title ?? '—'}</div>
                      </TableCell>
                      <TableCell className="py-3">
                        <PlatformBadge platform={task.platform ?? ''} size="sm" />
                      </TableCell>
                      <TableCell className="py-3 text-sm text-[#4E5969]">{task.account?.accountName ?? '—'}</TableCell>
                      <TableCell className="py-3 text-sm text-[#4E5969]">{agentTypeLabels[task.agentType] ?? task.agentType}</TableCell>
                      <TableCell className="py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                            taskStatusStyles[task.status]?.className
                          )}
                        >
                          {taskStatusStyles[task.status]?.label ?? task.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-[#86909C]">{task.model ?? '—'}</TableCell>
                      <TableCell className="py-3 text-sm text-[#86909C]">{task.createdAt}</TableCell>
                      <TableCell className="py-3 text-xs text-[#86909C]">{task.duration ?? '—'}</TableCell>
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/agent-tasks/${task.id}`} className="rounded p-1.5 hover:bg-[#F5F7FA]">
                            <Eye className="size-4 text-[#86909C]" />
                          </Link>
                          {task.status === 'FAILED' ? (
                            <button
                              className="rounded p-1.5 hover:bg-[#F5F7FA]"
                              disabled={actionId === task.id}
                              onClick={() => retryRun(task.id)}
                              title="重试"
                            >
                              <RefreshCw className={cn('size-4 text-[#F53F3F]', actionId === task.id && 'animate-spin')} />
                            </button>
                          ) : null}
                          {task.status === 'RUNNING' || task.status === 'PENDING' ? (
                            <button
                              className="rounded p-1.5 hover:bg-[#F5F7FA]"
                              disabled={actionId === task.id}
                              onClick={() => cancelRun(task.id)}
                              title="取消"
                            >
                              <StopCircle className="size-4 text-[#F53F3F]" />
                            </button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 flex items-center justify-between border-t border-[#E5E8EF] pt-4">
                <div className="text-sm text-[#86909C]">第 {currentPage} / {totalPages} 页</div>
                <div className="flex items-center gap-4">
                  <Select value={pageSize} onValueChange={(value) => { setPageSize(value); setCurrentPage(1); }}>
                    <SelectTrigger size="sm" className="h-8 w-24 text-xs">
                      <SelectValue placeholder="10条/页" />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizeOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}条/页</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="size-8 p-0"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    >
                      <ChevronLeft className="size-4 text-[#86909C]" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="size-8 p-0"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
    taskId: run.id,
    name: run.agent?.name ?? run.agent?.type ?? 'Agent Run',
    agentType: run.agent?.type ?? 'UNKNOWN',
    status: run.status,
    content: run.content,
    platform: run.version?.platform,
    account: run.version?.account ? { accountName: run.version.account.accountName } : undefined,
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
  const seconds = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}分${seconds % 60}秒`;
}
