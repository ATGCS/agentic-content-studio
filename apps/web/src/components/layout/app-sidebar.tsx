'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, LogOut, Sparkles } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { studioNavItems } from '@/config/nav';
import { clearToken } from '@/lib/api';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleSidebar, state } = useSidebar();

  return (
    <Sidebar collapsible="icon" className="studio-sidebar">
      <SidebarHeader className="border-b border-[#e5e8ef] px-3 py-4">
        <div className="flex items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center">
          <div className="studio-brand-icon flex size-9 shrink-0 items-center justify-center">
            <Sparkles className="size-4 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold leading-none text-[#1D2129]">
              智能内容运营中台
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarMenu>
          {studioNavItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' &&
                pathname.startsWith(`${item.href}/`));
            return (
              <SidebarMenuItem key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'studio-nav-link',
                    active && 'studio-nav-link--active'
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden">
                    {item.label}
                  </span>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-[#e5e8ef] p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <button
              type="button"
              className="studio-nav-link w-full text-left text-[#86909c]"
              onClick={() => toggleSidebar()}
            >
              <ChevronLeft
                className={cn(
                  'size-4 transition-transform',
                  state === 'collapsed' && 'rotate-180'
                )}
              />
              <span className="group-data-[collapsible=icon]:hidden">
                收起菜单
              </span>
            </button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <button
              type="button"
              className="studio-nav-link w-full text-left text-[#86909c] hover:text-[#f53f3f]"
              onClick={() => {
                clearToken();
                router.push('/login');
              }}
            >
              <LogOut className="size-4" />
              <span className="group-data-[collapsible=icon]:hidden">
                退出登录
              </span>
            </button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
