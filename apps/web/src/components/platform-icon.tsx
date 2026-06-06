'use client';

import { addCollection, Icon } from '@iconify/react';
import simpleIcons from '@iconify-json/simple-icons/icons.json';
import { cn } from '@/lib/utils';

let added = false;

export type PlatformIconKey =
  | 'wechat'
  | 'weixin'
  | 'xiaohongshu'
  | 'red'
  | 'douyin'
  | 'shipinhao'
  | 'video'
  | 'bilibili'
  | 'zhihu'
  | 'kuaishou'
  | 'weibo'
  | 'sinaweibo'
  | 'toutiao'
  | 'taobao'
  | 'wecom'
  | 'baijiahao';

type PlatformMeta = {
  label: string;
  bg: string;
  color: string;
  short: string;
  icon?: string;
  image?: string;
};

export const platformIconMeta: Record<string, PlatformMeta> = {
  wechat: { label: '微信', bg: '#07C160', color: '#FFFFFF', short: '微', icon: 'simple-icons:wechat' },
  weixin: { label: '公众号', bg: '#07C160', color: '#FFFFFF', short: '微', icon: 'simple-icons:wechat' },
  xiaohongshu: { label: '小红书', bg: '#FF2442', color: '#FFFFFF', short: '小红', icon: 'simple-icons:xiaohongshu' },
  red: { label: '小红书', bg: '#FF2442', color: '#FFFFFF', short: '小红', icon: 'simple-icons:xiaohongshu' },
  douyin: { label: '抖音', bg: '#FFFFFF', color: '#111827', short: '抖', image: '/platform-icons/douyin.png' },
  shipinhao: { label: '视频号', bg: '#FF8A00', color: '#FFFFFF', short: '视' },
  video: { label: '视频号', bg: '#FF8A00', color: '#FFFFFF', short: '视' },
  bilibili: { label: 'B站', bg: '#FB7299', color: '#FFFFFF', short: 'bili', icon: 'simple-icons:bilibili' },
  zhihu: { label: '知乎', bg: '#1677FF', color: '#FFFFFF', short: '知', icon: 'simple-icons:zhihu' },
  kuaishou: { label: '快手', bg: '#FF4906', color: '#FFFFFF', short: '快', icon: 'simple-icons:kuaishou' },
  weibo: { label: '微博', bg: '#FFC233', color: '#D4380D', short: '微', icon: 'simple-icons:sinaweibo' },
  sinaweibo: { label: '微博', bg: '#FFC233', color: '#D4380D', short: '微', icon: 'simple-icons:sinaweibo' },
  toutiao: { label: '今日头条', bg: '#7C3AED', color: '#FFFFFF', short: '头条', icon: 'simple-icons:toutiao' },
  taobao: { label: '淘宝', bg: '#FF5000', color: '#FFFFFF', short: '淘', icon: 'simple-icons:taobao' },
  wecom: { label: '公众号', bg: '#07C160', color: '#FFFFFF', short: '微', icon: 'simple-icons:wechat' },
  baijiahao: { label: '百家号', bg: '#1D7CFF', color: '#FFFFFF', short: '百' },
  WECHAT: { label: '公众号', bg: '#07C160', color: '#FFFFFF', short: '微', icon: 'simple-icons:wechat' },
  XIAOHONGSHU: { label: '小红书', bg: '#FF2442', color: '#FFFFFF', short: '小红', icon: 'simple-icons:xiaohongshu' },
  DOUYIN: { label: '抖音', bg: '#FFFFFF', color: '#111827', short: '抖', image: '/platform-icons/douyin.png' },
  VIDEO_CHANNEL: { label: '视频号', bg: '#FF8A00', color: '#FFFFFF', short: '视' },
  BILIBILI: { label: 'B站', bg: '#FB7299', color: '#FFFFFF', short: 'bili', icon: 'simple-icons:bilibili' },
  ZHIHU: { label: '知乎', bg: '#1677FF', color: '#FFFFFF', short: '知', icon: 'simple-icons:zhihu' },
  OTHER: { label: '其他', bg: '#86909C', color: '#FFFFFF', short: '其' },
};

type PlatformIconProps = {
  icon: string;
  size?: number;
};

export function PlatformIcon({ icon, size = 24 }: PlatformIconProps) {
  if (!added) {
    addCollection(simpleIcons);
    added = true;
  }

  return <Icon icon={icon} width={size} height={size} />;
}

export function PlatformBadge({
  platform,
  className,
  size = 'md',
}: {
  platform: string | undefined;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const meta = platformIconMeta[(platform ?? '') as PlatformIconKey] ?? {
    label: platform,
    bg: '#86909C',
    color: '#FFFFFF',
    short: '?',
  };
  const sizeClass = size === 'lg' ? 'h-11 w-11 rounded-xl text-sm' : size === 'sm' ? 'h-5 w-5 rounded-[5px] text-[10px]' : 'h-6 w-6 rounded-md text-xs';
  const iconSize = size === 'lg' ? 24 : size === 'sm' ? 14 : 16;

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center font-semibold shadow-sm', sizeClass, className)}
      style={{ backgroundColor: meta.bg, color: meta.color }}
      title={meta.label}
    >
      {meta.image ? (
        <img src={meta.image} alt="" className="h-[80%] w-[80%] object-contain" />
      ) : meta.icon ? (
        <PlatformIcon icon={meta.icon} size={iconSize} />
      ) : (
        meta.short
      )}
    </span>
  );
}

