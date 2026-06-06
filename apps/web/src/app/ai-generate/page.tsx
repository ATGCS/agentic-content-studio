'use client';

import { useState } from 'react';
import {
  Bookmark,
  Bot,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Database,
  FileText,
  HelpCircle,
  Layers,
  MessageSquareText,
  MoreHorizontal,
  RefreshCw,
  Sparkles,
  Target,
  ThumbsUp,
  WandSparkles,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import {
  PageContainer,
  PageHeader,
} from '@/components/layout/page-container';
import { StudioCard } from '@/components/studio/studio-card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type Agent = {
  id: string;
  name: string;
  description: string;
  icon: typeof Bot;
  color: string;
};

type Knowledge = {
  id: string;
  name: string;
  count: number;
  selected: boolean;
};

const agents: Agent[] = [
  {
    id: 'title',
    name: '标题生成 Agent',
    description: '生成吸引眼球的标题',
    icon: Bot,
    color: '#3B82F6',
  },
  {
    id: 'body',
    name: '正文生成 Agent',
    description: '生成结构完整的文章内容',
    icon: FileText,
    color: '#6366F1',
  },
  {
    id: 'platform',
    name: '平台改写 Agent',
    description: '多平台内容改写适配',
    icon: MessageSquareText,
    color: '#22C55E',
  },
  {
    id: 'tag',
    name: '标签生成 Agent',
    description: '生成精准的标签话题',
    icon: Target,
    color: '#F97316',
  },
  {
    id: 'cover',
    name: '封面文案 Agent',
    description: '生成封面文案和视觉建议',
    icon: Layers,
    color: '#EF4444',
  },
  {
    id: 'review',
    name: '审核辅助 Agent',
    description: '内容合规与风险检测',
    icon: Check,
    color: '#14B8A6',
  },
  {
    id: 'topic',
    name: '选题推荐 Agent',
    description: '推荐热门选题和方向',
    icon: Sparkles,
    color: '#A855F7',
  },
  {
    id: 'data',
    name: '数据复盘 Agent',
    description: '分析数据并生成复盘结论',
    icon: Database,
    color: '#22C55E',
  },
];

const knowledgeBases: Knowledge[] = [
  { id: 'official', name: '公众号标题库', count: 128, selected: true },
  { id: 'brand', name: '品牌增长策略库', count: 256, selected: true },
  { id: '618', name: '618活动案例库', count: 98, selected: true },
  { id: 'video', name: '爆款标题模板库', count: 356, selected: false },
  { id: 'industry', name: '行业热点库', count: 178, selected: false },
];

const results = [
  {
    label: '结果 1',
    title: '618大促预热全攻略：品牌如何用内容提前引爆增长？',
    words: 28,
    matched: '公众号标题库、618活动案例库',
    active: true,
  },
  {
    label: '结果 2',
    title: '品牌增长必备：618活动预热内容玩法与案例拆解',
    words: 25,
    matched: '品牌增长策略库、公众号标题库',
    active: false,
  },
  {
    label: '结果 3',
    title: '从0到爆发：618大促内容预热的7个关键策略',
    words: 22,
    matched: '618活动案例库',
    active: false,
  },
];

const histories = [
  ['标题生成 Agent', '生成 3 条标题', '微信公众号', '品牌增长研究所', '2025-05-23 14:32:18', '已完成'],
  ['平台改写 Agent', '改写为小红书版本', '小红书', '品牌增长研究所', '2025-05-23 14:28:45', '已完成'],
  ['标签生成 Agent', '生成 5 组标签', '抖音', '品牌增长研究所', '2025-05-23 14:25:33', '已完成'],
  ['封面文案 Agent', '生成 3 条封面文案', '微信公众号', '品牌增长研究所', '2025-05-23 14:20:11', '已完成'],
  ['正文生成 Agent', '生成文章大纲', '微信公众号', '品倍增长研究所', '2025-05-23 14:18:02', '已取消'],
];

const countOptions = ['1 条', '3 条', '5 条', '10 条'];

export default function AiGeneratePage() {
  const [selectedAgent, setSelectedAgent] = useState('title');
  const [generateCount, setGenerateCount] = useState('3 条');
  const [onlyUncollected, setOnlyUncollected] = useState(false);

  return (
    <StudioLayout>
      <PageContainer>
        <div className="text-xs text-[#86909C] mb-2 flex items-center gap-2">
          <span>Agent 任务</span>
          <span>/</span>
          <span className="text-[#4E5969]">新建生成任务</span>
        </div>
        <div className="flex items-start justify-between mb-4">
          <PageHeader
            title="Agent 内容生成工作台"
            description="通过内置 AI Agent 生成内容，结果可一键写入内容项目"
          />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <Clock className="size-3.5" />
              任务记录
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <HelpCircle className="size-3.5" />
              使用说明
            </Button>
          </div>
        </div>

        <StudioCard contentClassName="p-0 overflow-hidden">
          <div className="border-b border-[#E5E8EF] px-5 py-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-[#86909C] mb-1">当前内容项目</div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[#1D2129]">
                    618大促活动预热攻略：品牌增长的内容玩法拆解
                  </h3>
                  <span className="rounded bg-[#FFF7E6] px-2 py-0.5 text-xs text-[#FF7D00]">
                    待审核
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs text-[#1664FF]">
                更换项目
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-6 mt-4 text-sm">
              <div>
                <div className="text-xs text-[#86909C] mb-1">目标平台</div>
                <div className="text-[#1D2129]">微信公众号</div>
              </div>
              <div>
                <div className="text-xs text-[#86909C] mb-1">目标账号</div>
                <div className="text-[#1D2129]">品牌增长研究所</div>
              </div>
              <div>
                <div className="text-xs text-[#86909C] mb-1">内容类型</div>
                <div className="text-[#1D2129]">图文文章</div>
              </div>
              <div>
                <div className="text-xs text-[#86909C] mb-1">负责人</div>
                <div className="text-[#1D2129]">李明</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[240px_1fr_420px] min-h-[560px]">
            <aside className="border-r border-[#E5E8EF] bg-white p-5">
              <div className="text-sm font-semibold text-[#1D2129] mb-4">
                1. 选择 Agent
              </div>
              <div className="space-y-2">
                {agents.map((agent) => {
                  const Icon = agent.icon;
                  const active = selectedAgent === agent.id;
                  return (
                    <button
                      key={agent.id}
                      className={cn(
                        'w-full rounded-lg border p-3 text-left transition-colors',
                        active
                          ? 'border-[#1664FF] bg-[#F0F5FF]'
                          : 'border-transparent bg-white hover:bg-[#F7F8FA]'
                      )}
                      onClick={() => setSelectedAgent(agent.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                          style={{ backgroundColor: agent.color }}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-medium text-[#1D2129]">
                              {agent.name}
                            </div>
                            {active && (
                              <Check className="size-3.5 text-[#1664FF]" />
                            )}
                          </div>
                          <div className="truncate text-xs text-[#86909C]">
                            {agent.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" className="mt-5 h-9 w-full text-xs text-[#1664FF]">
                + 自定义 Agent
              </Button>
            </aside>

            <main className="p-5 bg-[#FAFBFF]">
              <div className="text-sm font-semibold text-[#1D2129] mb-4">
                2. 设置生成参数
              </div>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="text-xs text-[#4E5969] mb-2">目标平台</div>
                  <Select defaultValue="weixin">
                    <SelectTrigger className="h-9 bg-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weixin">微信公众号</SelectItem>
                      <SelectItem value="xiaohongshu">小红书</SelectItem>
                      <SelectItem value="douyin">抖音</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs text-[#4E5969] mb-2">目标账号</div>
                  <Select defaultValue="brand">
                    <SelectTrigger className="h-9 bg-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brand">品牌增长研究所</SelectItem>
                      <SelectItem value="official">品牌公众号</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="text-xs text-[#4E5969]">调用知识库</div>
                  <button className="text-xs text-[#1664FF]">多选</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {knowledgeBases.map((kb) => (
                    <button
                      key={kb.id}
                      className={cn(
                        'relative rounded-lg border bg-white p-3 text-left transition-colors',
                        kb.selected
                          ? 'border-[#1664FF] bg-[#F0F5FF]'
                          : 'border-[#E5E8EF] hover:bg-[#F7F8FA]'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            'mt-0.5 flex h-4 w-4 items-center justify-center rounded border text-white',
                            kb.selected
                              ? 'border-[#1664FF] bg-[#1664FF]'
                              : 'border-[#C9CDD4] bg-white'
                          )}
                        >
                          {kb.selected && <Check className="size-3" />}
                        </span>
                        <div>
                          <div className="text-xs font-medium text-[#1D2129]">
                            {kb.name}
                          </div>
                          <div className="mt-1 text-xs text-[#86909C]">
                            {kb.count} 条
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                  <button className="rounded-lg border border-dashed border-[#BBD3FF] bg-white p-3 text-xs text-[#1664FF]">
                    + 添加知识库
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <div className="text-xs text-[#4E5969] mb-2">风格与语气</div>
                  <Select defaultValue="professional">
                    <SelectTrigger className="h-9 bg-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">专业、干货、易读</SelectItem>
                      <SelectItem value="casual">轻松、口语化</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-xs text-[#4E5969] mb-2">情绪倾向</div>
                  <Select defaultValue="positive">
                    <SelectTrigger className="h-9 bg-white text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">积极、鼓励</SelectItem>
                      <SelectItem value="neutral">客观、中性</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mb-5">
                <div className="text-xs text-[#4E5969] mb-2">生成数量</div>
                <div className="grid grid-cols-4 gap-3">
                  {countOptions.map((count) => (
                    <button
                      key={count}
                      className={cn(
                        'h-9 rounded-md border text-sm transition-colors',
                        generateCount === count
                          ? 'border-[#1664FF] bg-[#F0F5FF] text-[#1664FF]'
                          : 'border-[#E5E8EF] bg-white text-[#4E5969] hover:bg-[#F7F8FA]'
                      )}
                      onClick={() => setGenerateCount(count)}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#E5E8EF] pt-4 mb-5">
                <button className="flex w-full items-center justify-between text-sm text-[#1D2129]">
                  更多设置
                  <ChevronDown className="size-4 text-[#86909C]" />
                </button>
              </div>

              <div className="grid grid-cols-[1fr_160px] gap-3">
                <Button className="h-10 bg-[#1664FF] text-white hover:bg-[#0E52D9]">
                  <WandSparkles className="size-4" />
                  开始生成
                </Button>
                <Button variant="outline" className="h-10 text-[#86909C]">
                  清空设置
                </Button>
              </div>
              <div className="mt-3 flex items-center justify-center gap-6 text-xs text-[#86909C]">
                <span>预计消耗：约 150 Tokens</span>
                <button className="text-[#1664FF]">费用说明</button>
              </div>
            </main>

            <section className="border-l border-[#E5E8EF] bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-[#1D2129]">
                    3. 生成结果
                  </div>
                  <span className="rounded bg-[#E8FFEA] px-2 py-0.5 text-xs text-[#00B42A]">
                    已生成 3 条
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs text-[#4E5969]">
                  <button
                    className={cn(
                      'h-3.5 w-3.5 rounded-full border',
                      onlyUncollected
                        ? 'border-[#1664FF] bg-[#1664FF]'
                        : 'border-[#C9CDD4] bg-white'
                    )}
                    onClick={() => setOnlyUncollected(!onlyUncollected)}
                  />
                  仅看未采纳
                </label>
              </div>
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={result.label}
                    className={cn(
                      'rounded-lg border bg-white p-4',
                      result.active ? 'border-[#BBD3FF]' : 'border-[#E5E8EF]'
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#86909C]">{result.label}</span>
                        {result.active && (
                          <span className="rounded bg-[#E8FFEA] px-1.5 py-0.5 text-xs text-[#00B42A]">
                            推荐
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[#C9CDD4]">
                        <Bookmark className="size-4" />
                        <ThumbsUp className="size-4" />
                        <Copy className="size-4" />
                      </div>
                    </div>
                    <h4 className="mb-3 text-sm font-semibold leading-6 text-[#1D2129]">
                      {result.title}
                    </h4>
                    <div className="mb-3 space-y-1 text-xs text-[#86909C]">
                      <div>字数：{result.words}</div>
                      <div>匹配知识库：{result.matched}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 flex-1 text-xs text-[#86909C]">
                        采纳
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 flex-1 text-xs text-[#4E5969]">
                        写入内容
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 flex-1 text-xs text-[#4E5969]">
                        优化
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-4 h-8 w-full text-xs text-[#1664FF]">
                <RefreshCw className="size-3.5" />
                重新生成（可用剩余次数 8 次）
              </Button>
            </section>
          </div>
        </StudioCard>

        <StudioCard contentClassName="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold text-[#1D2129]">
              生成历史（最近 5 条）
            </div>
            <button className="text-xs text-[#1664FF]">查看全部记录</button>
          </div>
          <Table className="studio-table">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-[#E5E8EF]">
                {['Agent 类', '生成内容', '目标平台', '目标账号', '生成时间', '状态', '操作'].map((head) => (
                  <TableHead key={head} className="py-3 text-xs font-normal text-[#86909C]">
                    {head}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {histories.map((row) => (
                <TableRow key={`${row[0]}-${row[4]}`} className="border-[#E5E8EF] hover:bg-[#F7F8FA]">
                  {row.map((cell, index) => (
                    <TableCell key={`${cell}-${index}`} className="py-3 text-sm text-[#4E5969]">
                      {index === 5 ? (
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 text-xs',
                            cell === '已完成'
                              ? 'bg-[#E8FFEA] text-[#00B42A]'
                              : 'bg-[#F2F3F5] text-[#86909C]'
                          )}
                        >
                          {cell}
                        </span>
                      ) : (
                        cell
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-4 text-xs text-[#1664FF]">
                      <button>查看结果</button>
                      <button>{row[5] === '已取消' ? '重新生成' : '写入内容'}</button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </StudioCard>
      </PageContainer>
    </StudioLayout>
  );
}
