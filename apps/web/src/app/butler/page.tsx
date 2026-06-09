'use client';

import { useSearchParams } from 'next/navigation';
import { ButlerChat } from '@/components/studio/butler-chat';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';

export default function ButlerPage() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topicId') ?? undefined;

  return (
    <StudioLayout>
      <PageContainer className="gap-0 p-3 md:p-4">
        <ButlerChat initialTopicId={topicId} />
      </PageContainer>
    </StudioLayout>
  );
}
