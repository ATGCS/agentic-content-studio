'use client';

import { useEffect, useState } from 'react';
import { StudioLayout } from '@/components/StudioLayout';
import { api } from '@/lib/api';

export default function AnalyticsPage() {
  const [reports, setReports] = useState<unknown[]>([]);
  const [contentId, setContentId] = useState('');

  useEffect(() => {
    api<{ items: { id: string }[] }>('/api/contents').then((r) => {
      if (r.data.items[0]) setContentId(r.data.items[0].id);
    });
    api<unknown[]>('/api/analytics/reports').then((r) => setReports(r.data));
  }, []);

  async function generate() {
    await api('/api/analytics/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ contentId }),
    });
    const res = await api<unknown[]>('/api/analytics/reports');
    setReports(res.data);
  }

  return (
    <StudioLayout>
      <h1>数据复盘</h1>
      <div className="card" style={{ marginTop: 16 }}>
        <input
          value={contentId}
          onChange={(e) => setContentId(e.target.value)}
          placeholder="contentId"
          style={{ width: '100%' }}
        />
        <button className="btn" style={{ marginTop: 12 }} onClick={generate}>
          生成复盘报告
        </button>
      </div>
      <pre className="card" style={{ marginTop: 16, overflow: 'auto' }}>
        {JSON.stringify(reports, null, 2)}
      </pre>
    </StudioLayout>
  );
}
