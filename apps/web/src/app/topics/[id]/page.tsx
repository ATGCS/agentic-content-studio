'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Bot,
  FileText,
  Layers,
  Plus,
  RefreshCw,
  ListOrdered,
  X,
  GripVertical,
  Pencil,
  Save,
  Trash2,
  PlusCircle,
  ChevronUp,
  ChevronDown,
  Target,
  Users,
  Swords,
  TrendingUp,
  Palette,
  Hash,
  Ban,
  Calendar,
} from 'lucide-react';
import {
  ContentEditDialog,
  type ContentEditForm,
} from '@/components/dialogs/content-edit-dialog';
import {
  TopicStrategyDialog,
  type TopicStrategy,
} from '@/components/dialogs/topic-strategy-dialog';
import { EmptyState } from '@/components/studio/empty-state';
import { PlatformBadge } from '@/components/platform-icon';
import { StatusBadge } from '@/components/studio/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';

type ContentItem = {
  id: string;
  title: string;
  summary?: string | null;
  status: string;
  createdAt: string;
  creator?: { name?: string | null; email?: string | null } | null;
  versions?: Array<{
    id: string;
    platform: string;
    status: string;
    title?: string | null;
  }>;
};

type TopicOutlineArticle = {
  order: number;
  title: string;
  summary: string;
  keyPoints?: string[];
};

type TopicOutline = {
  summary: string;
  articles: TopicOutlineArticle[];
  plannedAt?: string;
};

type TopicDetail = {
  id: string;
  title: string;
  description?: string | null;
  outline?: TopicOutline | null;
  strategy?: TopicStrategy | null;
  status: string;
  source?: string | null;
  targetPlatforms?: string[];
  createdAt: string;
  contents: ContentItem[];
  knowledgeBases?: { id: string; name: string }[];
};

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outlineEditing, setOutlineEditing] = useState(false);
  const [savingOutline, setSavingOutline] = useState(false);
  const [editOutline, setEditOutline] = useState<TopicOutline | null>(null);
  const [strategyOpen, setStrategyOpen] = useState(false);

  async function reloadTopic() {
    const res = await api<TopicDetail>(`/api/topics/${id}`);
    setTopic(res.data);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await api<TopicDetail>(`/api/topics/${id}`);
      setTopic(res.data);
      setError(null);
    } catch {
      setError('系列不存在或已被删除');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setError('系列不存在或已被删除'));
  }, [id]);

  async function createArticle(form: ContentEditForm): Promise<string> {
    const res = await api<{ id: string }>('/api/contents', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title,
        summary: form.summary || undefined,
        topicId: id,
      }),
    });
    const platforms =
      form.platforms.length > 0
        ? form.platforms
        : (topic?.targetPlatforms ?? []);
    if (platforms.length > 0) {
      await api(`/api/contents/${res.data.id}/versions/generate`, {
        method: 'POST',
        body: JSON.stringify({ platforms }),
      });
    }
    await reloadTopic();
    return res.data.id;
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

  if (error || !topic) {
    return (
      <StudioLayout>
        <PageContainer>
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-red-500">{error ?? '系列不存在'}</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => router.push('/topics')}
            >
              返回系列列表
            </Button>
          </div>
        </PageContainer>
      </StudioLayout>
    );
  }

  return (
    <StudioLayout>
      <div data-page-title={topic.title} className="hidden" />
      <PageContainer className="gap-2 !p-2 md:!p-3">
        {/* 顶部栏：系列名称 + 操作 */}
        <div className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm">
              <Layers className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-gray-900">
                {topic.title}
              </h1>
              <p className="text-xs text-gray-400">
                {topic.contents.length} 篇文章
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={load}
            >
              <RefreshCw className="size-3.5 text-gray-500" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              onClick={() => setStrategyOpen(true)}
            >
              <Target className="size-3.5" />
              策略
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              asChild
            >
              <Link href={`/butler?topicId=${topic.id}`}>
                <Bot className="size-3.5" />
                AI 对话
              </Link>
            </Button>
            <Button
              size="sm"
              className="h-8 bg-[#1664FF] text-xs text-white hover:bg-[#0E52D9]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-3.5" />
              新建文章
            </Button>
          </div>
        </div>

        {/* 系列描述 */}
        {topic.description && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-gray-600">{topic.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
              <span>{topic.source === 'ai' ? 'AI 推荐' : '手动创建'}</span>
              <span>
                创建于 {new Date(topic.createdAt).toLocaleDateString('zh-CN')}
              </span>
              {topic.targetPlatforms && topic.targetPlatforms.length > 0 && (
                <div className="flex items-center gap-1">
                  {topic.targetPlatforms.map((p) => (
                    <PlatformBadge key={p} platform={p} size="sm" />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 系列策略摘要 */}
        {topic.strategy && (
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Target className="size-4 text-[#7B61FF]" />
              <h3 className="text-sm font-semibold text-[#1D2129]">系列策略</h3>
              <button
                type="button"
                onClick={() => setStrategyOpen(true)}
                className="ml-auto text-xs text-[#1664FF] hover:underline"
              >
                编辑
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {topic.strategy.positioning && (
                <div className="flex-1 min-w-[200px]">
                  <span className="text-[10px] font-medium text-[#86909C] uppercase">
                    定位
                  </span>
                  <p className="mt-0.5 text-xs text-[#4E5969]">
                    {topic.strategy.positioning}
                  </p>
                </div>
              )}
              {topic.strategy.contentStyle && (
                <div className="flex-1 min-w-[150px]">
                  <span className="text-[10px] font-medium text-[#86909C] uppercase">
                    风格
                  </span>
                  <p className="mt-0.5 text-xs text-[#4E5969]">
                    {topic.strategy.contentStyle}
                  </p>
                </div>
              )}
              {topic.strategy.tone && (
                <div className="flex-1 min-w-[150px]">
                  <span className="text-[10px] font-medium text-[#86909C] uppercase">
                    语调
                  </span>
                  <p className="mt-0.5 text-xs text-[#4E5969]">
                    {topic.strategy.tone}
                  </p>
                </div>
              )}
              {topic.strategy.goals && topic.strategy.goals.length > 0 && (
                <div className="w-full">
                  <span className="text-[10px] font-medium text-[#86909C] uppercase">
                    目标
                  </span>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {topic.strategy.goals.map((g, i) => (
                      <span
                        key={i}
                        className="rounded bg-[#F0F5FF] px-1.5 py-0.5 text-[10px] text-[#1664FF]"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {topic.strategy.keywords &&
                topic.strategy.keywords.length > 0 && (
                  <div className="w-full">
                    <span className="text-[10px] font-medium text-[#86909C] uppercase">
                      关键词
                    </span>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {topic.strategy.keywords.map((k, i) => (
                        <span
                          key={i}
                          className="rounded bg-[#F7F8FA] px-1.5 py-0.5 text-[10px] text-[#4E5969]"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>
            {topic.knowledgeBases && topic.knowledgeBases.length > 0 && (
              <div className="w-full">
                <span className="text-[10px] font-medium text-[#86909C] uppercase">
                  关联知识库
                </span>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {topic.knowledgeBases.map((kb) => (
                    <span
                      key={kb.id}
                      className="inline-flex items-center gap-1 rounded bg-[#FFF7E6] px-1.5 py-0.5 text-[10px] text-[#FA8C16]"
                    >
                      {kb.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 系列大纲 - 可编辑侧边栏 */}
        {topic.outline && topic.outline.articles.length > 0 && (
          <>
            {/* 浮动按钮 */}
            <button
              onClick={() => {
                setEditOutline(
                  topic.outline
                    ? JSON.parse(JSON.stringify(topic.outline))
                    : null
                );
                setOutlineEditing(false);
                setOutlineOpen(true);
              }}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1.5 rounded-full bg-[#7B61FF] px-3 py-2 text-xs font-medium text-white shadow-lg hover:bg-[#6A50E6] transition-all"
              title="系列大纲"
            >
              <ListOrdered className="size-4" />
              <span>大纲</span>
            </button>

            {/* 侧边栏面板 */}
            {outlineOpen && editOutline && (
              <div className="fixed right-0 top-0 bottom-0 z-50 flex">
                <div className="w-80 bg-white border-l border-[#E5E8EF] shadow-xl flex flex-col overflow-hidden">
                  {/* 头部 */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E8EF]">
                    <div className="flex items-center gap-2">
                      <ListOrdered className="size-4 text-[#7B61FF]" />
                      <h3 className="text-sm font-semibold text-[#1D2129]">
                        系列大纲
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      {outlineEditing ? (
                        <button
                          onClick={async () => {
                            if (!editOutline) return;
                            setSavingOutline(true);
                            try {
                              await api(`/api/topics/${topic.id}/outline`, {
                                method: 'PATCH',
                                body: JSON.stringify(editOutline),
                              });
                              await reloadTopic();
                              setOutlineEditing(false);
                            } finally {
                              setSavingOutline(false);
                            }
                          }}
                          disabled={savingOutline}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white bg-[#1664FF] hover:bg-[#0E52D9] disabled:opacity-50"
                        >
                          <Save className="size-3" />
                          {savingOutline ? '保存中…' : '保存'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setOutlineEditing(true)}
                          className="rounded-md p-1.5 text-[#86909C] hover:bg-[#F2F3F5] hover:text-[#1664FF]"
                          title="编辑大纲"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setOutlineOpen(false)}
                        className="rounded-md p-1.5 text-[#86909C] hover:bg-[#F2F3F5] hover:text-[#4E5969]"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* 系列标题 */}
                  <div className="px-4 py-3 border-b border-[#F2F3F5]">
                    <h4 className="text-sm font-medium text-[#1D2129]">
                      {topic.title}
                    </h4>
                    {outlineEditing ? (
                      <Textarea
                        className="mt-1.5 min-h-[60px] text-xs"
                        value={editOutline.summary}
                        onChange={(e) =>
                          setEditOutline((prev) =>
                            prev ? { ...prev, summary: e.target.value } : prev
                          )
                        }
                        placeholder="系列概述"
                      />
                    ) : (
                      editOutline.summary && (
                        <p className="mt-1.5 text-xs leading-relaxed text-[#86909C]">
                          {editOutline.summary}
                        </p>
                      )
                    )}
                  </div>

                  {/* 文章列表 */}
                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    <div className="space-y-3">
                      {[...editOutline.articles]
                        .sort((a, b) => a.order - b.order)
                        .map((article, index) => (
                          <div
                            key={article.order}
                            className="group rounded-lg border border-[#E5E8EF] p-3 hover:border-[#7B61FF]/40 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-start gap-2">
                              {/* 拖拽手柄（编辑模式） */}
                              {outlineEditing && (
                                <div className="flex flex-col items-center gap-0.5 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const articles = [
                                        ...editOutline.articles,
                                      ];
                                      const idx = articles.findIndex(
                                        (a) => a.order === article.order
                                      );
                                      if (idx > 0) {
                                        const temp = articles[idx].order;
                                        articles[idx] = {
                                          ...articles[idx],
                                          order: articles[idx - 1].order,
                                        };
                                        articles[idx - 1] = {
                                          ...articles[idx - 1],
                                          order: temp,
                                        };
                                        setEditOutline((prev) =>
                                          prev ? { ...prev, articles } : prev
                                        );
                                      }
                                    }}
                                    className="p-0.5 text-[#C9CDD4] hover:text-[#7B61FF]"
                                  >
                                    <ChevronUp className="size-3" />
                                  </button>
                                  <GripVertical className="size-3 text-[#C9CDD4]" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const articles = [
                                        ...editOutline.articles,
                                      ];
                                      const idx = articles.findIndex(
                                        (a) => a.order === article.order
                                      );
                                      if (idx < articles.length - 1) {
                                        const temp = articles[idx].order;
                                        articles[idx] = {
                                          ...articles[idx],
                                          order: articles[idx + 1].order,
                                        };
                                        articles[idx + 1] = {
                                          ...articles[idx + 1],
                                          order: temp,
                                        };
                                        setEditOutline((prev) =>
                                          prev ? { ...prev, articles } : prev
                                        );
                                      }
                                    }}
                                    className="p-0.5 text-[#C9CDD4] hover:text-[#7B61FF]"
                                  >
                                    <ChevronDown className="size-3" />
                                  </button>
                                </div>
                              )}
                              {/* 序号 */}
                              {!outlineEditing && (
                                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#F0EDFF] text-[10px] font-bold text-[#7B61FF]">
                                  {index + 1}
                                </span>
                              )}
                              <div className="min-w-0 flex-1">
                                {outlineEditing ? (
                                  <div className="space-y-1.5">
                                    <Input
                                      className="h-7 text-xs"
                                      value={article.title}
                                      onChange={(e) => {
                                        const articles = [
                                          ...editOutline.articles,
                                        ];
                                        const idx = articles.findIndex(
                                          (a) => a.order === article.order
                                        );
                                        articles[idx] = {
                                          ...articles[idx],
                                          title: e.target.value,
                                        };
                                        setEditOutline((prev) =>
                                          prev ? { ...prev, articles } : prev
                                        );
                                      }}
                                      placeholder="文章标题"
                                    />
                                    <Textarea
                                      className="min-h-[48px] text-xs"
                                      value={article.summary}
                                      onChange={(e) => {
                                        const articles = [
                                          ...editOutline.articles,
                                        ];
                                        const idx = articles.findIndex(
                                          (a) => a.order === article.order
                                        );
                                        articles[idx] = {
                                          ...articles[idx],
                                          summary: e.target.value,
                                        };
                                        setEditOutline((prev) =>
                                          prev ? { ...prev, articles } : prev
                                        );
                                      }}
                                      placeholder="文章摘要"
                                    />
                                    {/* 删除按钮 */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const articles = editOutline.articles
                                          .filter(
                                            (a) => a.order !== article.order
                                          )
                                          .map((a, i) => ({
                                            ...a,
                                            order: i + 1,
                                          }));
                                        setEditOutline((prev) =>
                                          prev ? { ...prev, articles } : prev
                                        );
                                      }}
                                      className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-500"
                                    >
                                      <Trash2 className="size-3" />
                                      删除
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <h4 className="text-xs font-semibold text-[#1D2129] leading-snug group-hover:text-[#7B61FF] transition-colors">
                                      {article.title}
                                    </h4>
                                    <p className="mt-1 text-[11px] leading-relaxed text-[#86909C] line-clamp-3">
                                      {article.summary}
                                    </p>
                                    {article.keyPoints &&
                                      article.keyPoints.length > 0 && (
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                          {article.keyPoints
                                            .slice(0, 3)
                                            .map((point, i) => (
                                              <span
                                                key={i}
                                                className="rounded bg-[#F7F8FA] px-1.5 py-0.5 text-[10px] text-[#4E5969]"
                                              >
                                                {point}
                                              </span>
                                            ))}
                                          {article.keyPoints.length > 3 && (
                                            <span className="text-[10px] text-[#C9CDD4]">
                                              +{article.keyPoints.length - 3}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* 编辑模式：新增文章按钮 */}
                    {outlineEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          const maxOrder = Math.max(
                            ...editOutline.articles.map((a) => a.order),
                            0
                          );
                          setEditOutline((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  articles: [
                                    ...prev.articles,
                                    {
                                      order: maxOrder + 1,
                                      title: '',
                                      summary: '',
                                    },
                                  ],
                                }
                              : prev
                          );
                        }}
                        className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#C9CDD4] py-2 text-xs text-[#86909C] hover:border-[#7B61FF] hover:text-[#7B61FF] transition-all"
                      >
                        <PlusCircle className="size-3.5" />
                        新增文章
                      </button>
                    )}
                  </div>
                </div>

                {/* 遮罩层 */}
                <div
                  className="flex-1 bg-black/20"
                  onClick={() => setOutlineOpen(false)}
                />
              </div>
            )}
          </>
        )}

        {/* 文章卡片列表 */}
        {topic.contents.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
            <EmptyState
              title="暂无文章"
              description="点击「新建文章」为此系列创建第一篇内容"
              actionLabel="新建文章"
              onAction={() => setCreateOpen(true)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {topic.contents.map((content) => (
              <Link
                key={content.id}
                href={`/contents/${content.id}`}
                className="group flex flex-col rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-purple-300 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-purple-600">
                      {content.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={content.status} />
                      <span className="text-xs text-gray-400">
                        {new Date(content.createdAt).toLocaleDateString(
                          'zh-CN'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {content.summary && (
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-500">
                    {content.summary}
                  </p>
                )}

                {content.versions && content.versions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {content.versions.map((v) => (
                      <PlatformBadge
                        key={v.id}
                        platform={v.platform}
                        size="sm"
                      />
                    ))}
                  </div>
                )}

                <div className="mt-3 border-t border-gray-100 pt-3">
                  <span className="text-xs text-gray-400">
                    {content.versions?.length ?? 0} 个版本
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>

      <ContentEditDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={createArticle}
        defaultTopicId={topic.id}
        defaultPlatforms={topic.targetPlatforms ?? []}
      />

      <TopicStrategyDialog
        open={strategyOpen}
        onOpenChange={setStrategyOpen}
        strategy={topic.strategy ?? {}}
        topicId={topic.id}
        knowledgeBaseIds={topic.knowledgeBases?.map((kb) => kb.id) ?? []}
        onSave={async (strategy) => {
          await api(`/api/topics/${topic.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ strategy }),
          });
        }}
        onSaved={reloadTopic}
      />
    </StudioLayout>
  );
}
