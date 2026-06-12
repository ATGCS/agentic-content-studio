'use client';

import Link from 'next/link';
import { ChevronRight, Send, Sparkles, FileCheck } from 'lucide-react';
import { PlatformBadge } from '@/components/studio/platform-badge';

type DashboardStats = {
  pendingGenerate: number;
  pendingPublish: number;
};

type ContentItem = {
  id: string;
  title: string;
  status: string;
  versions: { platform: string }[];
};

export function DashboardTodoRail({
  stats,
  items,
}: {
  stats: DashboardStats | null;
  items: ContentItem[];
}) {
  // 生成完成待确认的内容（GENERATING 状态已完成，等待用户确认）
  const readyToConfirm = items.filter(
    (item) =>
      item.versions.length > 0 &&
      item.status === 'APPROVED'
  );

  const todos = [
    stats && stats.pendingGenerate > 0
      ? {
          key: 'generate',
          label: `${stats.pendingGenerate} 篇待 AI 生成`,
          href: '/contents?status=DRAFT',
          icon: Sparkles,
          tone: 'text-[#1664FF] bg-[#E8F3FF]',
        }
      : null,
    readyToConfirm.length > 0
      ? {
          key: 'confirm',
          label: `${readyToConfirm.length} 篇待确认发布`,
          href: `/contents/${readyToConfirm[0].id}`,
          icon: FileCheck,
          tone: 'text-[#00B42A] bg-[#E8FFEA]',
        }
      : null,
    stats && stats.pendingPublish > 0
      ? {
          key: 'publish',
          label: `${stats.pendingPublish} 篇待发布`,
          href: '/publishing',
          icon: Send,
          tone: 'text-[#722ED1] bg-[#F5F1FF]',
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    href: string;
    icon: typeof Sparkles;
    tone: string;
  }>;

  return (
    <aside className="flex w-full shrink-0 flex-col gap-2 xl:w-[260px]">
      <div className="rounded-[12px] bg-white p-3 shadow-sm">
        <h4 className="mb-2 text-sm font-semibold text-[#1D2129]">我的待办</h4>
        {todos.length === 0 ? (
          <p className="text-xs leading-relaxed text-[#86909C]">
            暂无待办。从「新建文章」开始创作吧。
          </p>
        ) : (
          <div className="space-y-2">
            {todos.map((todo) => {
              const Icon = todo.icon;
              return (
                <Link
                  key={todo.key}
                  href={todo.href}
                  className="flex items-center gap-3 rounded-lg border border-[#F2F3F5] px-3 py-2.5 transition-colors hover:border-[#C9D8FF] hover:bg-[#FAFBFC]"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${todo.tone}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-xs font-medium text-[#1D2129]">
                    {todo.label}
                  </span>
                  <ChevronRight className="size-3.5 shrink-0 text-[#C9CDD4]" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="rounded-[12px] bg-white p-3 shadow-sm">
          <h4 className="mb-2 text-sm font-semibold text-[#1D2129]">
            最近内容
          </h4>
          <div className="space-y-1.5">
            {items.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                href={`/contents/${item.id}`}
                className="block rounded-lg px-2 py-1.5 hover:bg-[#FAFBFC]"
              >
                <p className="truncate text-xs font-medium text-[#1D2129]">
                  {item.title}
                </p>
                {item.versions[0] && (
                  <PlatformBadge
                    platform={item.versions[0].platform}
                    size="sm"
                    className="mt-1"
                  />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
