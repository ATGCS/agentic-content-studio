'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Lightbulb,
  X,
} from 'lucide-react';
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

const STORAGE_KEY = 'acs-workflow-guide-open';

/**
 * 可收起的侧边引导面板
 * 右侧浮动小按钮，点击弹出/收起引导面板
 */
export function CreationWorkflowGuide({
  currentStep,
  compact: _compact = false,
  dense: _dense = false,
  className: _className,
}: {
  currentStep?: WorkflowStepId;
  compact?: boolean;
  dense?: boolean;
  className?: string;
}) {
  const currentIndex = currentStep ? stepIndex(currentStep) : -1;
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  // 首次访问自动展开，之后记住用户选择
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      setPanelOpen(true);
    } else {
      setPanelOpen(stored === '1');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, panelOpen ? '1' : '0');
  }, [panelOpen]);

  return (
    <>
      {/* 浮动触发按钮 */}
      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 items-center gap-1 rounded-l-lg border border-r-0 border-[#E5E8EF] bg-white px-1.5 py-3 shadow-lg transition-all hover:bg-[#F0F5FF] hover:shadow-xl"
          title="快速上手指南"
        >
          <Lightbulb className="size-4 text-[#FF7D00]" />
          <span
            className="text-[11px] font-medium text-[#4E5969]"
            style={{ writingMode: 'vertical-rl' }}
          >
            快速上手
          </span>
        </button>
      )}

      {/* 侧边面板 */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-[300px] flex-col border-l border-[#E5E8EF] bg-white shadow-2xl transition-transform duration-300',
          panelOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* 头部 */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#F2F3F5] px-4 py-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-[#FF7D00]" />
            <span className="text-sm font-semibold text-[#1D2129]">
              快速上手
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="rounded-md p-1 text-[#86909C] hover:bg-[#F2F3F5] hover:text-[#1D2129]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <p className="mb-4 text-xs leading-relaxed text-[#86909C]">
            无需提前配置，按下面 4 步即可完成「写文章 → 审核 → 发布」。
          </p>

          <div className="space-y-2">
            {QUICK_WORKFLOW_STEPS.map((step, index) => {
              const done = currentIndex >= 0 && index < currentIndex;
              const active = step.id === currentStep;
              const upcoming = currentIndex >= 0 && index > currentIndex;

              return (
                <Link
                  key={step.id}
                  href={step.href}
                  onClick={() => setPanelOpen(false)}
                  className={cn(
                    'block rounded-lg border p-3 transition-all hover:shadow-sm',
                    active && 'border-[#1664FF] bg-[#F0F5FF]',
                    done && 'border-[#AFF0B5] bg-[#E8FFEA]',
                    upcoming &&
                      'border-[#E5E8EF] bg-[#FAFBFC] hover:border-[#C9D8FF]',
                    !currentStep &&
                      'border-[#E5E8EF] bg-[#FAFBFC] hover:border-[#C9D8FF]'
                  )}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                        active && 'bg-[#1664FF] text-white',
                        done && 'bg-[#00B42A] text-white',
                        (upcoming || !currentStep) &&
                          !active &&
                          !done &&
                          'bg-[#F2F3F5] text-[#86909C]'
                      )}
                    >
                      {done ? <Check className="size-3" /> : index + 1}
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
                  <p className="pl-7 text-[11px] leading-relaxed text-[#86909C]">
                    {step.description}
                  </p>
                </Link>
              );
            })}
          </div>

          {/* 高级选项 */}
          <div className="mt-4 rounded-lg border border-[#E5E8EF]">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-[#4E5969] hover:text-[#1664FF]"
              onClick={() => setAdvancedOpen((v) => !v)}
            >
              <span>高级选项</span>
              {advancedOpen ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>
            {advancedOpen && (
              <div className="border-t border-[#F2F3F5] px-3 py-3 text-xs leading-relaxed text-[#86909C]">
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/topics"
                      className="text-[#1664FF] hover:underline"
                      onClick={() => setPanelOpen(false)}
                    >
                      系列管理
                    </Link>
                    ：同一主题多篇内容归组。
                  </li>
                  <li>
                    <Link
                      href="/settings/ima"
                      className="text-[#1664FF] hover:underline"
                      onClick={() => setPanelOpen(false)}
                    >
                      知识库（IMA）
                    </Link>
                    ：接入后可提升生成质量。
                  </li>
                  <li>
                    <Link
                      href="/accounts"
                      className="text-[#1664FF] hover:underline"
                      onClick={() => setPanelOpen(false)}
                    >
                      平台账号
                    </Link>
                    ：正式发布前需完成授权绑定。
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 遮罩（面板打开时点击关闭） */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={() => setPanelOpen(false)}
        />
      )}
    </>
  );
}
