'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen,
  FileText,
  PauseCircle,
  PlayCircle,
  RefreshCw,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/studio/empty-state';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';

type KnowledgeBase = {
  id: string;
  name: string;
  description?: string | null;
  agentType?: string | null;
  enabled: boolean;
  externalId?: string;
  source?: string;
  updatedAt?: string;
  syncedAt?: string | null;
};

type KnowledgeDocument = {
  id: string;
  title: string;
  summary?: string | null;
  content?: string | null;
  source?: string;
  syncedAt?: string;
  updatedAt?: string;
};

export default function KnowledgeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [item, setItem] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) ?? null;

  async function load() {
    setLoading(true);
    try {
      const [kbRes, docsRes] = await Promise.all([
        api<KnowledgeBase>(`/api/ima/knowledge-bases/${id}`),
        api<KnowledgeDocument[]>(`/api/ima/knowledge-bases/${id}/documents`),
      ]);
      setItem(kbRes.data);
      setDocuments(docsRes.data ?? []);
      setSelectedDocId(null);
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
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-red-500">
              {loadError ?? '知识库不存在'}
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => window.history.back()}
            >
              返回
            </Button>
          </div>
        </PageContainer>
      </StudioLayout>
    );
  }

  return (
    <StudioLayout>
      <div data-page-title={item.name} className="hidden" />
      <PageContainer className="gap-2 !p-2 md:!p-3">
        {/* 顶部栏：知识库名称 + 操作 */}
        <div className="flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
              <BookOpen className="size-4" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-gray-900">
                {item.name}
              </h1>
              <p className="text-xs text-gray-400">{documents.length} 篇文档</p>
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
              variant={item.enabled ? 'destructive' : 'default'}
              isLoading={toggling}
              onClick={toggleEnabled}
              className="h-8 text-xs"
            >
              {item.enabled ? (
                <>
                  <PauseCircle className="size-3.5" />
                  停用
                </>
              ) : (
                <>
                  <PlayCircle className="size-3.5" />
                  启用
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 文档列表 */}
        {documents.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
            <EmptyState
              title="暂无知识库文档"
              description="该知识库还没有同步任何文档内容。"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {documents.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => setSelectedDocId(doc.id)}
                className="group flex flex-col rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                      {doc.title}
                    </h3>
                    {doc.summary && (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        {doc.summary}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 文档内容弹窗 */}
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <FileText className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-gray-900">
                      {selectedDoc.title}
                    </h2>
                    {selectedDoc.summary && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {selectedDoc.summary}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDocId(null)}
                  aria-label="关闭"
                  className="ml-4 flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    pointerEvents="none"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedDoc.content?.trim() || '（该文档暂无正文内容）'}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </StudioLayout>
  );
}
