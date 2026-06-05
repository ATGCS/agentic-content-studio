'use client';

import { useEffect, useState } from 'react';
import { StudioLayout } from '@/components/StudioLayout';
import { api } from '@/lib/api';

type Account = {
  id: string;
  accountName: string;
  platform: string;
  authStatus: string;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState('');
  const [positioning, setPositioning] = useState('');

  async function load() {
    const res = await api<Account[]>('/api/accounts');
    setAccounts(res.data);
    if (res.data[0]) setSelected(res.data[0].id);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function sync() {
    await api('/api/accounts/sync', { method: 'POST' });
    await load();
  }

  async function saveProfile() {
    await api(`/api/account-profiles/${selected}`, {
      method: 'PUT',
      body: JSON.stringify({ positioning, contentStyle: '专业、清晰' }),
    });
    alert('画像已保存');
  }

  return (
    <StudioLayout>
      <h1>账号画像</h1>
      <button className="btn" onClick={sync}>
        同步 TurboPush 账号
      </button>
      <table className="table card" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th></th>
            <th>名称</th>
            <th>平台</th>
            <th>授权</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id}>
              <td>
                <input
                  type="radio"
                  checked={selected === a.id}
                  onChange={() => setSelected(a.id)}
                />
              </td>
              <td>{a.accountName}</td>
              <td>{a.platform}</td>
              <td>{a.authStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="card" style={{ marginTop: 16 }}>
        <label>
          账号定位
          <textarea
            value={positioning}
            onChange={(e) => setPositioning(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
          />
        </label>
        <button className="btn" style={{ marginTop: 12 }} onClick={saveProfile}>
          保存画像
        </button>
      </div>
    </StudioLayout>
  );
}
