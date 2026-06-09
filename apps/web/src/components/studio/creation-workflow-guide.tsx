'use client';

import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkflowStepId = 'series' | 'content' | 'review' | 'publish';

export const CREATION_WORKFLOW_STEPS: Array<{
  id: WorkflowStepId;
  label: string;
  description: string;
  href: string;
}> = [
  {
    id: 'series',
    label: '创建系列',
    description: '同一主题的多篇文章归组，统一目标平台',
    href: '/topics',
  },
  {
    id: 'content',
    label: '新建并生成',
    description: '创建文章后在详情页一键生成，下方直接编辑',
    href: '/contents',
  },
  {
    id: 'review',
    label: '审核发布',
    description: '微调后提交审核，通过后进入发布管理',
    href: '/reviews',
  },
  {
    id: 'publish',
    label: '数据复盘',
    description: '发布后查看各平台数据表现',
    href: '/analytics',
  },
];

function stepIndex(id: WorkflowStepId) {
  return CREATION_WORKFLOW_STEPS.findIndex((step) => step.id === id);
}

export function CreationWorkflowGuide({
  currentStep,
  compact = false,
  className,
}: {
  currentStep?: WorkflowStepId;
  compact?: boolean;
  className?: string;
}) {
  const currentIndex = currentStep ? stepIndex(currentStep) : -1;

  if (compact) {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-1 rounded-lg border border-[#E5E8EF] bg-[#FAFBFC] px-3 py-2 text-xs',
          className
        )}
      >
        <span className="mr-1 font-medium text-[#4E5969]">创作流程</span>
        {CREATION_WORKFLOW_STEPS.map((step, index) => {
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
        'rounded-xl border border-[#E5E8EF] bg-white p-5',
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#1D2129]">
            系列内容创作流程
          </h3>
          <p className="mt-1 text-xs text-[#86909C]">
            做一系列内容时，按顺序完成以下步骤。首次使用请先配置
            <Link
              href="/settings/ima"
              className="mx-1 text-[#1664FF] hover:underline"
            >
              知识库
            </Link>
            与
            <Link
              href="/accounts"
              className="mx-1 text-[#1664FF] hover:underline"
            >
              平台账号
            </Link>
            。
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {CREATION_WORKFLOW_STEPS.map((step, index) => {
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
    </div>
  );
}
