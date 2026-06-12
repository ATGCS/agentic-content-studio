'use client';

import Link from 'next/link';
import { Clock, RefreshCcw } from 'lucide-react';
import { getStatusLabel } from '@/lib/tokens';
import { cn } from '@/lib/utils';

export type KanbanContent = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  creator?: { name: string; email: string } | null;
  versions?: {
    platform: string;
    account?: { accountName: string } | null;
  }[];
};

export const KANBAN_COLUMNS = [
  {
    key: 'pendingGenerate',
    label: '待生成',
    statuses: ['DRAFT', 'PENDING_GENERATE'],
    color: 'blue',
  },
  {
    key: 'generating',
    label: '生成中',
    statuses: ['GENERATING'],
    color: 'cyan',
  },
  {
    key: 'pendingPublish',
    label: '待发布',
    statuses: ['APPROVED', 'PENDING_PUBLISH'],
    color: 'purple',
  },
  {
    key: 'published',
    label: '已发布',
    statuses: ['PUBLISHED', 'PUBLISHING'],
    color: 'green',
  },
  { key: 'reviewed', label: '已复盘', statuses: ['REVIEWED'], color: 'blue' },
] as const;

function columnForStatus(status: string) {
  return KANBAN_COLUMNS.find((col) =>
    (col.statuses as readonly string[]).includes(status)
  );
}

function formatKanbanTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: '待审核',
  PENDING_PUBLISH: '待发布',
  PUBLISHED: '已发布',
  REVIEWED: '复盘完成',
  DRAFT: '草稿',
  PENDING_GENERATE: '待生成',
};

function KanbanCard({ item }: { item: KanbanContent }) {
  const owner = item.creator?.name ?? item.creator?.email ?? '—';
  const progress =
    item.status === 'GENERATING' ? 35 + (item.id.charCodeAt(0) % 55) : null;
  const timeLabel = formatKanbanTime(item.updatedAt);
  const statusLabel = STATUS_LABEL[item.status] ?? item.status;

  return (
    <Link
      href={`/contents/${item.id}`}
      className="studio-kanban-card block rounded-[12px] border border-[#f2f5fa] bg-white p-4 transition-shadow hover:shadow-md"
    >
      <p className="line-clamp-2 text-sm font-semibold text-[#1D2129]">
        {item.title}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        {item.status === 'PENDING_REVIEW' && (
          <span className="text-xs font-medium text-[#ff6a00]">待审核</span>
        )}
        {progress !== null && (
          <>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f2f5fa]">
              <div
                className="h-full rounded-full bg-[#1664ff]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-[#86909c]">
              {progress}%
            </span>
          </>
        )}
        {item.status === 'PENDING_PUBLISH' && (
          <>
            <Clock className="size-3 text-[#86909c]" />
            <span className="text-[11px] text-[#86909c]">待发布</span>
          </>
        )}
        {item.status === 'PUBLISHED' && (
          <span className="text-[11px] text-[#86909c]">已发布</span>
        )}
        {item.status === 'REVIEWED' && (
          <span className="text-[11px] text-[#86909c]">复盘完成</span>
        )}
        {item.status === 'DRAFT' && (
          <span className="text-[11px] text-[#86909c]">草稿</span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex size-5 items-center justify-center rounded-full bg-[#f7d6c9] text-[10px] font-medium text-[#873e32]">
          {owner.slice(0, 1)}
        </span>
        <span className="text-[10px] text-[#a9aeb8]">
          {statusLabel} · {timeLabel}
        </span>
      </div>
    </Link>
  );
}

export function WorkflowKanban({
  items,
  counts,
}: {
  items: KanbanContent[];
  counts: Partial<Record<string, number>>;
}) {
  const grouped = KANBAN_COLUMNS.map((col) => ({
    ...col,
    count: counts[col.key] ?? 0,
    cards: items.filter(
      (item) => columnForStatus(item.status)?.key === col.key
    ),
  }));

  const colorStyles: Record<string, string> = {
    blue: 'bg-[#f0f5ff] text-[#1664ff]',
    cyan: 'bg-[#e0f7ff] text-[#06b6d4]',
    orange: 'bg-[#fff3e8] text-[#ff6a00]',
    purple: 'bg-[#f3efff] text-[#7c3aed]',
    green: 'bg-[#e6f4e7] text-[#00b42a]',
  };

  return (
    <div className="studio-kanban-board">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1D2129]">
          内容状态流程看板
        </h3>
        <div className="flex items-center gap-3">
          <select className="rounded-lg border border-[#f2f5fa] bg-white px-3 py-1 text-xs text-[#86909c]">
            <option>全部项目</option>
          </select>
          <RefreshCcw className="size-4 text-[#86909c]" />
        </div>
      </div>
      <div className="studio-kanban-scroll flex gap-2 overflow-x-auto pb-2">
        {grouped.map((col, idx) => (
          <div
            key={col.key}
            className="studio-kanban-column min-w-[190px] flex-1"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className={cn('text-xs font-bold', colorStyles[col.color])}>
                {col.label}
              </span>
              <span className="text-base font-bold text-[#1D2129]">
                {col.count}
              </span>
            </div>
            <div className="space-y-2">
              {col.cards.slice(0, 4).map((item) => (
                <KanbanCard key={item.id} item={item} />
              ))}
              {col.cards.length === 0 && (
                <div className="rounded-lg border border-dashed border-[#f2f5fa] py-6 text-center text-xs text-[#a9aeb8]">
                  暂无{col.label}
                </div>
              )}
              {col.cards.length > 4 && (
                <p className="text-center text-xs text-[#86909c]">
                  +{col.cards.length - 4} 条
                </p>
              )}
            </div>
            {idx < grouped.length - 1 && (
              <span className="studio-kanban-arrow hidden lg:block" aria-hidden>
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatusDot({ status }: { status: string }) {
  const label = getStatusLabel(status);
  const colorMap: Record<string, string> = {
    GENERATING: 'bg-[#1664ff]',
    PENDING_REVIEW: 'bg-[#ff6a00]',
    PENDING_PUBLISH: 'bg-[#7c3aed]',
    APPROVED: 'bg-[#7c3aed]',
    PUBLISHED: 'bg-[#00b42a]',
    REVIEWED: 'bg-[#1664ff]',
    DRAFT: 'bg-[#86909c]',
    PENDING_GENERATE: 'bg-[#86909c]',
  };
  const dot = colorMap[status] ?? 'bg-[#86909c]';

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[#4e5969]">
      <span className={cn('size-2 rounded-full', dot)} />
      {label}
    </span>
  );
}
