'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ImageIcon,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

type Material = {
  id: string;
  role: string;
  name?: string | null;
  url?: string | null;
  type: string;
};

const PLATFORM_OPTIONS = [
  { value: 'XIAOHONGSHU', label: '小红书' },
  { value: 'WECHAT', label: '微信公众号' },
  { value: 'DOUYIN', label: '抖音' },
  { value: 'VIDEO_CHANNEL', label: '视频号' },
  { value: 'ZHIHU', label: '知乎' },
];

type AiImagePanelProps = {
  contentId: string;
  materials?: Material[];
  defaultPlatform?: string;
  versionId?: string;
  onUpdated?: () => void;
  compact?: boolean;
};

export function AiImagePanel({
  contentId,
  materials = [],
  defaultPlatform = 'XIAOHONGSHU',
  versionId,
  onUpdated,
  compact = false,
}: AiImagePanelProps) {
  const [platform, setPlatform] = useState(defaultPlatform);
  const [role, setRole] = useState<'COVER' | 'BODY'>('COVER');
  const [customPrompt, setCustomPrompt] = useState('');
  const [editMaterialId, setEditMaterialId] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestUrl, setLatestUrl] = useState<string | null>(null);

  const imageMaterials = materials.filter((m) => m.type === 'IMAGE' && m.url);

  useEffect(() => {
    const cover = imageMaterials.find((m) => m.role === 'COVER');
    setLatestUrl(cover?.url ?? imageMaterials[0]?.url ?? null);
  }, [materials, imageMaterials]);

  const runGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await api<{ material: Material }>(
        `/api/contents/${contentId}/images/generate`,
        {
          method: 'POST',
          body: JSON.stringify({
            role,
            platform,
            versionId,
            prompt: customPrompt.trim() || undefined,
          }),
        }
      );
      setLatestUrl(res.data.material.url ?? null);
      setCustomPrompt('');
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : '图片生成失败');
    } finally {
      setGenerating(false);
    }
  }, [contentId, role, platform, versionId, customPrompt, onUpdated]);

  const runEdit = useCallback(async () => {
    if (!editMaterialId || !editInstruction.trim()) return;
    setEditing(true);
    setError(null);
    try {
      const res = await api<{ material: Material }>(
        `/api/contents/${contentId}/images/generate`,
        {
          method: 'POST',
          body: JSON.stringify({
            role,
            platform,
            sourceMaterialId: editMaterialId,
            editInstruction: editInstruction.trim(),
          }),
        }
      );
      setLatestUrl(res.data.material.url ?? null);
      setEditInstruction('');
      onUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : '图片修改失败');
    } finally {
      setEditing(false);
    }
  }, [contentId, role, platform, editMaterialId, editInstruction, onUpdated]);

  return (
    <div
      className={cn(
        'rounded-lg border border-[#E5E8EF] bg-white',
        compact ? 'p-4' : 'p-5'
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-[#722ED1]/10 text-[#722ED1]">
          <ImageIcon className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#1D2129]">AI 图片生成</h3>
          <p className="text-xs text-[#86909C]">
            豆包 Seedream 文生图 / 图生图，自动生成封面与配图
          </p>
        </div>
      </div>

      {latestUrl && (
        <div className="mb-4 overflow-hidden rounded-lg border border-[#E5E8EF] bg-[#FAFBFC]">
          <img
            src={latestUrl}
            alt="生成预览"
            className="mx-auto max-h-64 w-full object-contain"
          />
        </div>
      )}

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-[#86909C]">目标平台</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-[#86909C]">图片用途</Label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as 'COVER' | 'BODY')}
          >
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COVER">封面图</SelectItem>
              <SelectItem value="BODY">正文配图</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-3">
        <Label className="text-xs text-[#86909C]">
          自定义提示词（可选，留空则由 AI 自动生成）
        </Label>
        <Textarea
          className="mt-1 min-h-[72px] text-sm"
          placeholder="例如：清新扁平插画，科技主题，蓝白配色，适合小红书封面"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
        />
      </div>

      <Button
        className="mb-4 h-9 gap-2 bg-[#722ED1] hover:bg-[#531DAB]"
        disabled={generating}
        onClick={runGenerate}
      >
        {generating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {generating ? '生成中…' : '生成图片'}
      </Button>

      {imageMaterials.length > 0 && (
        <div className="border-t border-[#F2F3F5] pt-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#4E5969]">
            <Pencil className="size-3.5" />
            修改已有图片
          </div>
          <div className="mb-2 flex flex-wrap gap-2">
            {imageMaterials.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setEditMaterialId(m.id)}
                className={cn(
                  'overflow-hidden rounded-md border-2 transition-all',
                  editMaterialId === m.id
                    ? 'border-[#722ED1]'
                    : 'border-transparent opacity-80 hover:opacity-100'
                )}
              >
                <img
                  src={m.url!}
                  alt={m.name ?? '素材'}
                  className="size-14 object-cover"
                />
              </button>
            ))}
          </div>
          <Textarea
            className="mb-2 min-h-[60px] text-sm"
            placeholder="描述要如何修改，例如：把背景改成暖色调、加上标题文字区域"
            value={editInstruction}
            onChange={(e) => setEditInstruction(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={editing || !editMaterialId || !editInstruction.trim()}
            onClick={runEdit}
          >
            {editing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Wand2 className="size-3" />
            )}
            修改图片
          </Button>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-[#FFCCC7] bg-[#FFF1F0] px-3 py-2 text-xs text-[#F53F3F]">
          {error}
        </p>
      )}

      {!compact && imageMaterials.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-[#86909C]">
          <RefreshCw className="size-3" />
          已生成 {imageMaterials.length} 张，可在发布预览中查看效果
        </div>
      )}
    </div>
  );
}
