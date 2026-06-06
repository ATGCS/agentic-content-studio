'use client';

import {
  ArrowLeft,
  Bot,
  ChevronDown,
  Database,
  Download,
  Edit3,
  Eye,
  FileText,
  MoreHorizontal,
  Settings,
  Timer,
} from 'lucide-react';
import Link from 'next/link';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { PlatformBadge } from '@/components/platform-icon';
import { StudioCard } from '@/components/studio/studio-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PlatformKey = 'wechat' | 'red' | 'douyin' | 'video' | 'zhihu';

type GeneratedContent = {
  id: number;
  title: string;
  type: string;
  words: number;
  score: number;
  status: 'pass' | 'review';
};

const processSteps = [
  { label: '任务接收', time: '14:32:18', done: true },
  { label: '需求分析', time: '14:32:25', done: true },
  { label: '知识检索', time: '14:32:48', done: true },
  { label: '内容生成', time: '14:34:12', done: true },
  { label: '质量检查', time: '14:40:12', done: true },
  { label: '结果输出', time: '14:40:50', done: true },
];

const generatedContents: GeneratedContent[] = [
  { id: 1, title: '618大促预热：品牌如何用内容提前引爆增长？', type: '公众号文章', words: 2568, score: 92, status: 'pass' },
  { id: 2, title: '3个关键策略让你的618内容预热事半功倍', type: '小红书笔记', words: 1245, score: 88, status: 'pass' },
  { id: 3, title: '从0到爆发：618大促内容预热的7个关键步骤', type: '抖音脚本', words: 1832, score: 90, status: 'pass' },
  { id: 4, title: '品牌案例：某美妆品牌618预热内容全解析', type: '案例分析', words: 2103, score: 93, status: 'pass' },
  { id: 5, title: '618预热内容日历：30天内容规划模板', type: '内容模板', words: 1567, score: 87, status: 'pass' },
  { id: 6, title: '预热期用户心智经营：内容策略与话术指南', type: '指南手册', words: 2876, score: 91, status: 'pass' },
  { id: 7, title: '618大促内容素材清单：标题/封面/文案参考', type: '素材清单', words: 1954, score: 89, status: 'pass' },
  { id: 8, title: 'FAQ：618预热内容常见问题解答', type: '问答内容', words: 1023, score: 85, status: 'pass' },
];

const tabs = [
  { key: 'content', label: '生成内容', count: '8', active: true },
  { key: 'logs', label: '执行日志', count: '', active: false },
  { key: 'retrieval', label: '知识检索', count: '5', active: false },
  { key: 'params', label: '参数配置', count: '', active: false },
  { key: 'related', label: '关联项目', count: '', active: false },
];

const logs = [
  { time: '14:32:18', text: '任务已创建' },
  { time: '14:32:25', text: 'Agent 开始执行' },
  { time: '14:32:48', text: '知识检索完成（检索 5 个知识库）' },
  { time: '14:34:12', text: '内容生成完成（共生成 8 篇内容）' },
  { time: '14:40:12', text: '质量检查完成（全部通过）' },
  { time: '14:40:50', text: '任务执行成功' },
];

function PlatformMark({ platform }: { platform: PlatformKey }) {
  return <PlatformBadge platform={platform} size="sm" />;
}

export default function AgentTaskDetailPage() {
  return (
    <StudioLayout>
      <PageContainer className="max-w-none gap-4 p-6">
        <div className="mb-4">
          <Link href="/agent-tasks" className="inline-flex items-center gap-2 text-xs font-semibold text-[#1664FF]">
            <ArrowLeft className="size-4" />
            返回任务列表
          </Link>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1D2129]">618大促活动预热攻略：品牌增长的内容玩法拆解</h1>
            <div className="mt-3 flex items-center gap-6 text-xs text-[#4E5969]">
              <span>任务ID：task_20250523_001</span>
              <span>任务类型：<span className="font-medium text-[#1D2129]">内容生成</span></span>
              <span>留建时间：2025-05-23 14:32:18</span>
              <span>创建人：李明（运营）</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button className="h-9 gap-2 bg-[#1664FF] px-5 text-xs">重新执行</Button>
            <Button variant="outline" className="h-9 gap-2 border-[#E5E8EF] px-5 text-xs">复制任务</Button>
            <Button variant="outline" className="h-9 gap-2 border-[#E5E8EF] px-5 text-xs">更多操作 <ChevronDown className="size-3.5" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-[1.1fr_0.9fr] gap-4">
          <div className="space-y-4">
            <StudioCard contentClassName="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex size-14 items-center justify-center rounded-xl bg-[#28C840]">
                    <Bot className="size-7 text-white" />
                  </span>
                  <div>
                    <p className="text-lg font-bold text-[#1D2129]">内容生成 Agent</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-[#86909C]">Agent 类型：内容生成</span>
                      <span className="rounded-full bg-[#E8FFEA] px-2 py-0.5 text-[11px] font-semibold text-[#00B42A]">执行成功</span>
                    </div>
                    <p className="mt-1 text-xs text-[#86909C]">版本：v2.3.1</p>
                  </div>
                </div>
                <div className="flex items-center gap-10">
                  <div className="text-center">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-full bg-[#F2F7FF]">
                        <Timer className="size-4 text-[#1664FF]" />
                      </span>
                      <span className="text-lg font-bold text-[#1D2129]">8分32秒</span>
                    </div>
                    <p className="mt-1 text-xs text-[#86909C]">执行耗时</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-full bg-[#F2F7FF]">
                        <Database className="size-4 text-[#1664FF]" />
                      </span>
                      <span className="text-lg font-bold text-[#1D2129]">2,856</span>
                    </div>
                    <p className="mt-1 text-xs text-[#86909C]">消耗 Tokens</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-full bg-[#F2F7FF]">
                        <FileText className="size-4 text-[#7B61FF]" />
                      </span>
                      <span className="text-lg font-bold text-[#1D2129]">8篇</span>
                    </div>
                    <p className="mt-1 text-xs text-[#86909C]">生成内容数</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-full bg-[#F2F7FF]">
                        <Settings className="size-4 text-[#FF7D00]" />
                      </span>
                      <span className="text-lg font-bold text-[#1D2129]">5个</span>
                    </div>
                    <p className="mt-1 text-xs text-[#86909C]">调用知识库</p>
                  </div>
                </div>
              </div>
            </StudioCard>

            <StudioCard contentClassName="p-6">
              <h3 className="mb-6 text-sm font-bold text-[#1D2129]">任务执行流程</h3>
              <div className="flex items-center justify-between px-4">
                {processSteps.map((step, index) => (
                  <div key={step.label} className="relative flex flex-1 flex-col items-center">
                    <div className="flex size-5 items-center justify-center rounded-full bg-[#00B42A]">
                      <svg className="size-3 text-white" viewBox="0 0 12 10" fill="none">
                        <path d="M10.5 2L4.5 8L1.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="mt-3 text-xs font-medium text-[#1D2129]">{step.label}</p>
                    <p className="mt-1 text-[11px] text-[#86909C]">{step.time}</p>
                    {index < processSteps.length - 1 && <div className="absolute left-1/2 top-2.5 h-0.5 w-full bg-[#00B42A]" style={{ marginLeft: '1.25rem' }} />}
                  </div>
                ))}
              </div>
            </StudioCard>

            <StudioCard contentClassName="p-0">
              <div className="flex border-b border-[#EEF0F5] px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={cn(
                      'relative h-11 px-4 text-xs font-semibold',
                      tab.active ? 'text-[#1664FF]' : 'text-[#86909C]',
                    )}
                  >
                    {tab.label}
                    {tab.count && <span className="ml-1 rounded-full bg-[#E8F3FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#1664FF]">{tab.count}</span>}
                    {tab.active && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-[#1664FF]" />}
                  </button>
                ))}
              </div>

              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button className="flex h-8 w-40 items-center justify-between rounded-md border border-[#E5E8EF] bg-white px-3 text-xs text-[#4E5969]">
                      全部类型 <ChevronDown className="size-3" />
                    </button>
                    <input className="h-8 w-80 rounded-md border border-[#E5E8EF] px-3 text-xs placeholder:text-[#C9CDD4]" placeholder="搜索标题或内容关键词" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="h-8 gap-1 border-[#E5E8EF] text-xs">批量操作 <ChevronDown className="size-3" /></Button>
                    <Button variant="outline" size="sm" className="h-8 gap-1 border-[#E5E8EF] text-xs"><Download className="size-3.5" />导出全部</Button>
                  </div>
                </div>

                <table className="w-full text-xs">
                  <thead>
                    <tr className="h-9 border-b border-[#EEF0F5]">
                      <th className="w-10 px-2 text-left text-[11px] font-medium text-[#86909C]"><input type="checkbox" className="accent-[#1664FF]" /></th>
                      <th className="w-10 px-2 text-left text-[11px] font-medium text-[#86909C]"></th>
                      <th className="px-2 text-left text-[11px] font-medium text-[#86909C]">标题</th>
                      <th className="px-2 text-left text-[11px] font-medium text-[#86909C]">内容类型</th>
                      <th className="px-2 text-left text-[11px] font-medium text-[#86909C]">字数</th>
                      <th className="px-2 text-left text-[11px] font-medium text-[#86909C]">质量评分</th>
                      <th className="px-2 text-left text-[11px] font-medium text-[#86909C]">状态</th>
                      <th className="px-2 text-left text-[11px] font-medium text-[#86909C]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedContents.map((row) => (
                      <tr key={row.id} className="h-11 border-b border-[#F5F7FA] hover:bg-[#F7F8FA]">
                        <td className="px-2"><input type="checkbox" className="accent-[#1664FF]" /></td>
                        <td className="px-2"><span className="rounded-sm bg-[#E8F3FF] px-1.5 py-0.5 text-[11px] font-bold text-[#1664FF]">{row.id}</span></td>
                        <td className="px-2 font-semibold text-[#1D2129]">{row.title}</td>
                        <td className="px-2 text-[#4E5969]">{row.type}</td>
                        <td className="px-2 font-medium text-[#1D2129]">{row.words.toLocaleString()}</td>
                        <td className="px-2 font-medium text-[#1D2129]">{row.score}</td>
                        <td className="px-2"><span className="rounded-full bg-[#E8FFEA] px-2 py-0.5 text-[11px] font-semibold text-[#00B42A]">通过</span></td>
                        <td className="px-2">
                          <span className="flex items-center gap-3 whitespace-nowrap font-semibold text-[#1664FF]">
                            <button className="flex items-center gap-1"><Eye className="size-3.5" />预览</button>
                            <button className="flex items-center gap-1"><Edit3 className="size-3.5" />编辑</button>
                            <button className="flex items-center gap-1">更多 <MoreHorizontal className="size-3.5" /></button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-5 flex items-center justify-between text-xs text-[#4E5969]">
                  <span>共 <b className="text-[#1D2129]">8</b> 条</span>
                  <div className="flex items-center gap-3">
                    <button className="flex size-8 items-center justify-center rounded-md border border-[#E5E8EF]">&lt;</button>
                    <button className="flex size-8 items-center justify-center rounded-md bg-[#1664FF] text-white">1</button>
                    <button className="flex size-8 items-center justify-center rounded-md">2</button>
                    <span>…</span>
                    <button className="flex size-8 items-center justify-center rounded-md border border-[#E5E8EF]">&gt;</button>
                    <div className="flex items-center gap-2">
                      <button className="flex h-8 w-24 items-center justify-between rounded-md border border-[#E5E8EF] px-2">10条/页 <ChevronDown className="size-3" /></button>
                      <span>前往</span>
                      <input className="h-8 w-10 rounded-md border border-[#E5E8EF] text-center" defaultValue="1" />
                      <span>页</span>
                    </div>
                  </div>
                  <div></div>
                </div>
              </div>
            </StudioCard>
          </div>

          <div className="space-y-4">
            <StudioCard contentClassName="p-6">
              <h3 className="mb-4 text-sm font-bold text-[#1D2129]">任务状态</h3>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#00B42A]">
                  <svg className="size-4 text-white" viewBox="0 0 12 10" fill="none">
                    <path d="M10.5 2L4.5 8L1.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <p className="text-base font-bold text-[#1D2129]">执行成功</p>
                  <p className="text-xs text-[#86909C]">任务已完成</p>
                </div>
              </div>
              <div className="space-y-2.5 border-t border-[#EEF0F5] pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#86909C]">执行时间</span>
                  <span className="text-[#4E5969]">2025-05-23 14:32:18 ~ 14:40:50</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#86909C]">总耗时</span>
                  <span className="font-semibold text-[#1D2129]">8分32秒</span>
                </div>
              </div>
            </StudioCard>

            <StudioCard contentClassName="p-6">
              <h3 className="mb-4 text-sm font-bold text-[#1D2129]">任务信息</h3>
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#86909C]">任务类型</span>
                  <span className="text-[#4E5969]">内容生成</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#86909C]">所属项目</span>
                  <span className="font-semibold text-[#1664FF]">618大促活动预热攻略</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#86909C]">内容平台</span>
                  <span className="flex gap-1">
                    {(['wechat', 'red', 'douyin', 'video', 'zhihu'] as PlatformKey[]).map((p) => <PlatformMark key={p} platform={p} />)}
                    <span className="text-[11px] text-[#86909C]">+2</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#86909C]">目标受众</span>
                  <span className="text-[#4E5969]">品牌运营、市场营销人员</span>
                </div>
                <div className="justify-between text-[#86909C]">
                  <span>内容目标</span>
                  <p className="mt-1.5 text-[#4E5969]">提升品牌曝光，促进618活动转化</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 justify-between">
                  <span className="text-[#86909C]">关键词</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['618大促', '内容预热', '品牌增长', '内容策略'].map((t) => (
                      <span key={t} className="rounded-full bg-[#F2F7FF] px-2 py-1 text-[11px] font-semibold text-[#1664FF]">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#86909C]">备注</span>
                  <span className="text-[#4E5969]">无</span>
                </div>
              </div>
              <button className="mt-6 w-full rounded-md border border-[#1664FF] py-2 text-xs font-semibold text-[#1664FF]">查看任务详情</button>
            </StudioCard>

            <StudioCard contentClassName="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1D2129]">执行日志</h3>
                <button className="text-xs font-semibold text-[#1664FF]">全部日志 &gt;</button>
              </div>
              <div className="space-y-4 pl-4">
                {logs.map((row, index) => (
                  <div key={row.time} className="relative">
                    {index < logs.length - 1 && <div className="absolute left-[-13px] top-5 h-full w-px bg-[#E5E8EF]" style={{ height: 'calc(100% + 16px)' }} />}
                    <span className="absolute left-[-16px] top-0.5 size-2.5 rounded-full bg-[#00B42A] ring-2 ring-white" />
                    <p className="text-[11px] text-[#86909C]">{row.time}</p>
                    <p className="mt-1 text-xs font-medium text-[#1D2129]">{row.text}</p>
                  </div>
                ))}
              </div>
            </StudioCard>
          </div>
        </div>
      </PageContainer>
    </StudioLayout>
  );
}
