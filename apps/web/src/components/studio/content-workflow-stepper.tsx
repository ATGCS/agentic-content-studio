'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import {
  getActiveWorkflowStep,
  isStepCompleted,
  WORKFLOW_STEPS,
  type ContentWorkflowInput,
  type WorkflowStepId,
} from '@/lib/content-workflow';
import { cn } from '@/lib/utils';

export function ContentWorkflowStepper({
  input,
  onStepClick,
  className,
}: {
  input: ContentWorkflowInput;
  onStepClick?: (step: WorkflowStepId) => void;
  className?: string;
}) {
  const activeStep = getActiveWorkflowStep(input);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 rounded-lg border border-[#E5E8EF] bg-[#FAFBFC] px-3 py-2',
        className
      )}
    >
      <span className="mr-1 text-xs font-medium text-[#4E5969]">创作进度</span>
      {WORKFLOW_STEPS.map((step, index) => {
        const done = isStepCompleted(step.id, input);
        const active = step.id === activeStep;
        const clickable = onStepClick && (done || active);

        const inner = (
          <>
            {index > 0 && (
              <span className="mx-1 text-[#C9CDD4] select-none">→</span>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors',
                active && 'bg-[#1664FF] font-medium text-white',
                done && !active && 'text-[#00B42A]',
                !active && !done && 'text-[#86909C]',
                clickable &&
                  !active &&
                  'hover:bg-[#E8F3FF] hover:text-[#1664FF]'
              )}
            >
              {done && !active ? (
                <Check className="size-3" />
              ) : (
                <span className="font-mono text-[10px] opacity-80">
                  {index + 1}
                </span>
              )}
              {step.label}
            </span>
          </>
        );

        if (step.id === 'publish' && (input.contentStatus === 'APPROVED' || input.contentStatus === 'PENDING_PUBLISH')) {
          return (
            <span key={step.id} className="inline-flex items-center">
              {index > 0 && (
                <span className="mx-1 text-[#C9CDD4] select-none">→</span>
              )}
              <Link
                href="/publishing"
                className="inline-flex items-center gap-1 rounded bg-[#1664FF] px-2 py-0.5 text-xs font-medium text-white hover:bg-[#0E52D9]"
              >
                {step.label}
              </Link>
            </span>
          );
        }

        if (clickable) {
          return (
            <button
              key={step.id}
              type="button"
              className="inline-flex items-center"
              onClick={() => onStepClick?.(step.id)}
            >
              {inner}
            </button>
          );
        }

        return (
          <span key={step.id} className="inline-flex items-center">
            {inner}
          </span>
        );
      })}
    </div>
  );
}
