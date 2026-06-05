'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@acs.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const res = await api<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(res.data.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <form className="card" onSubmit={onSubmit} style={{ width: 360 }}>
        <h1>Agentic Content Studio</h1>
        <p style={{ color: '#64748b' }}>admin@acs.local / admin123</p>
        <label style={{ display: 'block', marginTop: 12 }}>
          邮箱
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
          />
        </label>
        <label style={{ display: 'block', marginTop: 12 }}>
          密码
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
          />
        </label>
        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        <button
          className="btn"
          type="submit"
          style={{ marginTop: 16, width: '100%' }}
        >
          登录
        </button>
      </form>
    </div>
  );
}
