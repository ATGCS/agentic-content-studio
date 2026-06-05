'use client';

import { useEffect, useState } from 'react';
import { StudioLayout } from '@/components/StudioLayout';
import { api } from '@/lib/api';

type Review = { id: string; status: string; content: { title: string } };

export default function ReviewsPage() {
  const [items, setItems] = useState<Review[]>([]);

  async function load() {
    const res = await api<{ items: Review[] }>('/api/reviews?status=PENDING');
    setItems(res.data.items);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function approve(id: string) {
    await api(`/api/reviews/${id}/approve`, { method: 'POST' });
    await load();
  }

  async function reject(id: string) {
    await api(`/api/reviews/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment: '需修改' }),
    });
    await load();
  }

  return (
    <StudioLayout>
      <h1>审核中心</h1>
      <table className="table card" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>内容</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id}>
              <td>{r.content?.title}</td>
              <td>{r.status}</td>
              <td>
                <button className="btn" onClick={() => approve(r.id)}>
                  通过
                </button>
                <button
                  className="btn secondary"
                  style={{ marginLeft: 8 }}
                  onClick={() => reject(r.id)}
                >
                  驳回
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </StudioLayout>
  );
}
