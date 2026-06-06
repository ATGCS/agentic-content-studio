'use client';

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
import type { MaterialItem } from '@/lib/material-mappers';

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

interface EditMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: MaterialItem | null;
  onSuccess?: () => void;
}

export function EditMaterialDialog({ open, onOpenChange, material, onSuccess }: EditMaterialDialogProps) {
  const [type, setType] = useState('IMAGE');
  const [role, setRole] = useState('ATTACHMENT');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [source, setSource] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !material) return;
    setType(material.rawType);
    setRole(material.role ?? 'ATTACHMENT');
    setName(material.name);
    setUrl(material.url ?? '');
    setSource(material.source);
    setTags(material.tags.join(', '));
    setError(null);
  }, [material, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!material || !url.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const meta = {
        ...(material.sizeBytes > 0 ? { size: material.sizeBytes } : {}),
        ...(tags.trim()
          ? { tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }
          : {}),
      };

      await api(`/api/materials/${material.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          type,
          role,
          name: name.trim() || undefined,
          url: url.trim(),
          source: source.trim() || undefined,
          meta: Object.keys(meta).length > 0 ? meta : undefined,
        }),
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '保存失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (!material) return null;

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title="编辑素材"
      description="修改素材元数据与访问地址"
      className="sm:max-w-[520px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#4E5969]">类型</Label>
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
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-[#4E5969]">素材 URL <span className="text-[#F53F3F]">*</span></Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} className="h-9 text-sm" required />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-[#4E5969]">来源</Label>
          <Input value={source} onChange={(e) => setSource(e.target.value)} className="h-9 text-sm" />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-[#4E5969]">标签</Label>
          <Textarea
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="逗号分隔"
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
            disabled={!url.trim()}
            className="h-9 bg-[#1664FF] text-xs text-white hover:bg-[#0E52D9] disabled:opacity-50"
          >
            保存
          </Button>
        </div>
      </form>
    </DialogWrapper>
  );
}
