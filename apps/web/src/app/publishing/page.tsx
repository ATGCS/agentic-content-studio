'use client';

import { useEffect, useState } from 'react';
import { StudioLayout } from '@/components/StudioLayout';
import { api } from '@/lib/api';

type Task = { id: string; status: string; version?: { title: string } };

export default function PublishingPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [versionId, setVersionId] = useState('');
  const [accountId, setAccountId] = useState('mock-acc-wechat');

  async function load() {
    const res = await api<Task[]>('/api/publishing/tasks');
    setTasks(res.data);
  }

  useEffect(() => {
    load().catch(console.error);
    api<{ items: { id: string }[] }>('/api/contents').then(async (c) => {
      const first = c.data.items[0];
      if (!first) return;
      const versions = await api<{ id: string }[]>(
        `/api/contents/${first.id}/versions`
      );
      if (versions.data[0]) setVersionId(versions.data[0].id);
    });
  }, []);

  async function createTask() {
    await api('/api/publishing/tasks', {
      method: 'POST',
      body: JSON.stringify({ versionId, accountId }),
    });
    await load();
  }

  async function publish(id: string) {
    await api(`/api/publishing/tasks/${id}/publish`, { method: 'POST' });
    await load();
  }

  return (
    <StudioLayout>
      <h1>发布中心</h1>
      <div className="card" style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <input
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
          placeholder="versionId"
          style={{ flex: 1 }}
        />
        <input
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          placeholder="accountId"
        />
        <button className="btn" onClick={createTask}>
          创建任务
        </button>
      </div>
      <table className="table card" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>版本</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>{t.version?.title ?? t.id}</td>
              <td>{t.status}</td>
              <td>
                {t.status === 'PENDING' && (
                  <button className="btn" onClick={() => publish(t.id)}>
                    发布
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </StudioLayout>
  );
}
