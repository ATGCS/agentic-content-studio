'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bot, FileText, Layers, Plus, RefreshCw } from 'lucide-react';
import {
  ContentEditDialog,
  type ContentEditForm,
} from '@/components/dialogs/content-edit-dialog';
import { EmptyState } from '@/components/studio/empty-state';
import { PlatformBadge } from '@/components/platform-icon';
import { StatusBadge } from '@/components/studio/status-badge';
import { Button } from '@/components/ui/button';
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
  status: string;
  source?: string | null;
  targetPlatforms?: string[];
  createdAt: string;
  contents: ContentItem[];
};

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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

        {/* 系列大纲 */}
        {topic.outline && topic.outline.articles.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">系列大纲</h2>
              {topic.outline.summary && (
                <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                  {topic.outline.summary}
                </p>
              )}
            </div>
            <div className="p-4">
              <ol className="space-y-2">
                {[...topic.outline.articles]
                  .sort((a, b) => a.order - b.order)
                  .map((article, index) => (
                    <li
                      key={article.order}
                      className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-600">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {article.title}
                        </p>
                        {article.summary && (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                            {article.summary}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
              </ol>
            </div>
          </div>
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
    </StudioLayout>
  );
}
