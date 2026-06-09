'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { AiProductionPanel } from '@/components/studio/ai-production-panel';
import { Button } from '@/components/ui/button';

export default function AiGeneratePage() {
  const searchParams = useSearchParams();
  const contentId = searchParams.get('contentId') ?? undefined;

  return (
    <StudioLayout>
      <PageContainer className="max-w-4xl gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-[#1D2129]">AI 生成</h1>
            <p className="mt-1 text-sm text-[#86909C]">
              选内容 → 一键生成 → 到内容详情里微调；不必逐个 Agent 手动点
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-9 text-xs" asChild>
            <Link href="/contents">
              <Plus className="size-3.5" />
              新建文章
            </Link>
          </Button>
        </div>

        <AiProductionPanel contentId={contentId} />
      </PageContainer>
    </StudioLayout>
  );
}
