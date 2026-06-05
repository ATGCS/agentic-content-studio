'use client';

import { useEffect, useState } from 'react';
import { StudioLayout } from '@/components/StudioLayout';
import { api } from '@/lib/api';

export default function AiGeneratePage() {
  const [contents, setContents] = useState<{ id: string; title: string }[]>([]);
  const [contentId, setContentId] = useState('');
  const [query, setQuery] = useState('');
  const [runs, setRuns] = useState<unknown[]>([]);

  useEffect(() => {
    api<{ items: { id: string; title: string }[] }>('/api/contents').then(
      (r) => {
        setContents(r.data.items);
        if (r.data.items[0]) setContentId(r.data.items[0].id);
      }
    );
  }, []);

  async function searchIma() {
    await api('/api/ima/search', {
      method: 'POST',
      body: JSON.stringify({ contentId, query: query || 'AI内容运营' }),
    });
    alert('IMA 搜索完成');
  }

  async function runTitle() {
    await api('/api/agents/title/run', {
      method: 'POST',
      body: JSON.stringify({ contentId, count: 5 }),
    });
    await loadRuns();
  }

  async function loadRuns() {
    const res = await api<unknown[]>(`/api/agent-runs?contentId=${contentId}`);
    setRuns(res.data);
  }

  return (
    <StudioLayout>
      <h1>AI 生成</h1>
      <div className="card" style={{ marginTop: 16 }}>
        <label>
          内容
          <select
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            {contents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="IMA 关键词"
            style={{ flex: 1 }}
          />
          <button className="btn secondary" onClick={searchIma}>
            IMA 搜索
          </button>
          <button className="btn" onClick={runTitle}>
            标题 Agent
          </button>
          <button className="btn secondary" onClick={loadRuns}>
            刷新记录
          </button>
        </div>
      </div>
      <pre className="card" style={{ marginTop: 16, overflow: 'auto' }}>
        {JSON.stringify(runs, null, 2)}
      </pre>
    </StudioLayout>
  );
}
