'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Search } from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/studio/empty-state';
import { PlatformBadge } from '@/components/studio/platform-badge';
import { StudioCard } from '@/components/studio/studio-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  StudioTable,
  StudioTableBody,
  StudioTableCell,
  StudioTableEmpty,
  StudioTableFrame,
  StudioTableHead,
  StudioTableHeader,
  StudioTableRow,
} from '@/components/studio/studio-table';
import { api } from '@/lib/api';

type KnowledgeItem = {
  id: string;
  name: string;
  agentType?: string | null;
  platform?: string;
  enabled: boolean;
  updatedAt: string;
  description?: string | null;
};

const categories = [
  { value: 'ALL', label: '全部分类' },
  { value: 'TOPIC', label: '选题知识库' },
  { value: 'TITLE', label: '标题知识库' },
  { value: 'COVER', label: '封面知识库' },
  { value: 'BODY', label: '正文知识库' },
  { value: 'TAG', label: '标签知识库' },
  { value: 'PLATFORM_RULE', label: '平台规则库' },
  { value: 'ACCOUNT_STYLE', label: '账号风格库' },
  { value: 'MATERIAL', label: '素材知识库' },
];

const categoryLabels: Record<string, string> = {
  TOPIC: '选题知识库',
  TITLE: '标题知识库',
  COVER: '封面知识库',
  BODY: '正文知识库',
  TAG: '标签知识库',
  PLATFORM_RULE: '平台规则库',
  ACCOUNT_STYLE: '账号风格库',
  MATERIAL: '素材知识库',
};

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  async function loadKnowledgeBases() {
    setLoading(true);
    try {
      const res = await api<KnowledgeItem[]>('/api/ima/knowledge-bases');
      setItems(res.data);
      setLoadError(null);
    } catch (error) {
      console.error(error);
      setLoadError('知识库加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKnowledgeBases().catch(console.error);
  }, []);

  async function syncKnowledgeBases() {
    setSyncing(true);
    try {
      await api('/api/ima/knowledge-bases/sync', { method: 'POST' });
      await loadKnowledgeBases();
    } finally {
      setSyncing(false);
    }
  }

  async function toggleKnowledgeBase(item: KnowledgeItem) {
    await api(`/api/ima/knowledge-bases/${item.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !item.enabled }),
    });
    await loadKnowledgeBases();
  }

  const filtered = items.filter((item) => {
    if (category !== 'ALL' && item.agentType !== category) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <StudioLayout>
      <PageContainer>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#86909c]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索知识条目…"
              className="studio-input h-9 pl-9 text-sm"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="studio-input w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={syncKnowledgeBases}
            isLoading={syncing}
          >
            <RefreshCw className="size-4" />
            同步知识库
          </Button>
        </div>

        <div className="flex gap-4">
          {/* 左侧分类树 */}
          <aside className="hidden w-44 shrink-0 lg:block">
            <StudioCard contentClassName="p-2">
              <nav className="space-y-0.5">
                {categories.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`w-full rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${
                      category === c.value
                        ? 'bg-[#f0f5ff] text-[#1664ff]'
                        : 'text-[#4e5969] hover:bg-[#f5f7fa]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </nav>
            </StudioCard>
          </aside>

          {/* 主列表 */}
          <div className="min-w-0 flex-1">
            <StudioCard contentClassName="overflow-hidden">
              {loading ? (
                <EmptyState
                  title="知识库加载中…"
                  description="正在从 IMA 配置读取知识库"
                />
              ) : loadError ? (
                <EmptyState title="知识库加载失败" description={loadError} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  title="暂无知识条目"
                  description="同步知识库后可供内容流程调用"
                />
              ) : (
                <StudioTable>
                  <StudioTableHeader>
                    <StudioTableRow>
                      <StudioTableHead>名称</StudioTableHead>
                      <StudioTableHead>类型</StudioTableHead>
                      <StudioTableHead>适用平台</StudioTableHead>
                      <StudioTableHead>启用</StudioTableHead>
                      <StudioTableHead>最近更新</StudioTableHead>
                      <StudioTableHead className="text-right">
                        操作
                      </StudioTableHead>
                    </StudioTableRow>
                  </StudioTableHeader>
                  <StudioTableBody>
                    {filtered.map((item) => (
                      <StudioTableRow key={item.id}>
                        <StudioTableCell className="font-medium">
                          <Link
                            href={`/knowledge/${item.id}`}
                            className="text-[#1664ff] hover:underline"
                          >
                            {item.name}
                          </Link>
                        </StudioTableCell>
                        <StudioTableCell>
                          <span className="rounded-md bg-[#f0f5ff] px-2 py-0.5 text-xs text-[#1664ff]">
                            {categoryLabels[item.agentType || ''] ?? '通用'}
                          </span>
                        </StudioTableCell>
                        <StudioTableCell>
                          {item.platform ? (
                            <PlatformBadge platform={item.platform} />
                          ) : (
                            <span className="text-xs text-[#86909c]">通用</span>
                          )}
                        </StudioTableCell>
                        <StudioTableCell>
                          <span
                            className={`text-xs font-medium ${
                              item.enabled ? 'text-[#00b42a]' : 'text-[#86909c]'
                            }`}
                          >
                            {item.enabled ? '已启用' : '未启用'}
                          </span>
                        </StudioTableCell>
                        <StudioTableCell className="text-sm text-[#86909c]">
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </StudioTableCell>
                        <StudioTableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleKnowledgeBase(item)}
                          >
                            {item.enabled ? '停用' : '启用'}
                          </Button>
                        </StudioTableCell>
                      </StudioTableRow>
                    ))}
                  </StudioTableBody>
                </StudioTable>
              )}
            </StudioCard>
          </div>
        </div>
      </PageContainer>
    </StudioLayout>
  );
}
