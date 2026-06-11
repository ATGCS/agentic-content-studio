'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, LogOut, Sparkles } from 'lucide-react';
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
import {
  primaryNavItems,
  secondaryNavItems,
  studioNavItems,
} from '@/config/nav';
import { clearToken } from '@/lib/api';
import { cn } from '@/lib/utils';

function NavItem({
  item,
  subItems,
  pathname,
}: {
  item: (typeof studioNavItems)[number];
  subItems: typeof studioNavItems;
  pathname: string;
}) {
  const Icon = item.icon;
  const active =
    pathname === item.href ||
    (pathname.startsWith(`${item.href}/`) &&
      !subItems.some(
        (sub) => sub.parent === item.href && pathname.startsWith(sub.href)
      ));
  const hasSubItems = subItems.some((sub) => sub.parent === item.href);
  const isParentActive =
    pathname === item.href ||
    subItems.some(
      (sub) =>
        sub.parent === item.href &&
        (pathname === sub.href || pathname.startsWith(`${sub.href}/`))
    );
  const [expanded, setExpanded] = useState(hasSubItems && isParentActive);

  return (
    <div>
      <SidebarMenuItem>
        <Link
          href={item.href}
          className={cn('studio-nav-link', active && 'studio-nav-link--active')}
        >
          <Icon className="size-4 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">
            {item.label}
          </span>
          {hasSubItems && (
            <ChevronRight
              className={cn(
                'size-3 transition-transform group-data-[collapsible=icon]:hidden',
                expanded && 'rotate-90',
                'group-data-[collapsible=icon]:hidden'
              )}
            />
          )}
        </Link>
      </SidebarMenuItem>
      {hasSubItems && expanded && (
        <SidebarMenu className="ml-4 space-y-1 border-l-2 border-[#E5E8EF] pl-2 group-data-[collapsible=icon]:hidden">
          {subItems
            .filter((sub) => sub.parent === item.href)
            .map((sub) => {
              const SubIcon = sub.icon;
              const subActive =
                pathname === sub.href || pathname.startsWith(`${sub.href}/`);
              return (
                <SidebarMenuItem key={sub.href}>
                  <Link
                    href={sub.href}
                    className={cn(
                      'studio-nav-link',
                      subActive && 'studio-nav-link--active'
                    )}
                  >
                    <SubIcon className="size-4 shrink-0" />
                    <span>{sub.label}</span>
                  </Link>
                </SidebarMenuItem>
              );
            })}
        </SidebarMenu>
      )}
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleSidebar, state } = useSidebar();
  const [moreOpen, setMoreOpen] = useState(() =>
    secondaryNavItems
      .filter((item) => !item.parent)
      .some(
        (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
      )
  );

  const topLevelItems = primaryNavItems.filter((item) => !item.parent);
  const subItems = studioNavItems.filter((item) => item.parent);
  const secondaryTop = secondaryNavItems.filter((item) => !item.parent);
  const secondaryActive = secondaryTop.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

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
          {topLevelItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              subItems={subItems}
              pathname={pathname}
            />
          ))}
        </SidebarMenu>

        {secondaryTop.length > 0 && (
          <SidebarMenu className="mt-2 border-t border-[#E5E8EF] pt-2">
            <SidebarMenuItem>
              <button
                type="button"
                className={cn(
                  'studio-nav-link w-full text-left',
                  secondaryActive && 'studio-nav-link--active'
                )}
                onClick={() => setMoreOpen((v) => !v)}
              >
                <ChevronRight
                  className={cn(
                    'size-4 shrink-0 transition-transform',
                    moreOpen && 'rotate-90'
                  )}
                />
                <span className="group-data-[collapsible=icon]:hidden">
                  更多工具
                </span>
              </button>
            </SidebarMenuItem>
            {moreOpen &&
              secondaryTop.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'studio-nav-link ml-2',
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
        )}
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
