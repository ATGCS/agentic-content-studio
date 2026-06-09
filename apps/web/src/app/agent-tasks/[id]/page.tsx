'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  History,
  RefreshCw,
  RotateCcw,
  StopCircle,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { PlatformBadge } from '@/components/studio/platform-badge';
import { StudioCard } from '@/components/studio/studio-card';
import { StudioTabs } from '@/components/studio/studio-tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';

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

const agentTypeLabels: Record<string, string> = {
  TITLE: '标题生成',
  BODY: '正文生成',
  REWRITE: '平台改写',
  REVIEW: '审核检查',
  TAG: '标签生成',
  SUMMARY: '摘要生成',
  IMAGE: '图片提示词',
  VIDEO_SCRIPT: '视频脚本',
  TOPIC: '选题生成',
  COVER_COPY: '封面文案',
  COMPETITOR: '竞品分析',
};

const statusStyles: Record<string, { label: string; className: string }> = {
  PENDING: { label: '待执行', className: 'bg-[#FFF7E6] text-[#FF7D00]' },
  RUNNING: { label: '执行中', className: 'bg-[#E8F3FF] text-[#1664FF]' },
  SUCCESS: { label: '已完成', className: 'bg-[#E8FFEA] text-[#00B42A]' },
  FAILED: { label: '失败', className: 'bg-[#FFF1F0] text-[#F53F3F]' },
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
    <pre className="max-h-[480px] overflow-auto rounded-lg bg-[#f7f8fa] p-4 text-xs leading-relaxed text-[#4e5969] whitespace-pre-wrap font-mono">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function AgentTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [run, setRun] = useState<AgentRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('output');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<AgentRunDetail>(`/api/agent-runs/${id}`);
      setRun(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '加载失败');
      setRun(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function retryRun() {
    if (!run) return;
    setActionLoading(true);
    try {
      const res = await api<AgentRunDetail>(`/api/agent-runs/${run.id}/retry`, {
        method: 'POST',
      });
      router.replace(`/agent-tasks/${res.data.id}`);
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
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '取消失败');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <StudioLayout>
        <PageContainer>
          <p className="text-sm text-[#86909c]">加载中…</p>
        </PageContainer>
      </StudioLayout>
    );
  }

  if (!run) {
    return (
      <StudioLayout>
        <PageContainer>
          <StudioCard contentClassName="p-6 text-center">
            <p className="text-sm text-[#F53F3F]">{error ?? '任务不存在'}</p>
            <Button className="mt-4" variant="outline" asChild>
              <Link href="/agent-tasks">返回任务列表</Link>
            </Button>
          </StudioCard>
        </PageContainer>
      </StudioLayout>
    );
  }

  const status = statusStyles[run.status];
  const tabs = [
    { value: 'output', label: '输出结果' },
    { value: 'input', label: '输入参数' },
    ...(run.error ? [{ value: 'error', label: '错误信息' }] : []),
  ];

  return (
    <StudioLayout>
      <PageContainer className="max-w-none gap-4">
        <Link
          href="/agent-tasks"
          className="inline-flex items-center gap-1.5 text-sm text-[#86909c] hover:text-[#1664ff]"
        >
          <ArrowLeft className="size-4" />
          返回任务记录
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1D2129]">
              {run.agent?.name ??
                agentTypeLabels[run.agent?.type ?? ''] ??
                'Agent 任务'}
            </h1>
            <p className="mt-2 text-xs text-[#86909c]">任务 ID：{run.id}</p>
          </div>
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
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className="size-3.5" />
              刷新
            </Button>
          </div>
        </div>

        {error && (
          <StudioCard contentClassName="p-3">
            <p className="text-sm text-[#F53F3F]">{error}</p>
          </StudioCard>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <StudioCard contentClassName="p-5">
              <StudioTabs items={tabs} value={tab} onChange={setTab} />
              <div className="mt-4">
                {tab === 'output' && <JsonBlock value={run.output} />}
                {tab === 'input' && <JsonBlock value={run.input} />}
                {tab === 'error' && (
                  <p className="text-sm text-[#F53F3F]">{run.error}</p>
                )}
              </div>
            </StudioCard>
          </div>

          <aside className="space-y-4">
            <StudioCard contentClassName="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-[#E8F3FF]">
                  <Bot className="size-5 text-[#1664FF]" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#1D2129]">
                    {agentTypeLabels[run.agent?.type ?? ''] ?? run.agent?.type}
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

            <StudioCard contentClassName="p-4 text-xs leading-relaxed text-[#86909c]">
              <p className="font-medium text-[#4e5969]">与「生成历史」的区别</p>
              <p className="mt-2">
                本页展示 Agent
                的技术执行记录（输入/输出/模型/状态）。内容的标题、正文快照与恢复请在对应内容的「生成历史」面板中查看。
              </p>
            </StudioCard>
          </aside>
        </div>
      </PageContainer>
    </StudioLayout>
  );
}
