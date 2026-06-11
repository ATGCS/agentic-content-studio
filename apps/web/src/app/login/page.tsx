'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { api, setToken } from '@/lib/api';
import { LoginIllustration } from '@/components/login/login-illustration';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@acs.local');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
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
    <div className="login-scene">
      <div className="login-orbit login-orbit--1" aria-hidden />
      <div className="login-orbit login-orbit--2" aria-hidden />
      <div className="login-orbit login-orbit--3" aria-hidden />
      <div className="login-orbit login-orbit--4" aria-hidden />
      <div className="login-star login-star--1" aria-hidden />
      <div className="login-star login-star--2" aria-hidden />

      <div className="login-shell">
        <div className="login-illustration-panel">
          <LoginIllustration />
          <p className="login-illustration-caption">
            一站式 AI 内容生产、审核、发布与数据复盘
          </p>
        </div>

        <form className="login-form-panel" onSubmit={onSubmit}>
          <div className="login-form-header">
            <h1 className="login-form-title">用户登录</h1>
            <p className="login-form-subtitle">
              欢迎登录 Agentic Content Studio
            </p>
          </div>

          <div className="login-field">
            <label htmlFor="email" className="login-label">
              用户名 / 邮箱
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@acs.local"
              className="login-input"
              required
            />
          </div>

          <div className="login-field">
            <div className="login-label-row">
              <label htmlFor="password" className="login-label">
                密码
              </label>
            </div>
            <div className="login-password-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="login-input"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="login-sign-in-btn"
          >
            {loading ? '登录中…' : '用户登录'}
          </button>

          <p className="login-demo-hint">
            演示账号：
            <span className="login-demo-account">admin@acs.local</span>
            {' / '}
            <span className="login-demo-account">admin123</span>
          </p>
        </form>
      </div>
    </div>
  );
}
