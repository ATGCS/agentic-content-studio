'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '@/lib/api';

const nav = [
  { href: '/dashboard', label: '工作台' },
  { href: '/topics', label: '选题' },
  { href: '/contents', label: '内容资产' },
  { href: '/ai-generate', label: 'AI 生成' },
  { href: '/reviews', label: '审核中心' },
  { href: '/publishing', label: '发布中心' },
  { href: '/analytics', label: '数据复盘' },
  { href: '/accounts', label: '账号画像' },
  { href: '/prompts', label: 'Prompt' },
];

export function StudioLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 220,
          background: '#0f172a',
          color: '#e2e8f0',
          padding: 16,
        }}
      >
        <h2 style={{ fontSize: 16, margin: '0 0 16px' }}>Content Studio</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                background: pathname === item.href ? '#1e3a8a' : 'transparent',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          className="btn secondary"
          style={{ marginTop: 24, width: '100%' }}
          onClick={() => {
            clearToken();
            router.push('/login');
          }}
        >
          退出
        </button>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
