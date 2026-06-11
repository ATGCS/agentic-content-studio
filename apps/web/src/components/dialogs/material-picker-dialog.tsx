'use client';

import { useEffect, useState } from 'react';
import { Image, Search, FileVideo, FileAudio, File } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

type ContentMaterial = {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
  role?: string | null;
  name?: string | null;
  url?: string | null;
  localPath?: string | null;
  source?: string | null;
};

export type PickedMaterial = {
  id: string;
  url: string;
  name: string;
  type: string;
};

interface MaterialPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  onPick: (material: PickedMaterial) => void;
}

const typeIcon: Record<string, typeof Image> = {
  IMAGE: Image,
  VIDEO: FileVideo,
  AUDIO: FileAudio,
  FILE: File,
};

export function MaterialPickerDialog({
  open,
  onOpenChange,
  contentId,
  onPick,
}: MaterialPickerDialogProps) {
  const [materials, setMaterials] = useState<ContentMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !contentId) return;
    setLoading(true);
    setSelectedId(null);
    setKeyword('');
    api<ContentMaterial[]>(`/api/contents/${contentId}/materials`)
      .then((res) => setMaterials(res.data ?? []))
      .catch(() => setMaterials([]))
      .finally(() => setLoading(false));
  }, [open, contentId]);

  const filtered = materials.filter((m) => {
    if (!keyword.trim()) return true;
    const kw = keyword.toLowerCase();
    return (
      m.name?.toLowerCase().includes(kw) ||
      m.source?.toLowerCase().includes(kw) ||
      m.type.toLowerCase().includes(kw)
    );
  });

  const imageMaterials = filtered.filter((m) => m.type === 'IMAGE' && m.url);
  const otherMaterials = filtered.filter((m) => !(m.type === 'IMAGE' && m.url));

  function handleConfirm() {
    if (!selectedId) return;
    const m = materials.find((x) => x.id === selectedId);
    if (!m || !m.url) return;
    onPick({
      id: m.id,
      url: m.url,
      name: m.name ?? '未命名素材',
      type: m.type,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>选择素材插入</DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#86909c]" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索素材名称…"
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <p className="py-8 text-center text-sm text-[#86909c]">加载中…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#86909c]">
              {materials.length === 0
                ? '当前内容暂无关联素材，请先通过 AI 生成或手动添加素材'
                : '无匹配素材'}
            </p>
          ) : (
            <div className="space-y-4">
              {imageMaterials.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-[#86909c]">
                    图片素材 ({imageMaterials.length})
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {imageMaterials.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedId(m.id)}
                        className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                          selectedId === m.id
                            ? 'border-[#1664FF] ring-2 ring-[#1664FF]/30'
                            : 'border-[#E5E8EF] hover:border-[#C9D8FF]'
                        }`}
                      >
                        <img
                          src={m.url!}
                          alt={m.name ?? ''}
                          className="size-full object-cover"
                        />
                        {m.role && (
                          <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                            {m.role}
                          </span>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                          <p className="truncate text-[10px] text-white">
                            {m.name ?? '未命名'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {otherMaterials.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-[#86909c]">
                    其他素材 ({otherMaterials.length})
                  </p>
                  <div className="space-y-1">
                    {otherMaterials.map((m) => {
                      const Icon = typeIcon[m.type] ?? File;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedId(m.id)}
                          className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all ${
                            selectedId === m.id
                              ? 'border-[#1664FF] bg-[#F0F5FF]'
                              : 'border-[#E5E8EF] hover:border-[#C9D8FF]'
                          }`}
                        >
                          <Icon className="size-4 shrink-0 text-[#86909c]" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-[#1D2129]">
                              {m.name ?? '未命名素材'}
                            </p>
                            <p className="text-[11px] text-[#86909c]">
                              {m.type} · {m.source ?? '未知来源'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E5E8EF] pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={!selectedId}
            onClick={handleConfirm}
            className="bg-[#1664FF] hover:bg-[#0E52D9]"
          >
            插入素材
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
