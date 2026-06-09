'use client';

import { useSearchParams } from 'next/navigation';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { AiProductionPanel } from '@/components/studio/ai-production-panel';

export default function AiGeneratePage() {
  const searchParams = useSearchParams();
  const contentId = searchParams.get('contentId') ?? undefined;

  return (
    <StudioLayout>
      <PageContainer className="max-w-none gap-3 !px-2 pb-4 pt-0 md:!px-2">
        <AiProductionPanel contentId={contentId} />
      </PageContainer>
    </StudioLayout>
  );
}
