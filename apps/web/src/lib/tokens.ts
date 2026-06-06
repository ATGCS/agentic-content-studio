/** Agentic Content Studio design tokens — see docs/智能内容运营平台/UI设计规范 V1.md */

export const brand = {
  50: '#F0F5FF',
  400: '#4480FF',
  500: '#1664FF',
  600: '#0550ED',
} as const;

export const accent = {
  purple: '#7C3AED',
  cyan: '#06B6D4',
  orange: '#FF6A00',
  green: '#00B42A',
  red: '#F53F3F',
} as const;

export const statusStyles: Record<
  string,
  { label?: string; bg: string; text: string }
> = {
  DRAFT: { bg: 'bg-slate-100', text: 'text-slate-600' },
  PENDING: { bg: 'bg-orange-500/10', text: 'text-[#FF6A00]' },
  PENDING_REVIEW: { bg: 'bg-orange-500/10', text: 'text-[#FF6A00]' },
  PENDING_GENERATE: { bg: 'bg-purple-500/10', text: 'text-[#7C3AED]' },
  GENERATING: { bg: 'bg-purple-500/10', text: 'text-[#7C3AED]' },
  APPROVED: { bg: 'bg-green-500/10', text: 'text-[#00B42A]' },
  PUBLISHED: { bg: 'bg-[#1664FF]/10', text: 'text-[#1664FF]' },
  REJECTED: { bg: 'bg-red-500/10', text: 'text-[#F53F3F]' },
  FAILED: { bg: 'bg-red-500/10', text: 'text-[#F53F3F]' },
  ACTIVE: { bg: 'bg-green-500/10', text: 'text-[#00B42A]' },
  OPEN: { bg: 'bg-[#1664FF]/10', text: 'text-[#1664FF]' },
};

export function getStatusStyle(status: string) {
  return (
    statusStyles[status] ?? {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
    }
  );
}

export const statusLabels: Record<string, string> = {
  DRAFT: '草稿',
  PENDING_GENERATE: '待生成',
  GENERATING: '生成中',
  PENDING_REVIEW: '待审核',
  REJECTED: '已驳回',
  APPROVED: '已通过',
  PENDING_PUBLISH: '待发布',
  PUBLISHING: '发布中',
  PUBLISHED: '已发布',
  FAILED: '失败',
  REVIEWED: '已复盘',
  ARCHIVED: '已归档',
  PENDING: '待处理',
};

export function getStatusLabel(status: string) {
  return statusLabels[status] ?? status;
}

export const platformLabels: Record<string, string> = {
  WECHAT: '公众号',
  XIAOHONGSHU: '小红书',
  DOUYIN: '抖音',
  VIDEO_CHANNEL: '视频号',
  BILIBILI: 'B站',
  ZHIHU: '知乎',
  OTHER: '其他',
};

export const platformColors: Record<string, string> = {
  WECHAT: 'bg-green-500',
  XIAOHONGSHU: 'bg-red-500',
  DOUYIN: 'bg-slate-900',
  VIDEO_CHANNEL: 'bg-orange-500',
  BILIBILI: 'bg-pink-500',
  ZHIHU: 'bg-blue-500',
  OTHER: 'bg-gray-400',
};
