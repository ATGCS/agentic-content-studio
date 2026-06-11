'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bot,
  ChevronRight,
  ExternalLink,
  FileStack,
  Layers,
  ListTree,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, getToken } from '@/lib/api';
import { cn } from '@/lib/utils';

type ButlerAction = {
  type: string;
  label: string;
  href?: string;
  payload?: Record<string, unknown>;
};

type ButlerProposal = {
  id: string;
  kind: string;
  status: 'pending' | 'confirmed' | 'rejected';
};

type ButlerMessage = {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'TOOL';
  content: string;
  metadata?: {
    actions?: ButlerAction[];
    toolId?: string;
    proposal?: ButlerProposal;
  } | null;
  createdAt: string;
};

type ButlerSession = {
  id: string;
  title: string | null;
  topicId: string | null;
  updatedAt?: string;
  topic?: { id: string; title: string } | null;
  messages: ButlerMessage[];
};

type SessionListItem = ButlerSession & {
  messages?: Array<{ content: string; createdAt: string; role: string }>;
};

type TopicOption = {
  id: string;
  title: string;
  contentCount?: number;
};

const QUICK_COMMANDS = [
  {
    label: '写一篇文章',
    text: '帮我写一篇小红书风格的文章，主题你帮我定',
    icon: FileStack,
    needsTopic: false,
  },
  {
    label: '改写优化',
    text: '帮我优化一段营销文案，让语气更自然',
    icon: Zap,
    needsTopic: false,
  },
  {
    label: '同步知识库',
    text: '同步知识库',
    icon: RefreshCw,
    needsTopic: false,
  },
  {
    label: '规划大纲',
    text: '规划 5 篇文章大纲',
    icon: ListTree,
    needsTopic: true,
  },
  {
    label: '系列进度',
    text: '查看系列进度',
    icon: Layers,
    needsTopic: true,
  },
  {
    label: '按大纲建文',
    text: '按大纲创建文章',
    icon: FileStack,
    needsTopic: true,
  },
  {
    label: '一键生成',
    text: '一键生成',
    icon: Zap,
    needsTopic: true,
  },
] as const;

function renderMarkdownLite(text: string) {
  return text.split('\n').map((line, i) => {
    const html = line
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/^· /, '• ');
    return (
      <span
        key={i}
        className="block min-h-[1.25rem]"
        dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }}
      />
    );
  });
}

function sessionPreview(session: SessionListItem) {
  const last = session.messages?.[0];
  if (last?.content) {
    return last.content.length > 40
      ? `${last.content.slice(0, 40)}…`
      : last.content;
  }
  return '新对话';
}

function formatSessionTime(dateStr?: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function ProposalBadge({ status }: { status: ButlerProposal['status'] }) {
  if (status === 'pending') {
    return (
      <span className="mb-2 inline-block rounded-full bg-[#FFF7E8] px-2.5 py-0.5 text-[11px] font-medium text-[#FF7D00]">
        待确认 · 确认后才会写入数据库
      </span>
    );
  }
  if (status === 'confirmed') {
    return (
      <span className="mb-2 inline-block rounded-full bg-[#E8FFEA] px-2.5 py-0.5 text-[11px] font-medium text-[#00B42A]">
        已确认并应用
      </span>
    );
  }
  return (
    <span className="mb-2 inline-block rounded-full bg-[#F2F3F5] px-2.5 py-0.5 text-[11px] font-medium text-[#86909C]">
      已放弃
    </span>
  );
}

function ActionCard({
  action,
  onAction,
  disabled,
}: {
  action: ButlerAction;
  onAction: (action: ButlerAction) => void;
  disabled?: boolean;
}) {
  if (action.type === 'confirm_proposal') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction(action)}
        className="inline-flex items-center gap-1 rounded-lg bg-[#1664FF] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#0E52D9] disabled:opacity-50"
      >
        {action.label}
      </button>
    );
  }
  if (action.type === 'reject_proposal') {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction(action)}
        className="inline-flex items-center gap-1 rounded-lg border border-[#E5E8EF] bg-white px-4 py-2 text-xs font-medium text-[#4E5969] transition-colors hover:border-[#C9CDD4] disabled:opacity-50"
      >
        {action.label}
      </button>
    );
  }
  if (action.href) {
    return (
      <Link
        href={action.href}
        className="inline-flex items-center gap-1 rounded-lg border border-[#E5E8EF] bg-white px-3 py-1.5 text-xs font-medium text-[#1664FF] transition-colors hover:border-[#1664FF]/40 hover:bg-[#F0F5FF]"
      >
        {action.label}
        <ChevronRight className="size-3" />
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAction(action)}
      className="inline-flex items-center gap-1 rounded-lg border border-[#E5E8EF] bg-white px-3 py-1.5 text-xs font-medium text-[#1664FF] transition-colors hover:border-[#1664FF]/40 hover:bg-[#F0F5FF] disabled:opacity-50"
    >
      {action.label}
    </button>
  );
}

export function ButlerChat({
  initialTopicId,
  className,
}: {
  initialTopicId?: string;
  className?: string;
}) {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [session, setSession] = useState<ButlerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadTopics = useCallback(async () => {
    const res = await api<{ items: TopicOption[] }>('/api/topics?pageSize=50');
    setTopics(res.data.items);
    return res.data.items;
  }, []);

  const loadSessions = useCallback(async () => {
    const res = await api<{ items: SessionListItem[] }>(
      '/api/studio/butler/sessions?pageSize=30'
    );
    setSessions(res.data.items);
    return res.data.items;
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    const detail = await api<ButlerSession>(
      `/api/studio/butler/sessions/${sessionId}`
    );
    setSession(detail.data);
    return detail.data;
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      await loadTopics();
      const items = await loadSessions();
      const topicMatch = initialTopicId
        ? items.find((s) => s.topicId === initialTopicId)
        : undefined;

      if (topicMatch) {
        await loadSession(topicMatch.id);
        return;
      }
      if (items.length > 0 && !initialTopicId) {
        await loadSession(items[0].id);
        return;
      }
      const created = await api<ButlerSession>('/api/studio/butler/sessions', {
        method: 'POST',
        body: JSON.stringify({ topicId: initialTopicId }),
      });
      await loadSession(created.data.id);
      await loadSessions();
    } finally {
      setLoading(false);
    }
  }, [initialTopicId, loadSession, loadSessions, loadTopics]);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages.length, sending]);

  async function selectSession(sessionId: string) {
    if (session?.id === sessionId) return;
    setListLoading(true);
    try {
      await loadSession(sessionId);
    } finally {
      setListLoading(false);
    }
  }

  async function createNewSession() {
    setListLoading(true);
    try {
      const created = await api<ButlerSession>('/api/studio/butler/sessions', {
        method: 'POST',
        body: JSON.stringify({
          topicId: session?.topicId ?? initialTopicId,
        }),
      });
      await loadSession(created.data.id);
      await loadSessions();
    } finally {
      setListLoading(false);
    }
  }

  async function changeTopic(topicId: string) {
    if (!session) return;
    const nextId = topicId === '__none__' ? null : topicId;
    setListLoading(true);
    try {
      const res = await api<ButlerSession>(
        `/api/studio/butler/sessions/${session.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ topicId: nextId }),
        }
      );
      setSession(res.data);
      await loadSessions();
    } finally {
      setListLoading(false);
    }
  }

  async function sendMessage(text: string) {
    if (!session || !text.trim() || sending) return;
    setSending(true);
    setInput('');
    const streamAssistantId = `stream-${Date.now()}`;

    try {
      const token = getToken();
      const res = await fetch(
        `/api/studio/butler/sessions/${session.id}/messages/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ content: text.trim() }),
        }
      );

      if (!res.ok || !res.body) {
        throw new Error(`stream failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamText = '';

      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: `pending-user-${Date.now()}`,
              role: 'USER' as const,
              content: text.trim(),
              createdAt: new Date().toISOString(),
            },
            {
              id: streamAssistantId,
              role: 'ASSISTANT' as const,
              content: '',
              createdAt: new Date().toISOString(),
            },
          ],
        };
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as {
            type: string;
            text?: string;
            message?: string;
            data?: {
              id?: string;
              content?: string;
              createdAt?: string;
              assistantMessage?: ButlerMessage & { metadata?: unknown };
              actions?: ButlerAction[];
            };
          };

          if (event.type === 'user_message' && event.data) {
            setSession((prev) => {
              if (!prev) return prev;
              const msgs = [...prev.messages];
              const userIdx = msgs.findIndex((m) =>
                m.id.startsWith('pending-user-')
              );
              if (userIdx >= 0) {
                msgs[userIdx] = {
                  id: event.data!.id!,
                  role: 'USER',
                  content: event.data!.content ?? text.trim(),
                  createdAt: String(event.data!.createdAt),
                };
              }
              return { ...prev, messages: msgs };
            });
          }

          if (event.type === 'delta' && event.text) {
            streamText += event.text;
            setSession((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === streamAssistantId ? { ...m, content: streamText } : m
                ),
              };
            });
          }

          if (event.type === 'done' && event.data?.assistantMessage) {
            const am = event.data.assistantMessage;
            setSession((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === streamAssistantId
                    ? {
                        id: am.id,
                        role: 'ASSISTANT' as const,
                        content: am.content,
                        createdAt: String(am.createdAt),
                        metadata:
                          typeof am.metadata === 'object' && am.metadata
                            ? (am.metadata as ButlerMessage['metadata'])
                            : {
                                actions: event.data?.actions,
                              },
                      }
                    : m
                ),
              };
            });
          }

          if (event.type === 'error') {
            throw new Error(event.message ?? 'stream error');
          }
        }
      }

      await loadSessions();
    } catch {
      await api(`/api/studio/butler/sessions/${session.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: text.trim() }),
      }).then((res) => {
        setSession((prev) => {
          if (!prev) return prev;
          const withoutStream = prev.messages.filter(
            (m) =>
              !m.id.startsWith('pending-user-') && m.id !== streamAssistantId
          );
          return {
            ...prev,
            messages: [
              ...withoutStream,
              {
                ...res.data.userMessage,
                role: 'USER' as const,
                createdAt: String(res.data.userMessage.createdAt),
              },
              {
                ...res.data.assistantMessage,
                role: 'ASSISTANT' as const,
                createdAt: String(res.data.assistantMessage.createdAt),
                metadata:
                  typeof res.data.assistantMessage.metadata === 'object'
                    ? res.data.assistantMessage.metadata
                    : { actions: res.data.actions },
              },
            ],
          };
        });
      });
    } finally {
      setSending(false);
    }
  }

  async function confirmProposal(
    messageId: string,
    decision: 'confirm' | 'reject'
  ) {
    if (!session || sending) return;
    setSending(true);
    try {
      const res = await api<{
        followUpMessage: ButlerMessage;
        proposal: ButlerProposal;
        actions?: ButlerAction[];
      }>(`/api/studio/butler/sessions/${session.id}/proposals/confirm`, {
        method: 'POST',
        body: JSON.stringify({ messageId, decision }),
      });

      await loadSession(session.id);
      await loadSessions();
    } finally {
      setSending(false);
    }
  }

  async function handleAction(action: ButlerAction, messageId: string) {
    if (action.type === 'confirm_proposal') {
      await confirmProposal(messageId, 'confirm');
      return;
    }
    if (action.type === 'reject_proposal') {
      await confirmProposal(messageId, 'reject');
      return;
    }
    if (action.type === 'create_from_outline') {
      if (
        action.payload?.intent === 'content.generate' &&
        action.payload.contentId
      ) {
        await sendMessage(`一键生成 ${action.payload.contentId}`);
        return;
      }
      await sendMessage('按大纲创建文章');
      return;
    }
    if (action.payload?.intent === 'topic.planOutline') {
      await sendMessage('规划大纲');
      return;
    }
    if (
      action.payload?.intent === 'content.generate' &&
      action.payload.contentIds
    ) {
      await sendMessage('一键生成');
      return;
    }
    if (action.href) {
      router.push(action.href);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center rounded-2xl bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-[#1664ff]" />
          <p className="text-sm text-[#86909c]">加载对话…</p>
        </div>
      </div>
    );
  }

  const selectedTopic = topics.find((t) => t.id === session?.topicId);

  const toolbar = (
    <div className="shrink-0 rounded-xl border border-[#E8ECF2] bg-white px-5 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1664FF] to-[#3A86FF] shadow-sm">
          <Bot className="size-4 text-white" />
        </div>
        <span className="shrink-0 text-sm font-medium text-[#4E5969]">
          操作系列
        </span>
        <Select
          value={session?.topicId ?? '__none__'}
          onValueChange={changeTopic}
          disabled={listLoading || !session}
        >
          <SelectTrigger className="h-9 w-[220px] border-[#E5E8EF] bg-[#FAFBFD] text-sm shadow-none md:w-[280px]">
            <SelectValue placeholder="选择系列" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">不指定系列</SelectItem>
            {topics.map((topic) => (
              <SelectItem key={topic.id} value={topic.id}>
                {topic.title}
                {topic.contentCount != null
                  ? ` · ${topic.contentCount} 篇`
                  : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {session?.topicId && (
          <Link
            href={`/topics/${session.topicId}`}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#E5E8EF] px-3 text-xs font-medium text-[#4E5969] transition-colors hover:border-[#1664FF]/30 hover:text-[#1664FF]"
          >
            <ExternalLink className="size-3.5" />
            系列详情
          </Link>
        )}
        <div className="hidden h-5 w-px bg-[#E5E8EF] sm:block" />
        <div className="flex flex-1 flex-wrap gap-2">
          {QUICK_COMMANDS.map((cmd) => {
            const Icon = cmd.icon;
            const disabled =
              sending || listLoading || (cmd.needsTopic && !session?.topicId);
            return (
              <button
                key={cmd.label}
                type="button"
                disabled={disabled}
                title={
                  cmd.needsTopic && !session?.topicId
                    ? '请先选择系列'
                    : cmd.label
                }
                onClick={() => sendMessage(cmd.text)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  disabled
                    ? 'cursor-not-allowed bg-[#F2F3F5] text-[#C9CDD4]'
                    : 'bg-[#F0F5FF] text-[#1664FF] hover:bg-[#1664FF] hover:text-white'
                )}
              >
                <Icon className="size-3.5" />
                {cmd.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        'flex h-[calc(100vh-5rem)] min-h-[560px] flex-col gap-3',
        className
      )}
    >
      {toolbar}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#E8ECF2] bg-white shadow-[0_8px_32px_rgba(29,33,41,0.06)]">
        {/* 左侧会话列表 */}
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-[#EEF0F5] bg-[#FAFBFD] md:w-[260px]">
          <div className="border-b border-[#EEF0F5] px-4 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1D2129]">对话</h3>
              <button
                type="button"
                onClick={createNewSession}
                disabled={listLoading}
                className="flex size-7 items-center justify-center rounded-lg text-[#1664FF] transition-colors hover:bg-[#F0F5FF] disabled:opacity-50"
                title="新建对话"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
            {sessions.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <MessageSquare className="mx-auto size-8 text-[#C9CDD4]" />
                <p className="mt-2 text-xs text-[#86909c]">暂无对话记录</p>
              </div>
            ) : (
              sessions.map((item) => {
                const active = session?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectSession(item.id)}
                    className={cn(
                      'group relative w-full rounded-xl px-3 py-3 text-left transition-all',
                      active
                        ? 'bg-white shadow-[0_2px_8px_rgba(22,100,255,0.08)] ring-1 ring-[#1664FF]/15'
                        : 'hover:bg-white/70'
                    )}
                  >
                    {active && (
                      <span className="absolute bottom-3 left-0 top-3 w-0.5 rounded-full bg-[#1664FF]" />
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          'line-clamp-1 text-[13px] font-medium',
                          active ? 'text-[#1664FF]' : 'text-[#1D2129]'
                        )}
                      >
                        {item.title ?? '新对话'}
                      </p>
                      <span className="shrink-0 text-[10px] text-[#C9CDD4]">
                        {formatSessionTime(item.updatedAt)}
                      </span>
                    </div>
                    {item.topic && (
                      <p className="mt-1 line-clamp-1 text-[11px] text-[#1664FF]/80">
                        {item.topic.title}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#86909c]">
                      {sessionPreview(item)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* 右侧主聊天区 */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#F8FAFC]">
          <div className="relative flex-1 overflow-y-auto">
            {listLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#F8FAFC]/70 backdrop-blur-[1px]">
                <Loader2 className="size-6 animate-spin text-[#1664ff]" />
              </div>
            )}

            <div className="space-y-8 px-6 py-6 md:px-8">
              {session?.messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F0F5FF] to-white shadow-inner ring-1 ring-[#1664FF]/10">
                    <Sparkles className="size-7 text-[#1664FF]" />
                  </div>
                  <h4 className="mt-5 text-base font-semibold text-[#1D2129]">
                    {selectedTopic
                      ? `开始规划「${selectedTopic.title}」`
                      : '你好，我是大管家'}
                  </h4>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#86909c]">
                    {selectedTopic
                      ? '选择上方快捷指令，或直接输入你想做的事'
                      : '可直接输入需求开始对话；若要做系列批量创作，请在顶部选择系列'}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {QUICK_COMMANDS.filter((cmd) => !cmd.needsTopic)
                      .slice(0, 3)
                      .map((cmd) => (
                        <button
                          key={cmd.label}
                          type="button"
                          disabled={cmd.needsTopic && !session?.topicId}
                          onClick={() => sendMessage(cmd.text)}
                          className="rounded-full border border-[#E5E8EF] bg-white px-4 py-2 text-xs text-[#4E5969] transition-colors hover:border-[#1664FF]/40 hover:text-[#1664FF] disabled:opacity-40"
                        >
                          {cmd.label}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {session?.messages.map((msg) =>
                msg.role === 'ASSISTANT' ? (
                  <div
                    key={msg.id}
                    className="flex justify-start pr-[28%] md:pr-[35%]"
                  >
                    <div className="flex max-w-full gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1664FF] to-[#3A86FF] shadow-sm">
                        <Bot className="size-4 text-white" />
                      </div>
                      <div className="min-w-0 rounded-2xl border border-[#EEF0F5] bg-white px-4 py-3 text-sm leading-relaxed text-[#1D2129] shadow-sm">
                        {msg.metadata?.proposal && (
                          <ProposalBadge
                            status={msg.metadata.proposal.status}
                          />
                        )}
                        {renderMarkdownLite(msg.content)}
                        {msg.metadata?.actions &&
                          msg.metadata.actions.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#F2F3F5] pt-3">
                              {msg.metadata.actions.map((action, i) => (
                                <ActionCard
                                  key={`${action.label}-${i}`}
                                  action={action}
                                  disabled={
                                    sending ||
                                    msg.metadata?.proposal?.status !== 'pending'
                                  }
                                  onAction={(a) => handleAction(a, msg.id)}
                                />
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    key={msg.id}
                    className="flex justify-end pl-[28%] md:pl-[35%]"
                  >
                    <div className="flex max-w-full flex-row-reverse gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#E8ECF2] text-xs font-semibold text-[#4E5969]">
                        我
                      </div>
                      <div className="min-w-0 rounded-2xl bg-[#1664FF] px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                )
              )}

              {sending &&
                !session?.messages.some(
                  (m) => m.role === 'ASSISTANT' && m.id.startsWith('stream-')
                ) && (
                  <div className="flex justify-start pr-[28%] md:pr-[35%]">
                    <div className="flex gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1664FF] to-[#3A86FF]">
                        <Bot className="size-4 text-white" />
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl border border-[#EEF0F5] bg-white px-4 py-3 text-sm text-[#86909c] shadow-sm">
                        <span className="flex gap-1">
                          <span className="size-1.5 animate-bounce rounded-full bg-[#1664FF] [animation-delay:0ms]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-[#1664FF] [animation-delay:150ms]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-[#1664FF] [animation-delay:300ms]" />
                        </span>
                        思考中
                      </div>
                    </div>
                  </div>
                )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* 输入区 */}
          <div className="shrink-0 border-t border-[#EEF0F5] bg-white px-6 py-4 md:px-8">
            <form
              className="flex items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
            >
              <div className="relative flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder={
                    session?.topicId
                      ? '输入指令，Enter 发送，Shift+Enter 换行'
                      : '选择系列后开始对话…'
                  }
                  rows={1}
                  className="max-h-32 min-h-[44px] w-full resize-none rounded-xl border border-[#E5E8EF] bg-[#FAFBFD] px-4 py-3 pr-12 text-sm leading-relaxed outline-none transition-colors placeholder:text-[#C9CDD4] focus:border-[#1664FF]/50 focus:bg-white focus:ring-2 focus:ring-[#1664FF]/10 disabled:opacity-60"
                  disabled={sending || listLoading}
                />
              </div>
              <Button
                type="submit"
                size="icon"
                className="size-11 shrink-0 rounded-xl bg-[#1664FF] shadow-sm hover:bg-[#0E52D9] disabled:opacity-40"
                disabled={sending || listLoading || !input.trim()}
              >
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
