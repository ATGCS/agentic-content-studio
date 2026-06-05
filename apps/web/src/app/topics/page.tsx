'use client';

import { useEffect, useState } from 'react';
import { StudioLayout } from '@/components/StudioLayout';
import { api } from '@/lib/api';

type Topic = { id: string; title: string; status: string; createdAt: string };

export default function TopicsPage() {
  const [items, setItems] = useState<Topic[]>([]);
  const [title, setTitle] = useState('');

  async function load() {
    const res = await api<{ items: Topic[] }>('/api/topics');
    setItems(res.data.items);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function create() {
    if (!title.trim()) return;
    await api('/api/topics', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    setTitle('');
    await load();
  }

  return (
    <StudioLayout>
      <h1>选题管理</h1>
      <div className="card" style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="新选题标题"
          style={{ flex: 1 }}
        />
        <button className="btn" onClick={create}>
          新建选题
        </button>
      </div>
      <table className="table card" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>标题</th>
            <th>状态</th>
            <th>创建时间</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id}>
              <td>{t.title}</td>
              <td>{t.status}</td>
              <td>{new Date(t.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </StudioLayout>
  );
}
