'use client';

import Link from 'next/link';
import { FileText, FileVideo, FolderPlus, Music, Play } from 'lucide-react';
import type { MaterialItem } from '@/lib/material-mappers';
import { cn } from '@/lib/utils';

const typeMeta = {
  image: { label: '图片', icon: null },
  video: { label: '视频', icon: FileVideo },
  document: { label: '文档', icon: FileText },
  audio: { label: '音频', icon: Music },
  other: { label: '其他', icon: FolderPlus },
} as const;

function MaterialPreview({
  item,
  className,
}: {
  item: MaterialItem;
  className?: string;
}) {
  const url = item.url ?? undefined;

  if (item.type === 'image' && url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={item.name}
        className={cn('size-full object-cover', className)}
        loading="lazy"
      />
    );
  }

  if (item.type === 'video' && url) {
    return (
      <div className={cn('relative size-full bg-[#111827]', className)}>
        <video
          src={url}
          className="size-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
          <span className="flex size-12 items-center justify-center rounded-full bg-black/55 text-white">
            <Play className="size-5 fill-current" />
          </span>
        </span>
      </div>
    );
  }

  if (item.type === 'audio' && url) {
    return (
      <div
        className={cn(
          'flex size-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#E8FFF3] to-[#D6F5E8] p-4',
          className
        )}
      >
        <Music className="size-10 text-[#10B981]" />
        <audio
          src={url}
          controls
          className="w-full max-w-full"
          preload="none"
        />
      </div>
    );
  }

  const Icon = typeMeta[item.type].icon ?? FolderPlus;
  const bg =
    item.type === 'video'
      ? 'from-[#1e1b4b] via-[#312e81] to-[#4c1d95]'
      : item.type === 'document'
        ? 'from-[#FFF1F0] via-[#FFECE8] to-[#FFD6CC]'
        : 'from-[#F5F7FA] via-[#EEF0F5] to-[#E5E8EF]';

  return (
    <div
      className={cn(
        'flex size-full flex-col items-center justify-center bg-gradient-to-br',
        bg,
        className
      )}
    >
      <Icon
        className={cn(
          'size-12',
          item.type === 'video'
            ? 'text-white/90'
            : item.type === 'document'
              ? 'text-[#F53F3F]'
              : 'text-[#86909C]'
        )}
      />
      {item.type === 'video' && (
        <span className="mt-3 flex size-10 items-center justify-center rounded-full bg-white/20 text-white">
          <Play className="size-4 fill-current" />
        </span>
      )}
      {!url && (
        <span className="mt-2 text-[11px] text-[#86909C]">暂无预览地址</span>
      )}
    </div>
  );
}

interface MaterialGridCardProps {
  item: MaterialItem;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onPreview?: (item: MaterialItem) => void;
  onEdit?: (item: MaterialItem) => void;
  onDelete?: (id: string) => void;
}

export function MaterialGridCard({
  item,
  selected,
  onSelect,
  onPreview,
  onEdit,
  onDelete,
}: MaterialGridCardProps) {
  const meta = typeMeta[item.type];

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-md',
        selected
          ? 'border-[#1664FF] ring-2 ring-[#1664FF]/20'
          : 'border-[#E5E8EF]'
      )}
    >
      <button
        type="button"
        className="relative block aspect-[4/3] w-full overflow-hidden bg-[#F7F8FA] text-left"
        onClick={() => onPreview?.(item)}
      >
        <MaterialPreview item={item} />
        <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">
          {meta.label}
        </span>
        {onSelect && (
          <label
            className="absolute right-2 top-2 flex size-7 cursor-pointer items-center justify-center rounded-md bg-white/90 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              className="accent-[#1664FF]"
              checked={selected}
              onChange={() => onSelect(item.id)}
            />
          </label>
        )}
      </button>

      <div className="space-y-2 p-3">
        <button
          type="button"
          className="line-clamp-2 text-left text-sm font-semibold text-[#1D2129] hover:text-[#1664FF]"
          onClick={() => onPreview?.(item)}
          title={item.name}
        >
          {item.name}
        </button>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#86909C]">
          <span>{item.format}</span>
          <span>·</span>
          <span>{item.size}</span>
          <span>·</span>
          <span>{item.uploadedAt}</span>
        </div>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-[#E8F3FF] px-1.5 py-0.5 text-[10px] font-medium text-[#1664FF]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {item.contentId && (
          <Link
            href={`/contents/${item.contentId}`}
            className="block truncate text-[11px] text-[#1664FF] hover:underline"
          >
            {item.contentTitle ?? '查看所属内容'}
          </Link>
        )}
        <div className="flex items-center gap-3 border-t border-[#F2F3F5] pt-2 text-xs font-medium text-[#1664FF]">
          <button type="button" onClick={() => onPreview?.(item)}>
            预览
          </button>
          <button type="button" onClick={() => onEdit?.(item)}>
            编辑
          </button>
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              打开
            </a>
          ) : null}
          <button
            type="button"
            className="text-[#F53F3F]"
            onClick={() => onDelete?.(item.id)}
          >
            删除
          </button>
        </div>
      </div>
    </article>
  );
}
