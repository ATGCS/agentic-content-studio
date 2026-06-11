'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AiGeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contentId = searchParams.get('contentId');

  useEffect(() => {
    if (contentId) {
      router.replace(`/contents/${contentId}`);
      return;
    }
    router.replace('/contents');
  }, [contentId, router]);

  return <p className="p-8 text-center text-sm text-[#86909C]">正在跳转…</p>;
}
