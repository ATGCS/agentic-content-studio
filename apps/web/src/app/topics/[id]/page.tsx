'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Layers, Plus } from 'lucide-react';
import {
  ContentEditDialog,
  type ContentEditForm,
} from '@/components/dialogs/content-edit-dialog';
import { CreationWorkflowGuide } from '@/components/studio/creation-workflow-guide';
import { PlatformBadge } from '@/components/platform-icon';
import { StatusBadge } from '@/components/studio/status-badge';
import { StudioCard } from '@/components/studio/studio-card';
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

type TopicDetail = {
  id: string;
  title: string;
  description?: string | null;
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

  useEffect(() => {
    setLoading(true);
    api<TopicDetail>(`/api/topics/${id}`)
      .then((res) => {
        setTopic(res.data);
        setError(null);
      })
      .catch(() => setError('系列不存在或已被删除'))
      .finally(() => setLoading(false));
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
          <StudioCard contentClassName="p-6 text-center">
            <h2 className="text-base font-semibold text-[#1D2129]">
              系列不可用
            </h2>
            <p className="mt-2 text-sm text-[#86909c]">
              {error ?? '系列不存在或已被删除'}
            </p>
            <Button className="mt-4" onClick={() => router.push('/topics')}>
              返回系列列表
            </Button>
          </StudioCard>
        </PageContainer>
      </StudioLayout>
    );
  }

  return (
    <StudioLayout>
      <PageContainer>
        <CreationWorkflowGuide currentStep="content" compact className="mb-4" />

        <div className="mb-2">
          <Link
            href="/topics"
            className="inline-flex items-center gap-1 text-sm text-[#86909c] hover:text-[#1664ff]"
          >
            <ArrowLeft className="size-4" />
            返回系列列表
          </Link>
        </div>

        {/* 系列信息头 */}
        <StudioCard contentClassName="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-[#F0F5FF] text-[#1664FF]">
                  <Layers className="size-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#1D2129]">
                    {topic.title}
                  </h1>
                  {topic.description && (
                    <p className="mt-1 text-sm text-[#4E5969]">
                      {topic.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <StatusBadge status={topic.status} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#86909c]">
            <span>来源：{topic.source === 'ai' ? 'AI 推荐' : '手动创建'}</span>
            <span>
              创建：{new Date(topic.createdAt).toLocaleDateString('zh-CN')}
            </span>
            <span>文章：{topic.contents.length} 篇</span>
            {topic.targetPlatforms && topic.targetPlatforms.length > 0 && (
              <span className="flex items-center gap-1">
                目标平台：
                {topic.targetPlatforms.map((p) => (
                  <PlatformBadge key={p} platform={p} size="sm" />
                ))}
              </span>
            )}
          </div>
        </StudioCard>

        {/* 文章列表 */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1D2129]">
            系列文章（{topic.contents.length}）
          </h2>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-[#1664FF] text-xs text-white hover:bg-[#0E52D9]"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-3.5" />
            新建文章
          </Button>
        </div>

        <div className="space-y-3">
          {topic.contents.length === 0 ? (
            <StudioCard contentClassName="p-6 text-center">
              <p className="text-sm text-[#86909c]">
                暂无文章，点击「新建文章」为此系列创建第一篇内容
              </p>
            </StudioCard>
          ) : (
            topic.contents.map((content) => (
              <StudioCard key={content.id} contentClassName="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/contents/${content.id}`}
                      className="text-sm font-semibold text-[#1D2129] hover:text-[#1664FF] hover:underline"
                    >
                      {content.title}
                    </Link>
                    {content.summary && (
                      <p className="mt-1 text-xs text-[#86909C] line-clamp-2">
                        {content.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={content.status} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-[10px]"
                      asChild
                    >
                      <Link href={`/contents/${content.id}`}>编辑</Link>
                    </Button>
                  </div>
                </div>

                {content.versions && content.versions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {content.versions.map((v) => (
                      <Link
                        key={v.id}
                        href={`/contents/${content.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-[#E5E8EF] px-2.5 py-1 text-[10px] text-[#4E5969] hover:border-[#1664FF] hover:text-[#1664FF]"
                      >
                        <PlatformBadge platform={v.platform} size="sm" />
                        <StatusBadge status={v.status} />
                        <ExternalLink className="size-3" />
                      </Link>
                    ))}
                  </div>
                )}

                <div className="mt-2 text-[10px] text-[#A9AEB8]">
                  创建于{' '}
                  {new Date(content.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </StudioCard>
            ))
          )}
        </div>
      </PageContainer>

      <ContentEditDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={createArticle}
        redirectAfterCreate="detail"
        defaultTopicId={topic.id}
        defaultPlatforms={topic.targetPlatforms ?? []}
      />
    </StudioLayout>
  );
}
