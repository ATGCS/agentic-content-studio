'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, ChevronRight, Home, Search } from 'lucide-react';
import { getNavTitle } from '@/config/nav';
import { api } from '@/lib/api';

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

const roleLabels: Record<string, string> = {
  ADMIN: '运营管理员',
  OPERATOR: '内容运营',
  REVIEWER: '审核专员',
};

export function StudioHeader() {
  const pathname = usePathname();
  const pageTitle = getNavTitle(pathname);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    api<AuthUser>('/api/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  const displayName = user?.name ?? '张晓彤';
  const roleLabel = user ? (roleLabels[user.role] ?? user.role) : '运营管理员';

  return (
    <header className="studio-header sticky top-0 z-20 flex h-[74px] shrink-0 items-center justify-between gap-4 px-8">
      <div className="min-w-0">
        <p className="truncate text-[22px] font-bold tracking-[-0.01em] text-[#1D2129]">
          智能内容运营中台 - {pageTitle}
        </p>
        <nav className="mt-2 flex items-center gap-1.5 text-xs text-[#86909c]">
          <Link href="/dashboard" className="hover:text-[#1664ff]">
            <Home className="size-3.5" />
          </Link>
          <ChevronRight className="size-3" />
          <span className="text-[#4e5969]">{pageTitle}</span>
        </nav>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-6">
        <div className="relative hidden w-[292px] lg:block">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#4e5969]" />
          <input
            placeholder="搜索内容项目、账号、素材等"
            className="studio-input h-10 w-full rounded-[8px] pr-9 pl-4 text-sm outline-none placeholder:text-[#a9aeb8]"
          />
        </div>

        <button
          type="button"
          className="relative flex size-10 items-center justify-center rounded-full text-[#1D2129] transition-colors hover:bg-[#f0f5ff] hover:text-[#1664ff]"
        >
          <Bell className="size-5" />
          <span className="absolute right-0 top-0 flex size-[18px] items-center justify-center rounded-full bg-[#f53f3f] text-[10px] font-bold text-white ring-2 ring-white">
            12
          </span>
        </button>

        <div className="hidden items-center gap-3 sm:flex">
          <div className="size-10 overflow-hidden rounded-full bg-gradient-to-br from-[#f7d6c9] to-[#c7796c]" />
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-semibold text-[#1D2129]">
              {displayName}
            </p>
            <p className="truncate text-xs text-[#86909c]">{roleLabel}</p>
          </div>
          <ChevronDown className="size-4 text-[#86909c]" />
        </div>
      </div>
    </header>
  );
}
