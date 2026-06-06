import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bot,
  CheckSquare,
  Database,
  FileText,
  FolderOpen,
  Home,
  Settings,
  Upload,
  Users,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Header breadcrumb title */
  title?: string;
};

/** Flat sidebar navigation — matches platform mockup */
export const studioNavItems: NavItem[] = [
  { href: '/dashboard', label: '工作台', icon: Home, title: '工作台' },
  { href: '/contents', label: '内容项目', icon: FileText, title: '内容项目' },
  { href: '/reviews', label: '审核中心', icon: CheckSquare, title: '审核中心' },
  { href: '/agent-tasks', label: 'Agent 任务', icon: Bot, title: 'Agent 任务' },
  { href: '/accounts', label: '平台账号', icon: Users, title: '平台账号' },
  { href: '/settings/ima', label: '知识库', icon: Database, title: '知识库' },
  { href: '/materials', label: '素材库', icon: FolderOpen, title: '素材库' },
  { href: '/publishing', label: '发布管理', icon: Upload, title: '发布管理' },
  { href: '/analytics', label: '数据复盘', icon: BarChart3, title: '数据复盘' },
  { href: '/settings', label: '系统设置', icon: Settings, title: '系统设置' },
];

/** Resolve page title from pathname */
export function getNavTitle(pathname: string): string {
  const exact = studioNavItems.find((item) => item.href === pathname);
  if (exact) return exact.title ?? exact.label;

  const nested = studioNavItems
    .filter((item) => pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (nested) return nested.title ?? nested.label;

  if (pathname.startsWith('/topics')) return '选题管理';
  if (pathname.startsWith('/prompts')) return 'Prompt 管理';
  if (pathname.startsWith('/contents/')) return '内容详情';

  return '智能内容运营中台';
}

/** @deprecated use studioNavItems */
export const studioNav = studioNavItems;

/** @deprecated use studioNavItems */
export const studioNavGroups = [{ label: '', items: studioNavItems }];
