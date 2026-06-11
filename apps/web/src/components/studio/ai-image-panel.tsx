'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
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
import type { PreviewMaterial } from '@/lib/preview-body';
import {
  getCompactCoverThumbWidth,
  getPlatformCoverInfo,
  pickCoverUrl,
} from '@/lib/platform-cover';
import { getPlatformLabel } from '@/lib/tokens';

type Material = PreviewMaterial & { id: string; type: string };

function asImageMaterials(materials: PreviewMaterial[]): Material[] {
  return materials.filter((m): m is Material =>
    Boolean(m.id && m.type && m.url && m.type === 'IMAGE')
  );
}

const PLATFORM_OPTIONS = [
  { value: 'XIAOHONGSHU', label: '小红书' },
  { value: 'WECHAT', label: '公众号' },
  { value: 'DOUYIN', label: '抖音' },
  { value: 'VIDEO_CHANNEL', label: '视频号' },
  { value: 'ZHIHU', label: '知乎' },
];

function materialShortLabel(m: Material, index: number) {
  if (m.role === 'COVER') {
    const n = m.name?.match(/\d+/)?.[0];
    return n ? `封面 ${n}` : '封面';
  }
  const slot = m.name?.match(/fig-\d+|slot[-\w]+/i)?.[0];
  return slot ? slot.replace(/^slot/i, '位') : `配图 ${index + 1}`;
}

type AiImagePanelProps = {
  contentId: string;
  materials?: PreviewMaterial[];
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

  const coverInfo = getPlatformCoverInfo(platform);

  useEffect(() => {
    setPlatform(defaultPlatform);
  }, [defaultPlatform]);

  const imageMaterials = asImageMaterials(materials);

  useEffect(() => {
    const url = pickCoverUrl(materials, { platform, versionId });
    setLatestUrl(url);
  }, [materials, platform, versionId]);

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
      setError(e instanceof Error ? e.message : '生成失败');
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
      setError(e instanceof Error ? e.message : '修改失败');
    } finally {
      setEditing(false);
    }
  }, [contentId, role, platform, editMaterialId, editInstruction, onUpdated]);

  return (
    <div
      className={cn(
        'rounded-lg border border-[#E5E8EF] bg-white',
        compact ? 'p-3' : 'p-5'
      )}
    >
      <h3 className="mb-3 text-sm font-semibold text-[#1D2129]">
        补充生成图片
      </h3>

      {latestUrl && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs text-[#86909C]">
            {getPlatformLabel(platform)} · {coverInfo.aspectLabel}
          </p>
          <div
            className={cn(
              'mx-auto overflow-hidden rounded-lg border border-[#E5E8EF] bg-[#FAFBFC]',
              coverInfo.aspect,
              compact
                ? getCompactCoverThumbWidth(coverInfo.aspect)
                : 'max-w-sm w-full'
            )}
          >
            <img
              src={latestUrl}
              alt="封面预览"
              className="size-full object-cover"
            />
          </div>
        </div>
      )}

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        {compact ? (
          <div className="sm:col-span-2">
            <Label className="text-xs text-[#86909C]">目标平台</Label>
            <p className="mt-1 text-sm font-medium text-[#1D2129]">
              {getPlatformLabel(platform)}
              <span className="ml-1.5 font-normal text-[#86909C]">
                · {coverInfo.aspectLabel}
              </span>
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[#86909C]">
              {coverInfo.description}。切换右侧预览 Tab 可生成其他平台尺寸。
            </p>
          </div>
        ) : (
          <div>
            <Label className="text-xs text-[#86909C]">平台</Label>
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
            <p className="mt-1 text-[11px] text-[#86909C]">
              {coverInfo.aspectLabel} · {coverInfo.description}
            </p>
          </div>
        )}
        <div>
          <Label className="text-xs text-[#86909C]">类型</Label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as 'COVER' | 'BODY')}
          >
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COVER">封面</SelectItem>
              <SelectItem value="BODY">配图</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-3">
        <Label className="text-xs text-[#86909C]">画面描述（可选）</Label>
        <Textarea
          className="mt-1 min-h-[56px] text-sm"
          placeholder="不填则按文章自动生成"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
        />
      </div>

      <Button
        className="h-9 w-full gap-2 bg-[#722ED1] hover:bg-[#531DAB] sm:w-auto"
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
        <div className="mt-3 border-t border-[#F2F3F5] pt-3">
          <p className="mb-2 text-xs font-medium text-[#4E5969]">改已有图</p>
          <div className="mb-2 flex max-h-28 flex-wrap gap-2 overflow-y-auto">
            {imageMaterials.map((m, index) => (
              <button
                key={m.id}
                type="button"
                title={materialShortLabel(m, index)}
                onClick={() => setEditMaterialId(m.id)}
                className={cn(
                  'flex flex-col items-center gap-0.5 overflow-hidden rounded-md border-2 transition-all',
                  editMaterialId === m.id
                    ? 'border-[#722ED1]'
                    : 'border-transparent opacity-80 hover:opacity-100'
                )}
              >
                <img
                  src={m.url!}
                  alt={materialShortLabel(m, index)}
                  className="size-12 object-cover"
                />
                <span className="max-w-12 truncate px-0.5 text-[9px] text-[#86909C]">
                  {materialShortLabel(m, index)}
                </span>
              </button>
            ))}
          </div>
          <Textarea
            className="mb-2 min-h-[52px] text-sm"
            placeholder="想怎么改？如：背景改暖色"
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
            应用修改
          </Button>
        </div>
      )}

      {error && (
        <p className="mt-2 rounded-lg border border-[#FFCCC7] bg-[#FFF1F0] px-3 py-2 text-xs text-[#F53F3F]">
          {error}
        </p>
      )}
    </div>
  );
}
