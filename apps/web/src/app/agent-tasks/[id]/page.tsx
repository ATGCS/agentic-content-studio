'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** 旧详情页路由：重定向到列表并打开弹窗 */
export default function AgentTaskDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    router.replace(`/agent-tasks?run=${id}`);
  }, [id, router]);

  return null;
}
