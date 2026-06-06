'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Bot, Copy, PauseCircle, RefreshCw, Save } from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { StudioCard } from '@/components/studio/studio-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

type KnowledgeItem = {
  id: string;
  name: string;
  description?: string | null;
  type?: string;
  enabled: boolean;
  externalId?: string;
  updatedAt?: string;
};

export default function KnowledgeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [item, setItem] = useState<KnowledgeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [negatives, setNegatives] = useState('');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api<KnowledgeItem[]>(`/api/ima/knowledge-bases`);
      const found = r.data.find((k) => k.id === id) ?? null;
      setItem(found);
      if (found) {
        setContent(found.description ?? '');
        setNegatives('');
      }
      setLoadError(null);
    } catch (error) {
      console.error(error);
      setLoadError('知识库加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, [id]);

  async function toggleEnabled() {
    if (!item || toggling) return;
    setToggling(true);
    try {
      await api(`/api/ima/knowledge-bases/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !item.enabled }),
      });
      await load();
    } finally {
      setToggling(false);
    }
  }

  async function saveContent() {
    if (!item || saving) return;
    setSaving(true);
    try {
      await api(`/api/ima/knowledge-bases/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ description: content || undefined }),
      });
      await load();
    } finally {
      setSaving(false);
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

  if (loadError || !item) {
    return (
      <StudioLayout>
        <PageContainer>
          <StudioCard contentClassName="p-5 text-center">
            <p className="text-sm text-[#F53F3F]">{loadError ?? '知识库不存在'}</p>
            <Button className="mt-4" variant="outline" asChild>
              <Link href="/knowledge">返回知识库列表</Link>
            </Button>
          </StudioCard>
        </PageContainer>
      </StudioLayout>
    );
  }

  return (
    <StudioLayout>
      <PageContainer>
        <Link
          href="/knowledge"
          className="inline-flex items-center gap-1 text-sm text-[#86909c] hover:text-[#1664ff]"
        >
          <ArrowLeft className="size-4" />
          返回知识库
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <StudioCard contentClassName="space-y-4 p-5">
              <div>
                <h1 className="text-xl font-bold text-[#1D2129]">{item.name}</h1>
                <p className="mt-1 text-sm text-[#86909c]">
                  {item.description ?? '结构化规则条目，可供 Agent 调用'}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[#86909c]">类型</p>
                  <p className="text-sm font-medium text-[#1D2129]">
                    {item.type ?? '知识库'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#86909c]">外部 ID</p>
                  <p className="text-sm font-medium text-[#1D2129]">
                    {item.externalId ?? '—'}
                  </p>
                </div>
              </div>
            </StudioCard>

            <StudioCard contentClassName="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1D2129]">规则内容</h3>
                <Button size="sm" variant="outline" onClick={saveContent} isLoading={saving}>
                  <Save className="size-3.5" />
                  保存
                </Button>
              </div>
              <Textarea
                rows={10}
                className="studio-input resize-none font-mono text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="规则内容 / 模板内容 / 示例内容"
              />
            </StudioCard>

            <StudioCard contentClassName="space-y-4 p-5">
              <h3 className="text-sm font-semibold text-[#1D2129]">
                禁用内容与示例
              </h3>
              <Textarea
                rows={5}
                className="studio-input resize-none text-sm"
                value={negatives}
                onChange={(e) => setNegatives(e.target.value)}
                placeholder="禁止使用的表达、负面示例、平台规则限制"
              />
            </StudioCard>
          </div>

          <aside className="space-y-4">
            <StudioCard contentClassName="p-4">
              <h3 className="mb-3 text-sm font-semibold text-[#1D2129]">
                Agent 调用关系
              </h3>
              <div className="space-y-2">
                {['标题生成 Agent', '平台改写 Agent', '审核辅助 Agent'].map(
                  (name) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 rounded-lg bg-[#fafbfc] px-3 py-2 text-sm"
                    >
                      <Bot className="size-4 text-[#1664ff]" />
                      <span className="text-[#4e5969]">{name}</span>
                    </div>
                  )
                )}
              </div>
            </StudioCard>

            <StudioCard contentClassName="space-y-3 p-4">
              <h3 className="text-sm font-semibold text-[#1D2129]">操作</h3>
              <Button className="w-full justify-start" size="sm" variant="outline" onClick={load}>
                <RefreshCw className="size-4" />
                刷新
              </Button>
              <Button className="w-full justify-start" size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(JSON.stringify(item, null, 2))}>
                <Copy className="size-4" />
                复制条目 JSON
              </Button>
              <Button className="w-full justify-start" size="sm" variant="outline" isLoading={toggling} onClick={toggleEnabled}>
                <PauseCircle className="size-4" />
                {item.enabled ? '停用' : '启用'}
              </Button>
            </StudioCard>
          </aside>
        </div>
      </PageContainer>
    </StudioLayout>
  );
}