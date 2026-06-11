'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Search,
  FolderOpen,
  Users,
  Power,
  PowerOff,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/studio/empty-state';
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
import { api } from '@/lib/api';

type KnowledgeItem = {
  id: string;
  name: string;
  agentType?: string | null;
  platform?: string;
  enabled: boolean;
  updatedAt: string;
  description?: string | null;
  _count?: { documents: number };
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
    try {
      await api(`/api/ima/knowledge-bases/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !item.enabled }),
      });
      await loadKnowledgeBases();
    } catch (e) {
      console.error('toggleKnowledgeBase error:', e);
    }
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
        {/* 顶部操作栏 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#86909c]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索知识库…"
              className="h-9 w-64 pl-9 text-sm"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-40">
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

        {/* 内容区域 */}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => (
              <Link
                key={item.id}
                href={`/knowledge/${item.id}`}
                className="group"
              >
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-gray-300">
                  {/* 卡片头部 */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="size-5 text-amber-500" />
                      <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-[#1664ff]">
                        {item.name}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleKnowledgeBase(item);
                      }}
                      className={`rounded-full p-1.5 transition-colors ${
                        item.enabled
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={item.enabled ? '停用' : '启用'}
                    >
                      {item.enabled ? (
                        <Power className="size-4" />
                      ) : (
                        <PowerOff className="size-4" />
                      )}
                    </button>
                  </div>

                  {/* 描述 */}
                  <p className="mb-4 text-sm text-gray-500 line-clamp-2">
                    {item.description || '这是一个知识库'}
                  </p>

                  {/* 卡片底部信息 */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
                        {item._count?.documents ?? 0} 文档
                      </span>
                      <span>
                        {categoryLabels[item.agentType || ''] ?? '通用'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>
    </StudioLayout>
  );
}
