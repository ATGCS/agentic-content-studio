'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  Settings,
  UserRound,
} from 'lucide-react';
import { getBreadcrumb, getNavTitle } from '@/config/nav';
import { api, clearToken } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const breadcrumb = getBreadcrumb(pathname);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    api<AuthUser>('/api/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  const displayName = user?.name ?? '—';
  const roleLabel = user ? (roleLabels[user.role] ?? user.role) : '—';

  function handleLogout() {
    clearToken();
    window.location.href = '/login';
  }

  return (
    <header className="studio-header sticky top-0 z-20 flex h-[74px] shrink-0 items-center justify-between gap-4 px-4 md:px-5">
      <div className="min-w-0">
        {breadcrumb ? (
          <>
            <p className="truncate text-[22px] font-bold tracking-[-0.01em] text-[#1D2129]">
              {breadcrumb.parent === breadcrumb.child
                ? breadcrumb.child
                : `${breadcrumb.parent} - ${breadcrumb.child}`}
            </p>
            <nav className="mt-2 flex items-center gap-1.5 text-xs text-[#86909c]">
              <Link href="/dashboard" className="hover:text-[#1664ff]">
                <Home className="size-3.5" />
              </Link>
              {breadcrumb.parent !== breadcrumb.child && (
                <>
                  <ChevronRight className="size-3" />
                  {breadcrumb.parentHref ? (
                    <Link
                      href={breadcrumb.parentHref}
                      className="text-[#86909c] hover:text-[#1664ff]"
                    >
                      {breadcrumb.parent}
                    </Link>
                  ) : (
                    <span className="text-[#86909c]">{breadcrumb.parent}</span>
                  )}
                </>
              )}
              <ChevronRight className="size-3" />
              <span className="text-[#4e5969]">{breadcrumb.child}</span>
            </nav>
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-6">
        <button
          type="button"
          className="relative flex size-10 items-center justify-center rounded-full text-[#4E5969] transition-colors hover:bg-[#f0f5ff] hover:text-[#1664ff]"
        >
          <Bell className="size-5" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hidden items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-[#f7f8fa] sm:flex"
            >
              <div className="size-10 overflow-hidden rounded-full bg-gradient-to-br from-[#f7d6c9] to-[#c7796c]" />
              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-semibold text-[#1D2129]">
                  {displayName}
                </p>
                <p className="truncate text-xs text-[#86909c]">{roleLabel}</p>
              </div>
              <ChevronDown className="size-4 text-[#86909c]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="space-y-1">
              <p className="truncate text-sm font-semibold text-[#1D2129]">
                {displayName}
              </p>
              <p className="truncate text-xs font-normal text-[#86909c]">
                {user?.email ?? '未登录'}
              </p>
              <p className="truncate text-xs font-normal text-[#86909c]">
                {roleLabel}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="gap-2">
                <UserRound className="size-4" />
                个人设置
              </Link>
            </DropdownMenuItem>
            {user?.role === 'ADMIN' && (
              <DropdownMenuItem asChild>
                <Link href="/settings" className="gap-2">
                  <Settings className="size-4" />
                  系统设置
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-[#f53f3f] focus:text-[#f53f3f]"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
