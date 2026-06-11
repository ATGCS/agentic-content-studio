'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  StopCircle,
} from 'lucide-react';
import { DialogWrapper } from '@/components/dialog-wrapper';
import { PlatformBadge } from '@/components/studio/platform-badge';
import { StudioCard } from '@/components/studio/studio-card';
import { StudioTabs } from '@/components/studio/studio-tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { agentTypeLabels, taskStatusStyles } from '@/app/agent-tasks/strings';

type AgentRunDetail = {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  model?: string | null;
  promptVersion?: string | null;
  error?: string | null;
  input?: unknown;
  output?: unknown;
  startedAt: string;
  finishedAt?: string | null;
  agent?: {
    id: string;
    name: string;
    type: string;
    prompt?: { id: string; name: string; version: string } | null;
  };
  content?: { id: string; title: string; status: string } | null;
  version?: {
    id: string;
    platform: string;
    title?: string | null;
    account?: { id: string; accountName: string } | null;
  } | null;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function formatDuration(start: string, end?: string | null) {
  if (!end) return '—';
  const seconds = Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000)
  );
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} 分 ${seconds % 60} 秒`;
}

function JsonBlock({ value }: { value: unknown }) {
  if (value == null) {
    return <p className="text-sm text-[#86909c]">无数据</p>;
  }
  return (
    <pre className="max-h-[min(360px,40vh)] overflow-auto rounded-lg bg-[#f7f8fa] p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono text-[#4e5969]">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

interface AgentTaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId: string | null;
  onChanged?: () => void;
  onRunIdChange?: (id: string) => void;
}

export function AgentTaskDetailDialog({
  open,
  onOpenChange,
  runId,
  onChanged,
  onRunIdChange,
}: AgentTaskDetailDialogProps) {
  const [run, setRun] = useState<AgentRunDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('output');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<AgentRunDetail>(`/api/agent-runs/${id}`);
      setRun(res.data);
      setActiveRunId(id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '加载失败');
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !runId) {
      setRun(null);
      setError(null);
      setTab('output');
      setActiveRunId(null);
      return;
    }
    void load(runId);
  }, [open, runId, load]);

  async function retryRun() {
    if (!run) return;
    setActionLoading(true);
    try {
      const res = await api<AgentRunDetail>(`/api/agent-runs/${run.id}/retry`, {
        method: 'POST',
      });
      await load(res.data.id);
      onRunIdChange?.(res.data.id);
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '重试失败');
    } finally {
      setActionLoading(false);
    }
  }

  async function cancelRun() {
    if (!run) return;
    setActionLoading(true);
    try {
      await api(`/api/agent-runs/${run.id}/cancel`, { method: 'POST' });
      await load(run.id);
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '取消失败');
    } finally {
      setActionLoading(false);
    }
  }

  const status = run ? taskStatusStyles[run.status] : undefined;
  const tabs = run
    ? [
        { value: 'output', label: '输出结果' },
        { value: 'input', label: '输入参数' },
        ...(run.error ? [{ value: 'error', label: '错误信息' }] : []),
      ]
    : [];

  const title =
    run?.agent?.name ?? agentTypeLabels[run?.agent?.type ?? ''] ?? 'Agent 任务';

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title={loading && !run ? '加载任务…' : title}
      description={
        activeRunId ? `任务 ID：${activeRunId}` : '查看 Agent 执行详情'
      }
      className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[960px]"
    >
      {loading && !run ? (
        <div className="flex h-48 items-center justify-center gap-2 text-sm text-[#86909c]">
          <Loader2 className="size-4 animate-spin" />
          加载中…
        </div>
      ) : !run ? (
        <div className="py-8 text-center text-sm text-[#F53F3F]">
          {error ?? '任务不存在'}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-wrap items-center gap-2">
            {run.status === 'FAILED' && (
              <Button size="sm" isLoading={actionLoading} onClick={retryRun}>
                <RotateCcw className="size-3.5" />
                重新执行
              </Button>
            )}
            {(run.status === 'PENDING' || run.status === 'RUNNING') && (
              <Button
                size="sm"
                variant="outline"
                isLoading={actionLoading}
                onClick={cancelRun}
              >
                <StopCircle className="size-3.5" />
                取消任务
              </Button>
            )}
            {run.content && (
              <>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/contents/${run.content.id}`}>查看内容</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/contents/${run.content.id}`}>
                    <History className="size-3.5" />
                    生成历史
                  </Link>
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => activeRunId && load(activeRunId)}
            >
              <RefreshCw className="size-3.5" />
              刷新
            </Button>
          </div>

          {error && (
            <p className="rounded-lg bg-[#FFF1F0] px-3 py-2 text-sm text-[#F53F3F]">
              {error}
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <StudioCard contentClassName="p-4">
              <StudioTabs items={tabs} value={tab} onChange={setTab} />
              <div className="mt-4">
                {tab === 'output' && <JsonBlock value={run.output} />}
                {tab === 'input' && <JsonBlock value={run.input} />}
                {tab === 'error' && (
                  <p className="text-sm text-[#F53F3F]">{run.error}</p>
                )}
              </div>
            </StudioCard>

            <aside>
              <StudioCard contentClassName="space-y-4 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-[#E8F3FF]">
                    <Bot className="size-5 text-[#1664FF]" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#1D2129]">
                      {agentTypeLabels[run.agent?.type ?? ''] ??
                        run.agent?.type}
                    </p>
                    <span
                      className={cn(
                        'mt-1 inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                        status?.className
                      )}
                    >
                      {status?.label ?? run.status}
                    </span>
                  </div>
                </div>
                <dl className="space-y-2.5 border-t border-[#eef0f5] pt-4 text-xs">
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#86909c]">关联内容</dt>
                    <dd className="text-right text-[#1D2129]">
                      {run.content ? (
                        <Link
                          href={`/contents/${run.content.id}`}
                          className="text-[#1664ff] hover:underline"
                        >
                          {run.content.title}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  {run.version && (
                    <>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#86909c]">目标平台</dt>
                        <dd>
                          <PlatformBadge
                            platform={run.version.platform}
                            size="sm"
                          />
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#86909c]">目标账号</dt>
                        <dd className="text-[#4e5969]">
                          {run.version.account?.accountName ?? '—'}
                        </dd>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#86909c]">调用模型</dt>
                    <dd className="text-[#4e5969]">{run.model ?? '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#86909c]">Prompt 版本</dt>
                    <dd className="text-[#4e5969]">
                      {run.promptVersion ?? run.agent?.prompt?.version ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#86909c]">开始时间</dt>
                    <dd className="text-[#4e5969]">
                      {formatDateTime(run.startedAt)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#86909c]">结束时间</dt>
                    <dd className="text-[#4e5969]">
                      {run.finishedAt ? formatDateTime(run.finishedAt) : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-[#86909c]">耗时</dt>
                    <dd className="font-medium text-[#1D2129]">
                      {formatDuration(run.startedAt, run.finishedAt)}
                    </dd>
                  </div>
                </dl>
              </StudioCard>
            </aside>
          </div>
        </div>
      )}
    </DialogWrapper>
  );
}
