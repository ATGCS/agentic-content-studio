'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Bookmark,
  Bot,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Database,
  FileText,
  HelpCircle,
  Layers,
  Loader2,
  MessageSquareText,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Target,
  ThumbsUp,
  WandSparkles,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

/* ---------- types ---------- */

type ApiAgent = {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  enabled: boolean;
};

type ApiGenerateResult = {
  id: string;
  content?: string;
  output?: unknown;
  status: string;
};

type ApiAgentRun = {
  id: string;
  agentId: string;
  contentId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  output?: unknown;
  error?: string | null;
  startedAt: string;
  finishedAt?: string | null;
  agent?: { id: string; name: string; type: string };
  content?: { id: string; title: string; summary?: string | null };
  version?: {
    id: string;
    platform: string;
    account?: { accountName: string } | null;
  } | null;
};

/* ---------- agent icons ---------- */

const agentIconMap: Record<string, { icon: typeof Bot; color: string }> = {
  TITLE: { icon: Bot, color: '#3B82F6' },
  BODY: { icon: FileText, color: '#6366F1' },
  REWRITE: { icon: MessageSquareText, color: '#22C55E' },
  TAG: { icon: Target, color: '#F97316' },
  COVER_COPY: { icon: Layers, color: '#EF4444' },
  REVIEW: { icon: Check, color: '#14B8A6' },
  TOPIC: { icon: Sparkles, color: '#A855F7' },
  SUMMARY: { icon: Database, color: '#22C55E' },
};

const defaultAgentMeta = { icon: Bot, color: '#6B7280' };

function getAgentIcon(type: string) {
  return agentIconMap[type] ?? defaultAgentMeta;
}

/* ---------- format ---------- */

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function formatDurationMs(start: string, end?: string | null) {
  if (!end) return '—';
  const seconds = Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000)
  );
  if (seconds < 60) return `${seconds}秒`;
  return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
}

/* ---------- page ---------- */

const countOptions = ['1', '3', '5', '10'];

export default function AiGeneratePage() {
  const searchParams = useSearchParams();
  const preselectedContentId = searchParams.get('contentId');

  const [agents, setAgents] = useState<ApiAgent[]>([]);
  const [runs, setRuns] = useState<ApiAgentRun[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [generateCount, setGenerateCount] = useState('3');
  const [onlyUncollected, setOnlyUncollected] = useState(false);
  const [targetPlatform, setTargetPlatform] = useState('XIAOHONGSHU');
  const [targetAccount, setTargetAccount] = useState('');
  const [styleTone, setStyleTone] = useState('professional');
  const [emotionTone, setEmotionTone] = useState('positive');
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    preselectedContentId
  );
  const [selectedContent, setSelectedContent] = useState<{
    id: string;
    title: string;
    summary?: string | null;
  } | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<ApiGenerateResult[]>(
    []
  );
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  /* ---- load agents ---- */
  const loadAgents = useCallback(async () => {
    setLoadingAgents(true);
    try {
      const res = await api<ApiAgent[]>('/api/agents');
      setAgents(res.data.filter((a) => a.enabled));
      if (res.data.length > 0 && !selectedAgentId) {
        setSelectedAgentId(res.data[0].id);
      }
    } catch {
      setLoadError('Agent 列表加载失败');
    } finally {
      setLoadingAgents(false);
    }
  }, [selectedAgentId]);

  /* ---- load agent runs (history) ---- */
  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const res = await api<ApiAgentRun[]>('/api/agent-runs');
      setRuns(res.data);
    } catch {
      // 历史记录非必需
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadAgents(), loadRuns()]).catch(console.error);
  }, [loadAgents, loadRuns]);

  /* ---- load selected content ---- */
  useEffect(() => {
    if (preselectedContentId) {
      loadContent(preselectedContentId).catch(console.error);
    }
  }, [preselectedContentId]);

  const loadContent = useCallback(async (contentId: string) => {
    try {
      const res = await api<{
        id: string;
        title: string;
        summary?: string | null;
      }>(`/api/contents/${contentId}`);
      setSelectedContent(res.data);
      setSelectedContentId(contentId);
    } catch {
      console.error('Failed to load content');
    }
  }, []);

  /* ---- selected agent ---- */
  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId),
    [agents, selectedAgentId]
  );

  /* ---- generate ---- */
  async function handleGenerate() {
    if (!selectedAgentId) return;
    if (!selectedContentId) {
      alert('请先选择要处理的内容');
      window.location.href = '/contents';
      return;
    }
    setGenerating(true);
    setGeneratedResults([]);
    try {
      const res = await api<ApiAgentRun>('/api/agents/run', {
        method: 'POST',
        body: JSON.stringify({
          agentId: selectedAgentId,
          contentId: selectedContentId,
          agentType: selectedAgent?.type,
          versionId: undefined,
          overrides: { count: Number(generateCount), platform: targetPlatform },
        }),
      });
      // 将返回的 run 包装成结果列表
      const output = res.data.output as
        | { results?: { title: string; content?: string }[] }
        | undefined;
      const results: ApiGenerateResult[] = (output?.results ?? []).map(
        (r, i) => ({
          id: `${res.data.id}-${i}`,
          content: r.title ?? r.content,
          status: 'SUCCESS',
        })
      );
      setGeneratedResults(
        results.length > 0
          ? results
          : [
              {
                id: res.data.id,
                status: res.data.status,
                output: res.data.output,
              },
            ]
      );
      await loadRuns();
    } catch (error) {
      console.error('generate error', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : '生成失败，请稍后重试';
      alert(message);
      // 如果是 agent disabled 错误，重新加载 agent 列表
      if (message.includes('disabled')) {
        loadAgents();
      }
    } finally {
      setGenerating(false);
    }
  }

  /* ---- recent runs as history ---- */
  const recentRuns = useMemo(() => runs.slice(0, 10), [runs]);

  return (
    <>
      {/* 任务记录弹窗 */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agent 任务记录</DialogTitle>
            <DialogDescription>历史 Agent 执行记录</DialogDescription>
          </DialogHeader>
          {loadingRuns ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-[#1664FF]" />
            </div>
          ) : recentRuns.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#86909C]">
              暂无任务记录
            </p>
          ) : (
            <Table className="studio-table">
              <TableHeader>
                <TableRow>
                  {['Agent', '内容', '状态', '时间', '操作'].map((head) => (
                    <TableHead
                      key={head}
                      className="text-xs font-normal text-[#86909C]"
                    >
                      {head}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="text-sm">
                      {run.agent?.name ?? run.agentId}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {run.content?.title ?? '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-xs font-medium',
                          run.status === 'SUCCESS' &&
                            'bg-[#E8FFEA] text-[#00B42A]',
                          run.status === 'RUNNING' &&
                            'bg-[#E8F3FF] text-[#1664FF]',
                          run.status === 'PENDING' &&
                            'bg-[#FFF7E6] text-[#FF7D00]',
                          run.status === 'FAILED' &&
                            'bg-[#FFF1F0] text-[#F53F3F]'
                        )}
                      >
                        {run.status === 'SUCCESS'
                          ? '已完成'
                          : run.status === 'RUNNING'
                            ? '执行中'
                            : run.status === 'PENDING'
                              ? '待执行'
                              : '失败'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-[#86909C]">
                      {formatDateTime(run.startedAt)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/agent-tasks/${run.id}`}
                        className="text-xs text-[#1664FF] hover:underline"
                      >
                        详情
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <StudioLayout>
        <PageContainer>
          {loadError && (
            <StudioCard contentClassName="p-4 mb-4">
              <p className="text-sm text-[#F53F3F]">{loadError}</p>
            </StudioCard>
          )}

          <StudioCard contentClassName="p-0 overflow-hidden">
            <div className="border-b border-[#E5E8EF] px-5 py-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="text-xs text-[#86909C] mb-1">目标内容</div>
                  {selectedContent ? (
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/contents/${selectedContent.id}`}
                        className="inline-flex items-center gap-2 text-base font-semibold text-[#1664FF] hover:underline"
                      >
                        <FileText className="size-4" />
                        {selectedContent.title}
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedContent(null);
                          setSelectedContentId(null);
                        }}
                      >
                        更换
                      </Button>
                    </div>
                  ) : (
                    <button
                      className="inline-flex items-center gap-2 text-base font-semibold text-[#86909C] hover:text-[#1664FF]"
                      onClick={() => (window.location.href = '/contents')}
                    >
                      <FileText className="size-4" />
                      请先选择内容
                      <ChevronDown className="size-3 text-[#86909C]" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setHistoryOpen(true)}
                  >
                    <Clock className="size-3.5" />
                    任务记录
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <HelpCircle className="size-3.5" />
                    使用说明
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-6 mt-4 text-sm">
                <div>
                  <div className="text-xs text-[#86909C] mb-1">目标平台</div>
                  <Select
                    value={targetPlatform}
                    onValueChange={setTargetPlatform}
                  >
                    <SelectTrigger className="h-9 bg-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WECHAT">微信公众号</SelectItem>
                      <SelectItem value="XIAOHONGSHU">小红书</SelectItem>
                      <SelectItem value="DOUYIN">抖音</SelectItem>
                      <SelectItem value="BILIBILI">B站</SelectItem>
                      <SelectItem value="ZHIHU">知乎</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs text-[#86909C] mb-1">目标账号</div>
                  <Select
                    value={targetAccount || 'ANY'}
                    onValueChange={(val) =>
                      setTargetAccount(val === 'ANY' ? '' : val)
                    }
                  >
                    <SelectTrigger className="h-9 bg-white text-sm">
                      <SelectValue placeholder="选择账号" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANY">不指定</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs text-[#86909C] mb-1">内容类型</div>
                  <div className="text-[#1D2129] pt-1 text-sm">
                    图文文章（默认）
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#86909C] mb-1">状态</div>
                  <div
                    className={cn(
                      'text-[#1D2129] pt-1 text-sm',
                      selectedContent ? 'text-[#00B42A]' : 'text-[#F53F3F]'
                    )}
                  >
                    {selectedContent ? '已选择' : '未选择'}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[240px_1fr_420px] min-h-[560px]">
              {/* 左侧：Agent 选择 */}
              <aside className="border-r border-[#E5E8EF] bg-white p-5">
                <div className="text-sm font-semibold text-[#1D2129] mb-4">
                  1. 选择 Agent
                </div>
                {loadingAgents ? (
                  <div className="flex h-40 items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-[#1664FF]" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {agents.map((agent) => {
                      const { icon: Icon, color } = getAgentIcon(agent.type);
                      const active = selectedAgentId === agent.id;
                      return (
                        <button
                          key={agent.id}
                          className={cn(
                            'w-full rounded-lg border p-3 text-left transition-colors',
                            active
                              ? 'border-[#1664FF] bg-[#F0F5FF]'
                              : 'border-transparent bg-white hover:bg-[#F7F8FA]'
                          )}
                          onClick={() => setSelectedAgentId(agent.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                              style={{ backgroundColor: color }}
                            >
                              <Icon className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="truncate text-sm font-medium text-[#1D2129]">
                                  {agent.name}
                                </div>
                                {active && (
                                  <Check className="size-3.5 text-[#1664FF]" />
                                )}
                              </div>
                              <div className="truncate text-xs text-[#86909C]">
                                {agent.description ?? agent.type}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </aside>

              {/* 中间：生成参数 */}
              <main className="p-5 bg-[#FAFBFF] overflow-y-auto max-h-[700px]">
                <div className="text-sm font-semibold text-[#1D2129] mb-4">
                  2. 设置生成参数
                </div>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <div className="text-xs text-[#4E5969] mb-2">目标平台</div>
                    <Select
                      value={targetPlatform}
                      onValueChange={setTargetPlatform}
                    >
                      <SelectTrigger className="h-9 bg-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WECHAT">微信公众号</SelectItem>
                        <SelectItem value="XIAOHONGSHU">小红书</SelectItem>
                        <SelectItem value="DOUYIN">抖音</SelectItem>
                        <SelectItem value="BILIBILI">B站</SelectItem>
                        <SelectItem value="ZHIHU">知乎</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="text-xs text-[#4E5969] mb-2">目标账号</div>
                    <Select
                      value={targetAccount || 'ANY'}
                      onValueChange={(val) =>
                        setTargetAccount(val === 'ANY' ? '' : val)
                      }
                    >
                      <SelectTrigger className="h-9 bg-white text-sm">
                        <SelectValue placeholder="选择账号" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANY">不指定</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <div className="text-xs text-[#4E5969] mb-2">
                      风格与语气
                    </div>
                    <Select value={styleTone} onValueChange={setStyleTone}>
                      <SelectTrigger className="h-9 bg-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">
                          专业、干货、易读
                        </SelectItem>
                        <SelectItem value="casual">轻松、口语化</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="text-xs text-[#4E5969] mb-2">情绪倾向</div>
                    <Select value={emotionTone} onValueChange={setEmotionTone}>
                      <SelectTrigger className="h-9 bg-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positive">积极、鼓励</SelectItem>
                        <SelectItem value="neutral">客观、中性</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="text-xs text-[#4E5969] mb-2">生成数量</div>
                  <div className="grid grid-cols-4 gap-3">
                    {countOptions.map((count) => (
                      <button
                        key={count}
                        className={cn(
                          'h-9 rounded-md border text-sm transition-colors',
                          generateCount === count
                            ? 'border-[#1664FF] bg-[#F0F5FF] text-[#1664FF]'
                            : 'border-[#E5E8EF] bg-white text-[#4E5969] hover:bg-[#F7F8FA]'
                        )}
                        onClick={() => setGenerateCount(count)}
                      >
                        {count} 条
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_160px] gap-3">
                  <Button
                    className="h-10 bg-[#1664FF] text-white hover:bg-[#0E52D9]"
                    isLoading={generating}
                    disabled={!selectedAgentId || generating}
                    onClick={handleGenerate}
                  >
                    <WandSparkles className="size-4" />
                    开始生成
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 text-[#86909C]"
                    onClick={() => {
                      setGeneratedResults([]);
                      setGenerateCount('3');
                      setTargetPlatform('XIAOHONGSHU');
                      setTargetAccount('');
                    }}
                  >
                    清空设置
                  </Button>
                </div>
              </main>

              {/* 右侧：生成结果 */}
              <section className="border-l border-[#E5E8EF] bg-white p-5 overflow-y-auto max-h-[700px]">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-[#1D2129]">
                      3. 生成结果
                    </div>
                    {generatedResults.length > 0 && (
                      <span className="rounded bg-[#E8FFEA] px-2 py-0.5 text-xs text-[#00B42A]">
                        已生成 {generatedResults.length} 条
                      </span>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#4E5969]">
                    <button
                      className={cn(
                        'h-3.5 w-3.5 rounded-full border',
                        onlyUncollected
                          ? 'border-[#1664FF] bg-[#1664FF]'
                          : 'border-[#C9CDD4] bg-white'
                      )}
                      onClick={() => setOnlyUncollected(!onlyUncollected)}
                    />
                    仅看未采纳
                  </label>
                </div>
                {generating ? (
                  <div className="flex h-40 items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="mx-auto size-8 animate-spin text-[#1664FF]" />
                      <p className="mt-4 text-sm text-[#86909C]">
                        内容正在生成中…
                      </p>
                    </div>
                  </div>
                ) : generatedResults.length === 0 ? (
                  <div className="flex h-40 items-center justify-center">
                    <p className="text-sm text-[#86909C]">
                      选择 Agent 和参数后点击「开始生成」
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {generatedResults.map((result, index) => (
                      <div
                        key={result.id}
                        className="rounded-lg border border-[#BBD3FF] bg-white p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#86909C]">
                              结果 {index + 1}
                            </span>
                            <span className="rounded bg-[#E8FFEA] px-1.5 py-0.5 text-xs text-[#00B42A]">
                              推荐
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[#C9CDD4]">
                            <Bookmark className="size-4 cursor-pointer hover:text-[#1664FF]" />
                            <ThumbsUp className="size-4 cursor-pointer hover:text-[#1664FF]" />
                            <Copy className="size-4 cursor-pointer hover:text-[#1664FF]" />
                          </div>
                        </div>
                        <h4 className="mb-3 text-sm font-semibold leading-6 text-[#1D2129]">
                          {typeof result.content === 'string'
                            ? result.content
                            : result.status}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 flex-1 text-xs text-[#86909C]"
                          >
                            采纳
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 flex-1 text-xs text-[#4E5969]"
                          >
                            写入内容
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 flex-1 text-xs text-[#4E5969]"
                          >
                            优化
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {generatedResults.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 h-8 w-full text-xs text-[#1664FF]"
                    disabled={generating}
                    onClick={handleGenerate}
                  >
                    <RefreshCw className="size-3.5" />
                    重新生成
                  </Button>
                )}
              </section>
            </div>
          </StudioCard>

          {/* 生成历史 */}
          <StudioCard contentClassName="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#1D2129]">
                生成历史（最近 {recentRuns.length} 条）
              </div>
              <button
                className="text-xs text-[#1664FF]"
                onClick={() => setHistoryOpen(true)}
              >
                查看全部记录
              </button>
            </div>
            <Table className="studio-table">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-[#E5E8EF]">
                  {[
                    'Agent',
                    '内容',
                    '目标平台',
                    '目标账号',
                    '生成时间',
                    '状态',
                    '操作',
                  ].map((head) => (
                    <TableHead
                      key={head}
                      className="py-3 text-xs font-normal text-[#86909C]"
                    >
                      {head}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRuns ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-[#86909C]"
                    >
                      加载中…
                    </TableCell>
                  </TableRow>
                ) : recentRuns.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-[#86909C]"
                    >
                      暂无生成记录
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRuns.map((run, index) => (
                    <TableRow
                      key={run.id}
                      className="border-[#E5E8EF] hover:bg-[#F7F8FA]"
                    >
                      <TableCell className="py-3 text-sm text-[#4E5969]">
                        {run.agent?.name ?? run.agentId}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate py-3 text-sm text-[#4E5969]">
                        {run.content?.title ?? '—'}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-[#4E5969]">
                        {run.version?.platform ?? '—'}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-[#4E5969]">
                        {run.version?.account?.accountName ?? '—'}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-[#86909C]">
                        {formatDateTime(run.startedAt)}
                      </TableCell>
                      <TableCell className="py-3">
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 text-xs font-medium',
                            run.status === 'SUCCESS' &&
                              'bg-[#E8FFEA] text-[#00B42A]',
                            run.status === 'RUNNING' &&
                              'bg-[#E8F3FF] text-[#1664FF]',
                            run.status === 'PENDING' &&
                              'bg-[#FFF7E6] text-[#FF7D00]',
                            run.status === 'FAILED' &&
                              'bg-[#FFF1F0] text-[#F53F3F]'
                          )}
                        >
                          {run.status === 'SUCCESS'
                            ? '已完成'
                            : run.status === 'RUNNING'
                              ? '执行中'
                              : run.status === 'PENDING'
                                ? '待执行'
                                : '失败'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-4 text-xs text-[#1664FF]">
                          <Link
                            href={`/agent-tasks/${run.id}`}
                            className="hover:underline"
                          >
                            查看结果
                          </Link>
                          {run.status === 'FAILED' && (
                            <button className="hover:underline">
                              重新生成
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </StudioCard>
        </PageContainer>
      </StudioLayout>
    </>
  );
}
