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
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

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
  { value: 'XIAOHONGSHU', label: '小红书' },
  { value: 'WECHAT', label: '微信公众号' },
  { value: 'DOUYIN', label: '抖音' },
  { value: 'VIDEO_CHANNEL', label: '视频号' },
  { value: 'ZHIHU', label: '知乎' },
];

const DEFAULT_PLATFORM = 'XIAOHONGSHU';

type TopicOption = { id: string; title: string };

export function ContentEditDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultTopicId,
  defaultPlatforms,
  content,
}: ContentEditDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [topicId, setTopicId] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState(DEFAULT_PLATFORM);
  const [summary, setSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(content?.title ?? '');
    setTopicId(content?.topicId ?? defaultTopicId ?? '');
    const initialPlatforms = content?.platforms?.length
      ? content.platforms
      : defaultPlatforms?.length
        ? defaultPlatforms
        : [DEFAULT_PLATFORM];
    setSelectedPlatform(initialPlatforms[0] ?? DEFAULT_PLATFORM);
    setSummary(content?.summary ?? '');
    setAdvancedOpen(Boolean(defaultTopicId));
    setLoadingTopics(true);
    api<{ items: TopicOption[]; total: number }>('/api/topics?pageSize=200')
      .then((res) => setTopics(res.data.items ?? []))
      .catch(() => {})
      .finally(() => setLoadingTopics(false));
  }, [content, open, defaultTopicId, defaultPlatforms]);

  const lockedTopicId = !content?.id && defaultTopicId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await onSubmit?.({
        title,
        summary,
        topicId: topicId.trim(),
        platforms: [selectedPlatform],
      });
      onOpenChange(false);

      if (result && !content?.id) {
        router.push(`/contents/${result}`);
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
        content?.id
          ? '修改标题与摘要'
          : '填写标题即可创建，详情页可一键 AI 生成'
      }
      className="sm:max-w-[640px]"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium text-[#4E5969]">文章标题</Label>
          <Input
            className="h-9 text-sm"
            placeholder="例如：618 大促活动玩法拆解"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>

        {!content?.id && (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#4E5969]">
              首发平台
            </Label>
            <div className="flex flex-wrap gap-2">
              {platforms.map((platform) => (
                <button
                  key={platform.value}
                  type="button"
                  onClick={() => setSelectedPlatform(platform.value)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs transition-all',
                    selectedPlatform === platform.value
                      ? 'border-[#1664FF] bg-[#F0F5FF] text-[#1664FF]'
                      : 'border-[#E5E8EF] bg-white text-[#4E5969] hover:border-[#C9D8FF]'
                  )}
                >
                  {platform.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#86909C]">
              创建后可在详情页追加其他平台版本。
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-medium text-[#4E5969]">
            内容摘要（选填）
          </Label>
          <Textarea
            className="min-h-[80px] resize-none text-sm"
            placeholder="简要说明这篇文章要讲什么"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>

        {!content?.id && (
          <div className="rounded-lg border border-[#E5E8EF]">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-[#4E5969] hover:text-[#1664FF]"
              onClick={() => setAdvancedOpen((v) => !v)}
            >
              <span>高级选项：归入系列</span>
              {advancedOpen ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
            {advancedOpen && (
              <div className="space-y-2 border-t border-[#F2F3F5] px-3 py-3">
                <Label className="text-xs font-medium text-[#4E5969]">
                  所属系列（可选）
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
                  <Select value={topicId || ' '} onValueChange={setTopicId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="独立文章（不归属系列）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">独立文章（不归属系列）</SelectItem>
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
          </div>
        )}

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
            {content?.id ? '保存修改' : '创建并开始'}
          </Button>
        </div>
      </form>
    </DialogWrapper>
  );
}
