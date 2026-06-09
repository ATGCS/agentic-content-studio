import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Bot,
  CheckSquare,
  Database,
  FileText,
  FolderOpen,
  Home,
  Layers,
  MessageSquare,
  Settings,
  Sparkles,
  Upload,
  Users,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Header breadcrumb title */
  title?: string;
  /** Breadcrumb parent for header display */
  breadcrumb?: string;
  /** Parent href for nested navigation */
  parent?: string;
};

/** Flat sidebar navigation — matches platform mockup */
export const studioNavItems: NavItem[] = [
  { href: '/dashboard', label: '工作台', icon: Home, title: '工作台' },
  {
    href: '/butler',
    label: 'AI 对话',
    icon: MessageSquare,
    title: 'AI 对话',
  },
  { href: '/contents', label: '内容管理', icon: FileText, title: '内容管理' },
  {
    href: '/ai-generate',
    label: 'AI 生成',
    icon: Sparkles,
    title: 'AI 生成',
    parent: '/contents',
  },
  {
    href: '/topics',
    label: '系列管理',
    icon: Layers,
    title: '系列管理',
    parent: '/contents',
  },
  {
    href: '/agent-tasks',
    label: '任务记录',
    icon: Bot,
    title: '任务记录',
    parent: '/contents',
  },
  {
    href: '/reviews',
    label: '审核中心',
    icon: CheckSquare,
    title: '审核中心',
    breadcrumb: '审核中心',
  },
  { href: '/accounts', label: '平台账号', icon: Users, title: '平台账号' },
  { href: '/knowledge', label: '知识库', icon: Database, title: '知识库' },
  { href: '/materials', label: '素材库', icon: FolderOpen, title: '素材库' },
  { href: '/publishing', label: '发布管理', icon: Upload, title: '发布管理' },
  { href: '/analytics', label: '数据复盘', icon: BarChart3, title: '数据复盘' },
  { href: '/settings', label: '系统设置', icon: Settings, title: '系统设置' },
];

type BreadcrumbConfig = { parent: string; child: string };

/** Per-path breadcrumb mapping for header display */
const breadcrumbMap: Record<string, BreadcrumbConfig> = {
  '/dashboard': { parent: '工作台', child: '工作台' },
  '/contents': { parent: '内容管理', child: '内容管理' },
  '/ai-generate': { parent: '内容管理', child: 'AI 生成' },
  '/butler': { parent: 'AI 对话', child: 'AI 对话' },
  '/agent-tasks': { parent: '内容管理', child: '任务记录' },
  '/reviews': { parent: '审核中心', child: '内容审核' },
  '/accounts': { parent: '平台账号', child: '账号管理' },
  '/knowledge': { parent: '知识库', child: '知识库管理' },
  '/settings/ima': { parent: '系统设置', child: 'IMA 连接配置' },
  '/materials': { parent: '素材库', child: '素材库' },
  '/publishing': { parent: '发布管理', child: '发布管理' },
  '/analytics': { parent: '数据复盘', child: '数据复盘' },
  '/settings': { parent: '系统设置', child: '系统设置' },
  '/topics': { parent: '内容管理', child: '系列管理' },
  '/prompts': { parent: 'Prompt 中心', child: 'Prompt 中心' },
};

/** Resolve page title from pathname */
export function getNavTitle(pathname: string): string {
  const exact = studioNavItems.find((item) => item.href === pathname);
  if (exact) return exact.title ?? exact.label;

  const nested = studioNavItems
    .filter((item) => pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (nested) return nested.title ?? nested.label;

  if (pathname.startsWith('/butler')) return 'AI 对话';
  if (pathname.startsWith('/topics')) return '系列管理';
  if (pathname.startsWith('/prompts')) return 'Prompt 管理';
  if (pathname.startsWith('/contents/')) return '内容详情';

  return '智能内容运营中台';
}

/** Resolve parent link for breadcrumb navigation */
function resolveParentHref(parent: string, child: string): string | undefined {
  if (parent === child) return undefined;
  const nav = studioNavItems.find(
    (item) => (item.title ?? item.label) === parent
  );
  return nav?.href;
}

/** Resolve breadcrumb for header display */
export function getBreadcrumb(pathname: string): {
  parent: string;
  child: string;
  parentHref?: string;
} | null {
  const exact = Object.keys(breadcrumbMap).find((key) => key === pathname);
  if (exact) {
    const config = breadcrumbMap[exact];
    return {
      ...config,
      parentHref: resolveParentHref(config.parent, config.child),
    };
  }

  if (/^\/contents\/[^/]+$/.test(pathname)) {
    return {
      parent: '内容管理',
      child: '内容详情',
      parentHref: '/contents',
    };
  }

  const matched = Object.keys(breadcrumbMap)
    .filter((key) => pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (matched) {
    const config = breadcrumbMap[matched];
    return {
      ...config,
      parentHref: resolveParentHref(config.parent, config.child),
    };
  }

  return null;
}

/** @deprecated use studioNavItems */
export const studioNav = studioNavItems;

/** @deprecated use studioNavItems */
export const studioNavGroups = [{ label: '', items: studioNavItems }];
