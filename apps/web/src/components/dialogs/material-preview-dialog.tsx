'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { DialogWrapper } from '@/components/dialog-wrapper';
import { Button } from '@/components/ui/button';
import type { MaterialItem } from '@/lib/material-mappers';

interface MaterialPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: MaterialItem | null;
}

export function MaterialPreviewDialog({ open, onOpenChange, material }: MaterialPreviewDialogProps) {
  if (!material) return null;

  const previewUrl = material.url ?? undefined;

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title={material.name}
      description={`${material.format} · ${material.size}`}
      className="sm:max-w-[640px]"
    >
      <div className="space-y-4">
        <div className="flex min-h-[200px] items-center justify-center overflow-hidden rounded-lg border border-[#EEF0F5] bg-[#F7F8FA] p-4">
          {!previewUrl ? (
            <p className="text-sm text-[#86909C]">暂无预览地址</p>
          ) : material.type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={material.name} className="max-h-[360px] max-w-full rounded-md object-contain" />
          ) : material.type === 'video' ? (
            <video src={previewUrl} controls className="max-h-[360px] max-w-full rounded-md" />
          ) : material.type === 'audio' ? (
            <audio src={previewUrl} controls className="w-full" />
          ) : (
            <div className="space-y-2 text-center">
              <p className="break-all text-sm text-[#4E5969]">{previewUrl}</p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-[#1664FF]"
              >
                新窗口打开 <ExternalLink className="size-3.5" />
              </a>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-[#4E5969]">
          <div><span className="text-[#86909C]">来源：</span>{material.source}</div>
          <div><span className="text-[#86909C]">上传人：</span>{material.uploader}</div>
          <div><span className="text-[#86909C]">上传时间：</span>{material.uploadedAt}</div>
          <div>
            <span className="text-[#86909C]">标签：</span>
            {material.tags.length > 0 ? material.tags.join('、') : '-'}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-[#F2F3F5] pt-4">
          {material.contentId && (
            <Button asChild variant="outline" size="sm" className="h-9 text-xs">
              <Link href={`/contents/${material.contentId}`}>查看所属内容</Link>
            </Button>
          )}
          {previewUrl && (
            <Button asChild size="sm" className="h-9 bg-[#1664FF] text-xs text-white hover:bg-[#0E52D9]">
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">下载 / 打开</a>
            </Button>
          )}
        </div>
      </div>
    </DialogWrapper>
  );
}
