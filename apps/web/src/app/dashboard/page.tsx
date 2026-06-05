'use client';

import { useEffect, useState } from 'react';
import { StudioLayout } from '@/components/StudioLayout';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    api<Record<string, number>>('/api/dashboard/stats')
      .then((r) => setStats(r.data))
      .catch(console.error);
  }, []);

  return (
    <StudioLayout>
      <h1>工作台</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginTop: 16,
        }}
      >
        {[
          ['待生成', stats?.pendingGenerate],
          ['待审核', stats?.pendingReview],
          ['待发布', stats?.pendingPublish],
          ['本周已发布', stats?.publishedWeek],
        ].map(([label, value]) => (
          <div key={label as string} className="card">
            <div style={{ color: '#64748b' }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{value ?? '-'}</div>
          </div>
        ))}
      </div>
    </StudioLayout>
  );
}
