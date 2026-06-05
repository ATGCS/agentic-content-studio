'use client';

import { useEffect, useState } from 'react';
import { StudioLayout } from '@/components/StudioLayout';
import { api } from '@/lib/api';

type Prompt = {
  id: string;
  name: string;
  agentType: string;
  version: string;
  enabled: boolean;
};

export default function PromptsPage() {
  const [items, setItems] = useState<Prompt[]>([]);

  useEffect(() => {
    api<Prompt[]>('/api/prompts').then((r) => setItems(r.data));
  }, []);

  return (
    <StudioLayout>
      <h1>Prompt 中心</h1>
      <table className="table card" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>名称</th>
            <th>类型</th>
            <th>版本</th>
            <th>启用</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.agentType}</td>
              <td>{p.version}</td>
              <td>{p.enabled ? '是' : '否'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </StudioLayout>
  );
}
