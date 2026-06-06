'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DialogWrapper } from '@/components/dialog-wrapper';
import { api, ApiError } from '@/lib/api';

const materialTypes = [
  { value: 'IMAGE', label: '图片' },
  { value: 'VIDEO', label: '视频' },
  { value: 'AUDIO', label: '音频' },
  { value: 'FILE', label: '文件' },
];

const materialRoles = [
  { value: 'COVER', label: '封面' },
  { value: 'BODY', label: '正文' },
  { value: 'ATTACHMENT', label: '附件' },
];

type ContentOption = {
  id: string;
  title: string;
};

interface UploadMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UploadMaterialDialog({ open, onOpenChange, onSuccess }: UploadMaterialDialogProps) {
  const [contents, setContents] = useState<ContentOption[]>([]);
  const [contentId, setContentId] = useState('');
  const [type, setType] = useState('IMAGE');
  const [role, setRole] = useState('ATTACHMENT');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [source, setSource] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingContents, setLoadingContents] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingContents(true);
    setError(null);
    api<{ items: ContentOption[] }>('/api/contents')
      .then((res) => setContents(res.data.items ?? []))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : '内容列表加载失败');
      })
      .finally(() => setLoadingContents(false));
    setContentId('');
    setType('IMAGE');
    setRole('ATTACHMENT');
    setName('');
    setUrl('');
    setSource('');
    setTags('');
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentId || !url.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const meta = tags.trim()
        ? { tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }
        : undefined;

      await api('/api/materials', {
        method: 'POST',
        body: JSON.stringify({
          contentId,
          type,
          role,
          name: name.trim() || undefined,
          url: url.trim(),
          source: source.trim() || 'manual',
          meta,
        }),
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '上传失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title="上传素材"
      description="通过 URL 添加素材，需选择所属内容项目"
      className="sm:max-w-[520px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!loadingContents && contents.length === 0 && (
          <div className="rounded-md border border-[#FFF7E8] bg-[#FFF7E8] px-3 py-2 text-xs text-[#FF7D00]">
            暂无内容项目，请先
            {' '}
            <Link href="/contents" className="font-semibold text-[#1664FF] underline">
              创建内容项目
            </Link>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-medium text-[#4E5969]">所属内容 <span className="text-[#F53F3F]">*</span></Label>
          <Select value={contentId} onValueChange={setContentId} disabled={contents.length === 0}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={loadingContents ? '加载中…' : '选择内容项目'} />
            </SelectTrigger>
            <SelectContent>
              {contents.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#4E5969]">类型 <span className="text-[#F53F3F]">*</span></Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {materialTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#4E5969]">用途</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {materialRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-[#4E5969]">素材名称</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="选填，默认使用类型名"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-[#4E5969]">素材 URL <span className="text-[#F53F3F]">*</span></Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="h-9 text-sm"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-[#4E5969]">来源</Label>
          <Input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="选填，如：外部采集、AI 生成"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-[#4E5969]">标签</Label>
          <Textarea
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="逗号分隔，如：活动海报, 618"
            className="min-h-[60px] resize-none text-sm"
          />
        </div>

        {error && <p className="text-xs text-[#F53F3F]">{error}</p>}

        <div className="flex justify-end gap-3 border-t border-[#F2F3F5] pt-4">
          <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={submitting}
            disabled={!contentId || !url.trim() || contents.length === 0}
            className="h-9 bg-[#1664FF] text-xs text-white hover:bg-[#0E52D9] disabled:opacity-50"
          >
            确认上传
          </Button>
        </div>
      </form>
    </DialogWrapper>
  );
}
