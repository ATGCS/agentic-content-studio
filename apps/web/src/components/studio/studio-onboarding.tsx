'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'acs_onboarding_v1_seen';

const slides = [
  {
    title: '内容与平台版本',
    body: '一条「内容」可以生成多个「平台版本」（如小红书、公众号）。总稿是通用草稿，平台版本是改写后的成稿，提交审核的是平台版本。',
  },
  {
    title: '四步完成发布',
    body: '① AI 一键生成 → ② 检查编辑 → ③ 提交审核 → ④ 审核通过后去发布管理。在内容详情页顶部可看到当前进度。',
  },
  {
    title: '演示账号',
    body: '开发环境可用 admin@acs.local / admin123 完成全流程（生成、审核、发布）。审核中心在侧边栏「审核中心」。',
  },
];

export function StudioOnboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === '/login') return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  function finish() {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  }

  if (!open) return null;

  const slide = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <button
          type="button"
          className="absolute right-3 top-3 text-[#86909C] hover:text-[#1D2129]"
          onClick={finish}
          aria-label="关闭"
        >
          <X className="size-5" />
        </button>
        <p className="mb-1 text-xs font-medium text-[#1664FF]">
          新手引导 {step + 1}/{slides.length}
        </p>
        <h2 className="text-lg font-semibold text-[#1D2129]">{slide.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-[#4E5969]">
          {slide.body}
        </p>
        <div className="mt-6 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            <ChevronLeft className="size-4" />
            上一步
          </Button>
          {isLast ? (
            <Button type="button" size="sm" onClick={finish}>
              开始使用
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setStep((s) => s + 1)}
            >
              下一步
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
