'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioCard } from '@/components/studio/studio-card';
import { PlatformBadge } from '@/components/studio/platform-badge';
import { api } from '@/lib/api';
import { getPlatformLabel } from '@/lib/tokens';

type RevisionSnapshot = {
  title?: string | null;
  summary?: string | null;
  body?: string | null;
  coverText?: string | null;
  tags?: unknown;
};

type ContentRevision = {
  id: string;
  scope: 'DRAFT' | 'VERSION';
  platform?: string | null;
  trigger: string;
  agentType?: string | null;
  label?: string | null;
  snapshot: RevisionSnapshot;
  createdAt: string;
  agentRun?: {
    agent?: { type: string; name: string } | null;
  } | null;
  creator?: { name: string } | null;
};

const TRIGGER_LABEL: Record<string, string> = {
  workflow: '一键生成',
  agent: 'AI 改写',
  manual: '手动保存',
};

const AGENT_TYPE_LABEL: Record<string, string> = {
  BODY: '正文',
  REWRITE: '平台改写',
  TITLE: '标题',
  COVER_COPY: '封面文案',
  TAG: '标签',
  SUMMARY: '摘要',
};

function formatTime(value: string) {
  const d = new Date(value);
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRevisionTitle(revision: ContentRevision) {
  const snapshot = revision.snapshot;
  if (snapshot.title?.trim()) return snapshot.title.trim();
  if (snapshot.body?.trim()) {
    const line = snapshot.body.trim().split('\n')[0];
    return line.length > 48 ? `${line.slice(0, 48)}…` : line;
  }
  return revision.label ?? '无标题快照';
}

function getRevisionDescription(revision: ContentRevision) {
  const parts: string[] = [];
  parts.push(TRIGGER_LABEL[revision.trigger] ?? revision.trigger);
  if (revision.agentType) {
    parts.push(AGENT_TYPE_LABEL[revision.agentType] ?? revision.agentType);
  }
  if (revision.label && revision.label !== parts[0]) {
    parts.push(revision.label);
  }
  return parts.join(' · ');
}

export function ContentRevisionHistory({
  contentId,
  onRestored,
}: {
  contentId: string;
  onRestored?: () => void;
}) {
  const [revisions, setRevisions] = useState<ContentRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<ContentRevision[]>(
        `/api/contents/${contentId}/revisions?limit=30`
      );
      setRevisions(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  async function restore(revisionId: string) {
    setRestoringId(revisionId);
    try {
      await api(`/api/contents/${contentId}/revisions/${revisionId}/restore`, {
        method: 'POST',
      });
      await load();
      onRestored?.();
    } catch (e) {
      console.error(e);
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <StudioCard contentClassName="space-y-2 px-2 pb-2 pt-0">
      <div className="flex items-center gap-1.5">
        <History className="size-4 text-[#86909c]" />
        <h3 className="text-sm font-semibold text-[#1D2129]">生成历史</h3>
      </div>
      <p className="text-xs leading-relaxed text-[#86909c]">
        记录一键生成、AI 改写与手动保存前的内容快照，可预览并恢复。
      </p>

      {loading ? (
        <p className="text-xs text-[#86909c]">加载中…</p>
      ) : revisions.length === 0 ? (
        <p className="text-xs text-[#86909c]">暂无历史记录</p>
      ) : (
        <ul className="space-y-1.5">
          {revisions.map((revision) => {
            const expanded = expandedId === revision.id;
            const snapshot = revision.snapshot;
            return (
              <li
                key={revision.id}
                className="rounded-lg border border-[#e5e6eb] bg-[#fafbfc] px-2 py-1.5"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpandedId(expanded ? null : revision.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[#1D2129]">
                        {getRevisionTitle(revision)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#86909c]">
                        {formatTime(revision.createdAt)} ·{' '}
                        {getRevisionDescription(revision)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {revision.scope === 'VERSION' && revision.platform ? (
                        <PlatformBadge platform={revision.platform} />
                      ) : (
                        <span className="rounded bg-[#f2f3f5] px-1.5 py-0.5 text-[10px] text-[#4e5969]">
                          总稿
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="mt-2 space-y-2 border-t border-[#e5e6eb] pt-2">
                    {snapshot.summary && (
                      <p className="text-[11px] text-[#4e5969]">
                        <span className="text-[#86909c]">摘要：</span>
                        {snapshot.summary}
                      </p>
                    )}
                    {snapshot.coverText && (
                      <p className="text-[11px] text-[#4e5969]">
                        <span className="text-[#86909c]">封面文案：</span>
                        {snapshot.coverText}
                      </p>
                    )}
                    {snapshot.body && (
                      <pre className="max-h-32 overflow-auto rounded bg-white p-2 text-[11px] leading-relaxed text-[#4e5969] whitespace-pre-wrap font-mono">
                        {snapshot.body}
                      </pre>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-[#86909c]">
                        {revision.scope === 'VERSION' && revision.platform
                          ? getPlatformLabel(revision.platform)
                          : '总稿'}
                        {revision.creator?.name
                          ? ` · ${revision.creator.name}`
                          : ''}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={restoringId === revision.id}
                        onClick={() => restore(revision.id)}
                      >
                        <RotateCcw className="size-3" />
                        {restoringId === revision.id ? '恢复中…' : '恢复'}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </StudioCard>
  );
}
