'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkflowStepId = 'content' | 'review' | 'publish' | 'analytics';

/** 新手推荐：不依赖系列与前置配置 */
export const QUICK_WORKFLOW_STEPS: Array<{
  id: WorkflowStepId;
  label: string;
  description: string;
  href: string;
}> = [
  {
    id: 'content',
    label: '新建并生成',
    description: '创建文章，在详情页一键 AI 生成平台版本',
    href: '/contents',
  },
  {
    id: 'review',
    label: '提交审核',
    description: '微调后提交，审核员在审核中心处理',
    href: '/reviews',
  },
  {
    id: 'publish',
    label: '发布内容',
    description: '审核通过后在发布管理导出发布包，或绑定账号后一键发布',
    href: '/publishing?packages=1',
  },
  {
    id: 'analytics',
    label: '数据复盘',
    description: '发布后查看阅读与互动表现',
    href: '/analytics',
  },
];

/** @deprecated 保留兼容，指向快速流程 */
export const CREATION_WORKFLOW_STEPS = QUICK_WORKFLOW_STEPS;

function stepIndex(id: WorkflowStepId) {
  return QUICK_WORKFLOW_STEPS.findIndex((step) => step.id === id);
}

export function CreationWorkflowGuide({
  currentStep,
  compact = false,
  dense = false,
  className,
}: {
  currentStep?: WorkflowStepId;
  compact?: boolean;
  dense?: boolean;
  className?: string;
}) {
  const currentIndex = currentStep ? stepIndex(currentStep) : -1;
  const [advancedOpen, setAdvancedOpen] = useState(false);

  if (compact) {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-1 rounded-lg border border-[#E5E8EF] bg-[#FAFBFC] px-3 py-2 text-xs',
          className
        )}
      >
        <span className="mr-1 font-medium text-[#4E5969]">创作流程</span>
        {QUICK_WORKFLOW_STEPS.map((step, index) => {
          const done = currentIndex >= 0 && index < currentIndex;
          const active = step.id === currentStep;
          return (
            <span key={step.id} className="inline-flex items-center gap-1">
              {index > 0 && <ChevronRight className="size-3 text-[#C9CDD4]" />}
              <Link
                href={step.href}
                className={cn(
                  'rounded px-1.5 py-0.5 transition-colors',
                  active && 'bg-[#1664FF] font-medium text-white',
                  done && !active && 'text-[#00B42A]',
                  !active && !done && 'text-[#86909C] hover:text-[#1664FF]'
                )}
              >
                {done && !active ? '✓ ' : ''}
                {step.label}
              </Link>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-[#E5E8EF] bg-white',
        dense ? 'p-3' : 'p-5',
        className
      )}
    >
      <div className={dense ? 'mb-2' : 'mb-4'}>
        <h3 className="text-sm font-semibold text-[#1D2129]">
          快速上手（推荐）
        </h3>
        <p className="mt-0.5 text-xs text-[#86909C]">
          无需提前配置，按下面 4 步即可完成「写文章 → 审核 →
          发布」。系列归组、知识库与平台账号可在下方高级选项中按需配置。
        </p>
      </div>

      <div className={cn('grid md:grid-cols-4', dense ? 'gap-2' : 'gap-3')}>
        {QUICK_WORKFLOW_STEPS.map((step, index) => {
          const done = currentIndex >= 0 && index < currentIndex;
          const active = step.id === currentStep;
          const upcoming = currentIndex >= 0 && index > currentIndex;

          return (
            <Link
              key={step.id}
              href={step.href}
              className={cn(
                'group relative rounded-lg border p-3 transition-all hover:shadow-sm',
                active && 'border-[#1664FF] bg-[#F0F5FF]',
                done && 'border-[#AFF0B5] bg-[#E8FFEA]',
                upcoming &&
                  'border-[#E5E8EF] bg-[#FAFBFC] hover:border-[#C9D8FF]',
                !currentStep &&
                  'border-[#E5E8EF] bg-[#FAFBFC] hover:border-[#C9D8FF]'
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    active && 'bg-[#1664FF] text-white',
                    done && 'bg-[#00B42A] text-white',
                    (upcoming || !currentStep) &&
                      !active &&
                      !done &&
                      'bg-[#F2F3F5] text-[#86909C] group-hover:bg-[#E8F3FF] group-hover:text-[#1664FF]'
                  )}
                >
                  {done ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span
                  className={cn(
                    'text-xs font-semibold',
                    active ? 'text-[#1664FF]' : 'text-[#1D2129]'
                  )}
                >
                  {step.label}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#86909C]">
                {step.description}
              </p>
            </Link>
          );
        })}
      </div>

      <div
        className={cn(
          'rounded-lg border border-[#E5E8EF]',
          dense ? 'mt-2' : 'mt-4'
        )}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium text-[#4E5969] hover:text-[#1664FF]"
          onClick={() => setAdvancedOpen((v) => !v)}
        >
          <span>高级选项（系列归组 / 知识库 / 平台账号）</span>
          {advancedOpen ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
        {advancedOpen && (
          <div className="border-t border-[#F2F3F5] px-3 py-3 text-xs leading-relaxed text-[#86909C]">
            <ul className="space-y-2">
              <li>
                <Link href="/topics" className="text-[#1664FF] hover:underline">
                  系列管理
                </Link>
                ：同一主题多篇内容归组，适合专栏或活动专题。
              </li>
              <li>
                <Link
                  href="/settings/ima"
                  className="text-[#1664FF] hover:underline"
                >
                  知识库（IMA）
                </Link>
                ：接入后可提升生成质量；不配置也能体验基础生成。
              </li>
              <li>
                <Link
                  href="/accounts"
                  className="text-[#1664FF] hover:underline"
                >
                  平台账号
                </Link>
                ：正式发布到各平台前需完成授权绑定。
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
