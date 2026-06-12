'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Target,
  Users,
  Palette,
  Swords,
  TrendingUp,
  Hash,
  Ban,
  Calendar,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogWrapper } from '@/components/dialog-wrapper';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export type TopicStrategy = {
  positioning?: string;
  goals?: string[];
  targetAudience?: {
    description?: string;
    demographics?: string[];
    interests?: string[];
    painPoints?: string[];
  };
  contentStyle?: string;
  tone?: string;
  competitors?: Array<{
    name: string;
    url?: string;
    strengths?: string;
    weaknesses?: string;
  }>;
  viralReferences?: Array<{
    title: string;
    url?: string;
    platform?: string;
    whyViral?: string;
  }>;
  trendingTopics?: string[];
  keywords?: string[];
  forbiddenWords?: string[];
  publishStrategy?: string;
};

interface KnowledgeBaseItem {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  isDefault: boolean;
  agentType?: string | null;
  _count?: { documents: number };
}

interface TopicStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategy: TopicStrategy;
  onSave: (strategy: TopicStrategy) => Promise<void>;
  onSaved?: () => Promise<void>;
  topicId?: string;
  knowledgeBaseIds?: string[];
}

type SectionKey = keyof TopicStrategy;

const sections: {
  key: SectionKey;
  label: string;
  icon: React.ElementType;
  type: 'text' | 'textarea' | 'tags' | 'object' | 'array';
}[] = [
  { key: 'positioning', label: '系列定位', icon: Target, type: 'textarea' },
  { key: 'goals', label: '系列目标', icon: Target, type: 'tags' },
  { key: 'contentStyle', label: '内容风格', icon: Palette, type: 'text' },
  { key: 'tone', label: '语气语调', icon: Palette, type: 'text' },
  {
    key: 'publishStrategy',
    label: '发布策略',
    icon: Calendar,
    type: 'textarea',
  },
  { key: 'keywords', label: '关键词/标签', icon: Hash, type: 'tags' },
  { key: 'forbiddenWords', label: '禁忌词/避免内容', icon: Ban, type: 'tags' },
  {
    key: 'trendingTopics',
    label: '热门话题参考',
    icon: TrendingUp,
    type: 'tags',
  },
];

export function TopicStrategyDialog({
  open,
  onOpenChange,
  strategy,
  onSave,
  onSaved,
  topicId,
  knowledgeBaseIds: initialKbIds = [],
}: TopicStrategyDialogProps) {
  const [form, setForm] = useState<TopicStrategy>(() =>
    JSON.parse(JSON.stringify(strategy))
  );
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'basic' | 'audience' | 'competitors' | 'viral' | 'knowledge'
  >('basic');
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([]);
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>(initialKbIds);
  const [loadingKb, setLoadingKb] = useState(false);

  // 当对话框打开时，同步知识库选中状态
  useEffect(() => {
    if (open) {
      setSelectedKbIds(initialKbIds);
    }
  }, [open, initialKbIds]);

  // 加载知识库列表
  useEffect(() => {
    if (open && (activeTab === 'knowledge' || knowledgeBases.length === 0)) {
      setLoadingKb(true);
      api<KnowledgeBaseItem[]>('/api/ima/knowledge-bases')
        .then((res) => setKnowledgeBases(res.data))
        .catch(() => {})
        .finally(() => setLoadingKb(false));
    }
  }, [open, activeTab]);

  const updateField = <K extends keyof TopicStrategy>(
    key: K,
    value: TopicStrategy[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addTag = (
    key: 'goals' | 'keywords' | 'forbiddenWords' | 'trendingTopics'
  ) => {
    const val = prompt(
      `添加${sections.find((s) => s.key === key)?.label ?? key}`
    );
    if (val?.trim()) {
      setForm((prev) => ({
        ...prev,
        [key]: [...((prev[key] as string[]) ?? []), val.trim()],
      }));
    }
  };

  const removeTag = (
    key: 'goals' | 'keywords' | 'forbiddenWords' | 'trendingTopics',
    index: number
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: ((prev[key] as string[]) ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSave(form);
      if (topicId) {
        await api(`/api/topics/${topicId}/knowledge-bases`, {
          method: 'PUT',
          body: JSON.stringify({ knowledgeBaseIds: selectedKbIds }),
        });
      }
      await onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleKnowledgeBase = (id: string) => {
    setSelectedKbIds((prev) =>
      prev.includes(id) ? prev.filter((kbId) => kbId !== id) : [...prev, id]
    );
  };

  const renderTags = (
    key: 'goals' | 'keywords' | 'forbiddenWords' | 'trendingTopics',
    placeholder: string
  ) => {
    const items = form[key] ?? [];
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {(items as string[]).map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md bg-[#F0F5FF] px-2 py-1 text-xs text-[#1664FF]"
            >
              {item}
              <button
                type="button"
                onClick={() => removeTag(key, i)}
                className="text-[#1664FF]/60 hover:text-[#1664FF]"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => addTag(key)}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-[#C9CDD4] px-2 py-1 text-xs text-[#86909C] hover:border-[#1664FF] hover:text-[#1664FF] transition-all"
          >
            <Plus className="size-3" />
            {placeholder}
          </button>
        </div>
      </div>
    );
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title="系列策略配置"
      description="配置系列定位、目标用户、内容风格、竞品分析等策略信息"
      className="sm:max-w-[800px]"
    >
      <form onSubmit={handleSubmit} className="space-y-0">
        {/* Tab 导航 */}
        <div className="flex border-b border-[#E5E8EF] mb-4">
          {[
            { key: 'basic' as const, label: '基本信息', icon: Target },
            { key: 'audience' as const, label: '用户画像', icon: Users },
            { key: 'competitors' as const, label: '竞品分析', icon: Swords },
            { key: 'viral' as const, label: '爆款参考', icon: TrendingUp },
            { key: 'knowledge' as const, label: '知识库', icon: BookOpen },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all',
                activeTab === tab.key
                  ? 'border-[#1664FF] text-[#1664FF]'
                  : 'border-transparent text-[#86909C] hover:text-[#4E5969]'
              )}
            >
              <tab.icon className="size-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-5 px-0.5">
          {/* Tab: 基本信息 */}
          {activeTab === 'basic' && (
            <>
              {sections.map((section) => {
                if (section.type === 'textarea') {
                  return (
                    <div key={section.key} className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs font-medium text-[#4E5969]">
                        <section.icon className="size-3.5 text-[#1664FF]" />
                        {section.label}
                      </Label>
                      <Textarea
                        className="min-h-[60px] text-sm resize-none"
                        value={(form[section.key] as string) ?? ''}
                        onChange={(e) =>
                          updateField(section.key, e.target.value)
                        }
                        placeholder={`输入${section.label}…`}
                      />
                    </div>
                  );
                }
                if (section.type === 'text') {
                  return (
                    <div key={section.key} className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs font-medium text-[#4E5969]">
                        <section.icon className="size-3.5 text-[#1664FF]" />
                        {section.label}
                      </Label>
                      <Input
                        className="h-9 text-sm"
                        value={(form[section.key] as string) ?? ''}
                        onChange={(e) =>
                          updateField(section.key, e.target.value)
                        }
                        placeholder={`输入${section.label}…`}
                      />
                    </div>
                  );
                }
                if (section.type === 'tags') {
                  return (
                    <div key={section.key} className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs font-medium text-[#4E5969]">
                        <section.icon className="size-3.5 text-[#1664FF]" />
                        {section.label}
                      </Label>
                      {renderTags(section.key as any, `添加${section.label}`)}
                    </div>
                  );
                }
                return null;
              })}
            </>
          )}

          {/* Tab: 用户画像 */}
          {activeTab === 'audience' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#4E5969]">
                  目标用户描述
                </Label>
                <Textarea
                  className="min-h-[60px] text-sm resize-none"
                  value={form.targetAudience?.description ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      targetAudience: {
                        ...prev.targetAudience,
                        description: e.target.value,
                      },
                    }))
                  }
                  placeholder="描述目标用户是谁，例如：25-35岁一线城市职场女性，关注个人成长和效率提升"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#4E5969]">
                  人口统计特征
                </Label>
                {renderTagsForAudience(
                  'demographics',
                  '添加特征，如：25-35岁、一线城市'
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#4E5969]">
                  兴趣爱好
                </Label>
                {renderTagsForAudience(
                  'interests',
                  '添加兴趣，如：读书、健身、科技'
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#4E5969]">
                  痛点/需求
                </Label>
                {renderTagsForAudience(
                  'painPoints',
                  '添加痛点，如：时间不够用、信息过载'
                )}
              </div>
            </div>
          )}

          {/* Tab: 竞品分析 */}
          {activeTab === 'competitors' && (
            <div className="space-y-3">
              <p className="text-xs text-[#86909C]">
                列出同领域的竞品系列或账号，分析其优劣势
              </p>
              {(form.competitors ?? []).map((comp, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[#E5E8EF] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#4E5969]">
                      竞品 #{i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          competitors: (prev.competitors ?? []).filter(
                            (_, idx) => idx !== i
                          ),
                        }));
                      }}
                      className="text-red-400 hover:text-red-500"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      className="h-8 text-xs"
                      placeholder="名称"
                      value={comp.name}
                      onChange={(e) => {
                        const list = [...(form.competitors ?? [])];
                        list[i] = { ...list[i], name: e.target.value };
                        setForm((prev) => ({ ...prev, competitors: list }));
                      }}
                    />
                    <Input
                      className="h-8 text-xs"
                      placeholder="链接"
                      value={comp.url ?? ''}
                      onChange={(e) => {
                        const list = [...(form.competitors ?? [])];
                        list[i] = { ...list[i], url: e.target.value };
                        setForm((prev) => ({ ...prev, competitors: list }));
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Textarea
                      className="min-h-[48px] text-xs resize-none"
                      placeholder="优势"
                      value={comp.strengths ?? ''}
                      onChange={(e) => {
                        const list = [...(form.competitors ?? [])];
                        list[i] = { ...list[i], strengths: e.target.value };
                        setForm((prev) => ({ ...prev, competitors: list }));
                      }}
                    />
                    <Textarea
                      className="min-h-[48px] text-xs resize-none"
                      placeholder="劣势/可超越点"
                      value={comp.weaknesses ?? ''}
                      onChange={(e) => {
                        const list = [...(form.competitors ?? [])];
                        list[i] = { ...list[i], weaknesses: e.target.value };
                        setForm((prev) => ({ ...prev, competitors: list }));
                      }}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    competitors: [...(prev.competitors ?? []), { name: '' }],
                  }));
                }}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#C9CDD4] py-2 text-xs text-[#86909C] hover:border-[#1664FF] hover:text-[#1664FF] transition-all"
              >
                <Plus className="size-3.5" />
                添加竞品
              </button>
            </div>
          )}

          {/* Tab: 爆款参考 */}
          {activeTab === 'viral' && (
            <div className="space-y-3">
              <p className="text-xs text-[#86909C]">
                参考同领域的爆款内容，分析其成功原因
              </p>
              {(form.viralReferences ?? []).map((ref, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-[#E5E8EF] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#4E5969]">
                      参考 #{i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          viralReferences: (prev.viralReferences ?? []).filter(
                            (_, idx) => idx !== i
                          ),
                        }));
                      }}
                      className="text-red-400 hover:text-red-500"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      className="h-8 text-xs"
                      placeholder="标题"
                      value={ref.title}
                      onChange={(e) => {
                        const list = [...(form.viralReferences ?? [])];
                        list[i] = { ...list[i], title: e.target.value };
                        setForm((prev) => ({ ...prev, viralReferences: list }));
                      }}
                    />
                    <Input
                      className="h-8 text-xs"
                      placeholder="平台"
                      value={ref.platform ?? ''}
                      onChange={(e) => {
                        const list = [...(form.viralReferences ?? [])];
                        list[i] = { ...list[i], platform: e.target.value };
                        setForm((prev) => ({ ...prev, viralReferences: list }));
                      }}
                    />
                  </div>
                  <Input
                    className="h-8 text-xs"
                    placeholder="链接"
                    value={ref.url ?? ''}
                    onChange={(e) => {
                      const list = [...(form.viralReferences ?? [])];
                      list[i] = { ...list[i], url: e.target.value };
                      setForm((prev) => ({ ...prev, viralReferences: list }));
                    }}
                  />
                  <Textarea
                    className="min-h-[48px] text-xs resize-none"
                    placeholder="为什么爆？分析成功原因"
                    value={ref.whyViral ?? ''}
                    onChange={(e) => {
                      const list = [...(form.viralReferences ?? [])];
                      list[i] = { ...list[i], whyViral: e.target.value };
                      setForm((prev) => ({ ...prev, viralReferences: list }));
                    }}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    viralReferences: [
                      ...(prev.viralReferences ?? []),
                      { title: '' },
                    ],
                  }));
                }}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-[#C9CDD4] py-2 text-xs text-[#86909C] hover:border-[#1664FF] hover:text-[#1664FF] transition-all"
              >
                <Plus className="size-3.5" />
                添加爆款参考
              </button>
            </div>
          )}

          {/* Tab: 知识库 */}
          {activeTab === 'knowledge' && (
            <div className="space-y-3">
              <p className="text-xs text-[#86909C]">
                选择此系列关联的知识库，AI 在生成内容时将参考所选知识库中的资料
              </p>
              {loadingKb ? (
                <p className="text-xs text-[#86909C]">加载知识库列表…</p>
              ) : knowledgeBases.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#C9CDD4] p-6 text-center">
                  <BookOpen className="mx-auto size-8 text-[#C9CDD4]" />
                  <p className="mt-2 text-xs text-[#86909C]">暂无可用知识库</p>
                  <p className="mt-1 text-[10px] text-[#C9CDD4]">
                    请先在 IMA 配置中同步知识库
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {knowledgeBases.map((kb) => {
                    const isSelected = selectedKbIds.includes(kb.id);
                    return (
                      <button
                        key={kb.id}
                        type="button"
                        onClick={() => toggleKnowledgeBase(kb.id)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all',
                          isSelected
                            ? 'border-[#1664FF] bg-[#F0F5FF]'
                            : 'border-[#E5E8EF] hover:border-[#1664FF]/40 hover:bg-[#FAFBFF]'
                        )}
                      >
                        <div
                          className={cn(
                            'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-all',
                            isSelected
                              ? 'border-[#1664FF] bg-[#1664FF]'
                              : 'border-[#C9CDD4]'
                          )}
                        >
                          {isSelected && (
                            <svg
                              className="size-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#1D2129]">
                              {kb.name}
                            </span>
                            {kb.isDefault && (
                              <span className="rounded bg-[#E8F3FF] px-1.5 py-0.5 text-[10px] text-[#1664FF]">
                                默认
                              </span>
                            )}
                          </div>
                          {kb.description && (
                            <p className="mt-0.5 text-xs text-[#86909C] line-clamp-2">
                              {kb.description}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-3 text-[10px] text-[#C9CDD4]">
                            {kb._count && (
                              <span>{kb._count.documents} 个文档</span>
                            )}
                            {kb.agentType && <span>类型: {kb.agentType}</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#F2F3F5] pt-4 mt-4">
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
            isLoading={saving}
            className="h-9 bg-[#1664FF] text-xs text-white hover:bg-[#0E52D9]"
          >
            保存策略
          </Button>
        </div>
      </form>
    </DialogWrapper>
  );

  function renderTagsForAudience(
    key: 'demographics' | 'interests' | 'painPoints',
    placeholder: string
  ) {
    const items = form.targetAudience?.[key] ?? [];
    return (
      <div className="flex flex-wrap gap-1.5">
        {(items as string[]).map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-md bg-[#F0F5FF] px-2 py-1 text-xs text-[#1664FF]"
          >
            {item}
            <button
              type="button"
              onClick={() => {
                setForm((prev) => ({
                  ...prev,
                  targetAudience: {
                    ...prev.targetAudience,
                    [key]: (prev.targetAudience?.[key] ?? []).filter(
                      (_, idx) => idx !== i
                    ),
                  },
                }));
              }}
              className="text-[#1664FF]/60 hover:text-[#1664FF]"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => {
            const val = prompt(`添加${placeholder}`);
            if (val?.trim()) {
              setForm((prev) => ({
                ...prev,
                targetAudience: {
                  ...prev.targetAudience,
                  [key]: [...(prev.targetAudience?.[key] ?? []), val.trim()],
                },
              }));
            }
          }}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-[#C9CDD4] px-2 py-1 text-xs text-[#86909C] hover:border-[#1664FF] hover:text-[#1664FF] transition-all"
        >
          <Plus className="size-3" />
          {placeholder}
        </button>
      </div>
    );
  }
}
