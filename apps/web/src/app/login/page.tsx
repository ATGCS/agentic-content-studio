'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Sparkles } from 'lucide-react';
import { api, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@acs.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(res.data.token);
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      router.push(next?.startsWith('/') ? next : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-scene grid place-items-center p-4">
      <div className="login-shell">
        <form className="login-form-panel" onSubmit={onSubmit}>
          <div className="mb-8 flex items-center gap-3">
            <div className="studio-brand-icon flex size-11 items-center justify-center rounded-xl">
              <Sparkles className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1d2129]">
                Agentic Content Studio
              </h1>
              <p className="text-sm text-[#86909c]">智能内容运营工作台</p>
            </div>
          </div>

          <p className="mb-6 text-sm text-[#86909c]">
            演示账号 admin@acs.local / admin123
          </p>

          <div className="space-y-4">
            <div className="login-input-wrap">
              <Mail />
              <input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@mail.com"
                className="studio-input h-10 w-full px-3 text-sm outline-none"
              />
            </div>
            <div className="login-input-wrap">
              <Lock />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                className="studio-input h-10 w-full px-3 text-sm outline-none"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-[#f53f3f]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-sign-in-btn mt-6"
          >
            {loading ? '登录中…' : '登录'}
          </button>
        </form>

        <div className="login-brand-panel">
          <div className="studio-brand-icon flex size-16 items-center justify-center rounded-2xl">
            <Sparkles className="size-8 text-white" />
          </div>
          <p className="max-w-[200px] text-center text-sm leading-relaxed font-medium text-[#4d4c6d]">
            「一站式 AI 内容生产、审核、发布与数据复盘，让运营效率提升 10 倍。」
          </p>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#1d2129]">Content Studio</p>
            <p className="text-xs text-[#86909c]">Powered by TurboPush</p>
          </div>
        </div>
      </div>
    </div>
  );
}
