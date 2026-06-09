'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogWrapper } from '@/components/dialog-wrapper';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2, ArrowRight, Send, Eye } from 'lucide-react';
import { api } from '@/lib/api';

export type ContentEditForm = {
  title: string;
  summary: string;
  topicId: string;
  platforms: string[];
};

interface ContentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (form: ContentEditForm) => Promise<string | void> | string | void;
  /** 新建后跳转：detail=内容详情，generate=AI 生成页 */
  redirectAfterCreate?: 'detail' | 'generate';
  defaultTopicId?: string;
  defaultPlatforms?: string[];
  content?: {
    id?: string;
    title?: string;
    summary?: string | null;
    topicId?: string | null;
    project?: string;
    platforms?: string[];
  };
}

const platforms = [
  { value: 'WECHAT', label: '微信公众号' },
  { value: 'XIAOHONGSHU', label: '小红书' },
  { value: 'DOUYIN', label: '抖音' },
  { value: 'VIDEO_CHANNEL', label: '视频号' },
  { value: 'ZHIHU', label: '知乎' },
];

type TopicOption = { id: string; title: string };

export function ContentEditDialog({
  open,
  onOpenChange,
  onSubmit,
  redirectAfterCreate = 'detail',
  defaultTopicId,
  defaultPlatforms,
  content,
}: ContentEditDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [topicId, setTopicId] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [createdContentId, setCreatedContentId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(content?.title ?? '');
    setTopicId(content?.topicId ?? defaultTopicId ?? '');
    setSelectedPlatforms(
      content?.platforms?.length ? content.platforms : (defaultPlatforms ?? [])
    );
    setSummary(content?.summary ?? '');
    // Load topics for selector
    setLoadingTopics(true);
    api<{ items: TopicOption[]; total: number }>('/api/topics?pageSize=200')
      .then((res) => setTopics(res.data.items ?? []))
      .catch(() => {})
      .finally(() => setLoadingTopics(false));
  }, [content, open, defaultTopicId, defaultPlatforms]);

  const lockedTopicId = !content?.id && defaultTopicId;

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await onSubmit?.({
        title,
        summary,
        topicId: topicId.trim(),
        platforms: selectedPlatforms,
      });
      onOpenChange(false);

      if (result && !content?.id) {
        if (redirectAfterCreate === 'generate') {
          router.push(`/ai-generate?contentId=${result}`);
        } else {
          router.push(`/contents/${result}`);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title={content?.id ? '编辑内容' : '新建文章'}
      description={
        lockedTopicId
          ? '填写文章信息，创建后在详情页一键生成'
          : '填写内容基本信息，选择发布平台'
      }
      className="sm:max-w-[640px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-[#4E5969]">内容标题</Label>
          <div className="relative">
            <Input
              className="h-9 pr-10 text-sm"
              placeholder="请输入内容标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#1664FF] hover:bg-[#F0F5FF]"
            >
              <Sparkles className="size-4" />
            </button>
          </div>
        </div>

        {!content?.id && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#4E5969]">
              所属系列
            </Label>
            {lockedTopicId ? (
              <div className="rounded-lg border border-[#E5E8EF] bg-[#FAFBFC] px-3 py-2 text-sm text-[#4E5969]">
                {topics.find((t) => t.id === lockedTopicId)?.title ??
                  '当前系列'}
              </div>
            ) : loadingTopics ? (
              <div className="flex items-center gap-2 text-xs text-[#86909C]">
                <Loader2 className="size-3 animate-spin" />
                加载系列列表…
              </div>
            ) : (
              <Select value={topicId} onValueChange={setTopicId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="不归属系列（独立内容）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">不归属系列</SelectItem>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-xs font-medium text-[#4E5969]">发布平台</Label>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => (
              <button
                key={platform.value}
                type="button"
                onClick={() => togglePlatform(platform.value)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                  selectedPlatforms.includes(platform.value)
                    ? 'border-[#1664FF] bg-[#F0F5FF] text-[#1664FF]'
                    : 'border-[#E5E8EF] bg-white text-[#4E5969] hover:border-[#C9D8FF]'
                }`}
              >
                {platform.label}
              </button>
            ))}
          </div>
          {content?.id && (
            <p className="text-xs text-[#86909C]">
              编辑内容时不会修改已生成的平台版本。
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-[#4E5969]">内容摘要</Label>
          <Textarea
            className="min-h-[120px] resize-none text-sm"
            placeholder="请输入内容摘要（选填）"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-[#F2F3F5] pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={submitting}
            className="h-9 bg-[#1664FF] text-xs text-white hover:bg-[#0E52D9]"
          >
            {content?.id ? '保存修改' : '确认创建'}
          </Button>
        </div>
      </form>
    </DialogWrapper>
  );
}
