'use client';

import { useEffect, useState } from 'react';
import { StudioLayout } from '@/components/StudioLayout';
import { api } from '@/lib/api';

type Content = { id: string; title: string; status: string; updatedAt: string };

export default function ContentsPage() {
  const [items, setItems] = useState<Content[]>([]);
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string>('');

  async function load() {
    const res = await api<{ items: Content[] }>('/api/contents');
    setItems(res.data.items);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function create() {
    await api('/api/contents', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    setTitle('');
    await load();
  }

  async function generate() {
    if (!selected) return;
    await api(`/api/contents/${selected}/generate`, {
      method: 'POST',
      body: JSON.stringify({ platforms: ['XIAOHONGSHU'] }),
    });
    alert('生成完成');
    await load();
  }

  return (
    <StudioLayout>
      <h1>内容资产</h1>
      <div className="card" style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="内容标题"
          style={{ flex: 1 }}
        />
        <button className="btn" onClick={create}>
          新建内容
        </button>
        <button
          className="btn secondary"
          onClick={generate}
          disabled={!selected}
        >
          一键生成
        </button>
      </div>
      <table className="table card" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th></th>
            <th>标题</th>
            <th>状态</th>
            <th>更新</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td>
                <input
                  type="radio"
                  checked={selected === c.id}
                  onChange={() => setSelected(c.id)}
                />
              </td>
              <td>{c.title}</td>
              <td>{c.status}</td>
              <td>{new Date(c.updatedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </StudioLayout>
  );
}
