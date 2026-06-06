import { addCollection, Icon } from '@iconify/react';
import simpleIcons from '@iconify-json/simple-icons/icons.json';
import { cn } from '@/lib/utils';

const iconMap: Record<string, string> = {
  WECHAT: 'simple-icons:wechat',
  WEIXIN: 'simple-icons:wechat',
  XIAOHONGSHU: 'simple-icons:xiaohongshu',
  RED: 'simple-icons:xiaohongshu',
  DOUYIN: 'simple-icons:douyin',
  VIDEO_CHANNEL: 'simple-icons:video',
  BILIBILI: 'simple-icons:bilibili',
  ZHIHU: 'simple-icons:zhihu',
  KUAISHOU: 'simple-icons:kuaishou',
  WEIBO: 'simple-icons:sinaweibo',
  SINAWEIBO: 'simple-icons:sinaweibo',
  TOUTIAO: 'simple-icons:toutiao',
  TAOBAO: 'simple-icons:taobao',
  WECOM: 'simple-icons:wechat',
  BAIJIAHAO: 'simple-icons:video',
};

const labelMap: Record<string, string> = {
  WECHAT: '公众号',
  XIAOHONGSHU: '小红书',
  DOUYIN: '抖音',
  VIDEO_CHANNEL: '视频号',
  BILIBILI: 'B站',
  ZHIHU: '知乎',
  OTHER: '其他',
};

const bgMap: Record<string, string> = {
  WECHAT: '#07C160',
  WEIXIN: '#07C160',
  XIAOHONGSHU: '#FF2442',
  RED: '#FF2442',
  DOUYIN: '#FFFFFF',
  VIDEO_CHANNEL: '#FF8A00',
  BILIBILI: '#FB7299',
  ZHIHU: '#1677FF',
  KUAISHOU: '#FF4906',
  WEIBO: '#FFC233',
  SINAWEIBO: '#FFC233',
  TOUTIAO: '#7C3AED',
  TAOBAO: '#FF5000',
  WECOM: '#07C160',
  BAIJIAHAO: '#1D7CFF',
};

let iconsAdded = false;

export function PlatformBadge({
  platform,
  className,
  size = 'default',
}: {
  platform: string;
  className?: string;
  size?: 'default' | 'sm';
}) {
  if (!iconsAdded) {
    addCollection(simpleIcons);
    iconsAdded = true;
  }

  const iconKey = iconMap[platform];
  const label = labelMap[platform] ?? platform;
  const bg = bgMap[platform] ?? '#86909C';
  const iconColor = platform === 'DOUYIN' ? '#111827' : bg;
  const badgeBg = platform === 'DOUYIN' ? '#F5F7FA' : `${bg}15`;
  const sizeClass =
    size === 'sm'
      ? 'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]'
      : 'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs';

  return (
    <span
      className={cn(sizeClass, 'font-medium text-[#4e5969]', className)}
      style={{ backgroundColor: badgeBg }}
      title={label}
    >
      {platform === 'DOUYIN' ? (
        <img src="/platform-icons/douyin.png" alt="" className="size-3.5 shrink-0 object-contain" />
      ) : iconKey ? (
        <Icon
          icon={iconKey}
          width={14}
          height={14}
          className="shrink-0"
          style={{ color: iconColor }}
        />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}
