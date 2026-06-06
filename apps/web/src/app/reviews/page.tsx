'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ContentReviewDialog } from '@/components/dialogs/content-review-dialog';
import { StudioLayout } from '@/components/StudioLayout';
import {
  PageContainer,
  PageHeader,
} from '@/components/layout/page-container';
import { PlatformBadge } from '@/components/platform-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronRight,
  ChevronLeft,
  Clock,
  MoreHorizontal,
  Search,
  ShieldAlert,
  ShieldCheck,
  XOctagon,
  FileText,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { api } from '@/lib/api';

type ReviewItem = {
  id: string;
  title: string;
  platform: string;
  account: string;
  reviewType: string;
  riskLevel: 'high' | 'medium' | 'low';
  submittedAt: string;
  source: string;
  status: 'pending' | 'approved' | 'rejected' | 'PENDING' | 'APPROVED' | 'REJECTED';
  content?: { title: string };
};

const tabs = [
  { value: 'all', label: '全部', count: 260 },
  { value: 'pending', label: '待审核', count: 68 },
  { value: 'highRisk', label: '高风险', count: 12 },
  { value: 'rejected', label: '已驳回', count: 24 },
  { value: 'approved', label: '已通过', count: 156 },
] as const;

const stats = [
  {
    label: '待审核',
    value: 68,
    delta: '+12',
    icon: Clock,
    iconBg: '#FFF7E6',
    iconColor: '#FF7D00',
  },
  {
    label: '高风险',
    value: 12,
    delta: '+3',
    icon: ShieldAlert,
    iconBg: '#FFF1F0',
    iconColor: '#F53F3F',
  },
  {
    label: '已驳回',
    value: 24,
    delta: '+5',
    icon: XOctagon,
    iconBg: '#F5F1FF',
    iconColor: '#7B61FF',
  },
  {
    label: '已通过',
    value: 156,
    delta: '+18',
    icon: ShieldCheck,
    iconBg: '#E8FFEA',
    iconColor: '#00B42A',
  },
  {
    label: '今日审核量',
    value: 98,
    delta: '+15',
    icon: FileText,
    iconBg: '#E8F3FF',
    iconColor: '#1664FF',
  },
];

const riskDistribution = {
  total: 260,
  items: [
    { label: '高风险', value: 12, percent: 4.6, color: '#F53F3F' },
    { label: '中风险', value: 68, percent: 26.2, color: '#FF7D00' },
    { label: '低风险', value: 180, percent: 69.2, color: '#00B42A' },
  ],
};

const reviewTypeDistribution = [
  { label: '内容合规', value: 126, percent: 48.5 },
  { label: '营销合规', value: 78, percent: 30.0 },
  { label: '图片审核', value: 32, percent: 12.3 },
  { label: '版权审核', value: 16, percent: 6.2 },
  { label: '其他', value: 8, percent: 3.0 },
];

const platformDistribution = [
  { label: '微信公众号', value: 78, percent: 30.0 },
  { label: '小红书', value: 62, percent: 23.8 },
  { label: '抖音', value: 58, percent: 22.3 },
  { label: '知乎', value: 36, percent: 13.8 },
  { label: 'B站', value: 16, percent: 6.2 },
  { label: '其他', value: 10, percent: 3.9 },
];

type TabValue = (typeof tabs)[number]['value'];

export default function ReviewsPage() {
  const [tab, setTab] = useState<TabValue>('all');
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<ReviewItem | null>(null);

  async function load() {
    try {
      const res = await api<{ items: ReviewItem[] }>('/api/reviews?status=PENDING');
      setItems(res.data.items);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    }
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const handleReview = (item: ReviewItem) => {
    setReviewingItem(item);
    setReviewDialogOpen(true);
  };

  async function approve(id: string) {
    await api(`/api/reviews/${id}/approve`, { method: 'POST' });
    await load();
  }

  async function reject(id: string, comment?: string) {
    await api(`/api/reviews/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    });
    await load();
  }

  const getRiskBadge = (level: string) => {
    if (level === 'high') {
      return (
        <Badge
          variant='secondary'
          className='bg-[#FFF1F0] text-[#F53F3F] hover:bg-[#FFF1F0] border-0'
        >
          高风险
        </Badge>
      );
    }
    if (level === 'medium') {
      return (
        <Badge
          variant='secondary'
          className='bg-[#FFF7E6] text-[#FF7D00] hover:bg-[#FFF7E6] border-0'
        >
          中风险
        </Badge>
      );
    }
    return (
      <Badge
        variant='secondary'
        className='bg-[#E8FFEA] text-[#00B42A] hover:bg-[#E8FFEA] border-0'
      >
        低风险
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'pending' || status === 'PENDING') {
      return (
        <Badge
          variant='secondary'
          className='bg-[#FFF7E6] text-[#FF7D00] hover:bg-[#FFF7E6] border-0'
        >
          待审核
        </Badge>
      );
    }
    if (status === 'approved' || status === 'APPROVED') {
      return (
        <Badge
          variant='secondary'
          className='bg-[#E8FFEA] text-[#00B42A] hover:bg-[#E8FFEA] border-0'
        >
          已通过
        </Badge>
      );
    }
    return (
      <Badge
        variant='secondary'
        className='bg-[#FFF1F0] text-[#F53F3F] hover:bg-[#FFF1F0] border-0'
      >
        已驳回
      </Badge>
    );
  };

  return (
    <>
      <ContentReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        onApprove={approve}
        onReject={reject}
        content={reviewingItem ? {
          id: reviewingItem.id,
          title: reviewingItem.content?.title || reviewingItem.title,
          platform: reviewingItem.platform,
          submitTime: reviewingItem.submittedAt,
        } : undefined}
      />
      <StudioLayout>
        <PageContainer className='p-0 gap-0'>
          <div className='flex min-h-screen'>
            <div className='flex-1 p-4 md:p-6'>
              <div className='mb-6'>
                <div className='text-xs text-[#86909C] mb-2 flex items-center gap-2'>
                  <span>审核中心</span>
                  <span>/</span>
                  <span className='text-[#4E5969]'>内容审核</span>
                </div>
                <PageHeader
                  title='审核中心'
                  description='对 AI 生成内容进行统一审核管理，确保内容质量与合规性'
                />
              </div>

              <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6'>
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className='studio-stat-card flex items-start justify-between cursor-pointer'
                    >
                      <div>
                        <div className='studio-stat-label'>{stat.label}</div>
                        <div className='studio-stat-value mt-2'>
                          {stat.value}
                        </div>
                        <div className='studio-stat-hint flex items-center gap-1'>
                          <span>较昨日</span>
                          <span className='text-[#F53F3F] font-medium'>
                            {stat.delta}
                          </span>
                        </div>
                      </div>
                      <div
                        className='studio-stat-icon rounded-lg'
                        style={{ backgroundColor: stat.iconBg }}
                      >
                        <Icon
                          className='size-6'
                          style={{ color: stat.iconColor }}
                        />
                      </div>
                      <ChevronRight className='absolute right-3 top-1/2 -translate-y-1/2 size-4 text-[#C9CDD4]' />
                    </div>
                  );
                })}
              </div>

              <div className='bg-white rounded-xl shadow-sm border border-[#EEF0F5]'>
                <div className='border-b border-[#E5E8EF] px-5 pt-5'>
                  <div className='flex items-center gap-4 mb-4 overflow-x-auto pb-1'>
                    {tabs.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTab(t.value)}
                        className={`flex items-center gap-1.5 pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                          tab === t.value
                            ? 'border-[#1664FF] text-[#1664FF]'
                            : 'border-transparent text-[#86909C] hover:text-[#4E5969]'
                        }`}
                      >
                        {t.label}
                        <span
                          className={`text-xs ${
                            tab === t.value ? 'text-[#1664FF]/80' : 'text-[#A9AEB8]'
                          }`}
                        >
                          {t.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className='flex flex-wrap items-center gap-3 pb-4'>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-[#86909C] min-w-[48px]'>
                        平台
                      </span>
                      <Select defaultValue='all'>
                        <SelectTrigger size='sm' className='w-28 h-8 text-xs'>
                          <SelectValue placeholder='全部平台' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='all'>全部平台</SelectItem>
                          <SelectItem value='weixin'>微信公众号</SelectItem>
                          <SelectItem value='xiaohongshu'>小红书</SelectItem>
                          <SelectItem value='douyin'>抖音</SelectItem>
                          <SelectItem value='zhihu'>知乎</SelectItem>
                          <SelectItem value='bilibili'>B站</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-[#86909C] min-w-[48px]'>
                        账号
                      </span>
                      <Select defaultValue='all'>
                        <SelectTrigger size='sm' className='w-28 h-8 text-xs'>
                          <SelectValue placeholder='全部账号' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='all'>全部账号</SelectItem>
                          <SelectItem value='account1'>品牌增长研究所</SelectItem>
                          <SelectItem value='account2'>时尚穿搭研究所</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-[#86909C] min-w-[60px]'>
                        审核类型
                      </span>
                      <Select defaultValue='all'>
                        <SelectTrigger size='sm' className='w-28 h-8 text-xs'>
                          <SelectValue placeholder='全部类型' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='all'>全部类型</SelectItem>
                          <SelectItem value='content'>内容合规</SelectItem>
                          <SelectItem value='marketing'>营销合规</SelectItem>
                          <SelectItem value='image'>图片审核</SelectItem>
                          <SelectItem value='copyright'>版权审核</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-[#86909C] min-w-[60px]'>
                        风险等级
                      </span>
                      <Select defaultValue='all'>
                        <SelectTrigger size='sm' className='w-28 h-8 text-xs'>
                          <SelectValue placeholder='全部风险' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='all'>全部风险</SelectItem>
                          <SelectItem value='high'>高风险</SelectItem>
                          <SelectItem value='medium'>中风险</SelectItem>
                          <SelectItem value='low'>低风险</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='flex items-center gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-8 text-xs bg-white border-[#E5E8EF] text-[#4E5969] hover:bg-[#F5F7FA]'
                      >
                        <Calendar className='size-3.5 mr-1' />
                        开始日期 - 结束日期
                      </Button>
                    </div>

                    <div className='flex items-center gap-2 ml-auto'>
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-8 text-xs bg-white border-[#E5E8EF] text-[#4E5969] hover:bg-[#F5F7FA]'
                      >
                        <RotateCcw className='size-3.5 mr-1' />
                        重置
                      </Button>
                      <Button
                        size='sm'
                        className='h-8 text-xs bg-[#1664FF] hover:bg-[#1664FF]/90'
                      >
                        <Search className='size-3.5 mr-1' />
                        筛选
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-8 text-xs bg-white border-[#E5E8EF] text-[#4E5969] hover:bg-[#F5F7FA]'
                      >
                        展开
                      </Button>
                    </div>
                  </div>
                </div>

                <div className='p-5'>
                  <Table>
                    <TableHeader>
                      <TableRow className='hover:bg-transparent border-[#E5E8EF]'>
                        <TableHead className='w-10 py-3'>
                          <input
                            type='checkbox'
                            className='size-4 rounded border-[#C9CDD4] text-[#1664FF] focus:ring-[#1664FF]'
                          />
                        </TableHead>
                        <TableHead className='text-xs text-[#86909C] font-normal py-3'>
                          内容标题
                        </TableHead>
                        <TableHead className='text-xs text-[#86909C] font-normal py-3'>
                          平台
                        </TableHead>
                        <TableHead className='text-xs text-[#86909C] font-normal py-3'>
                          目标账号
                        </TableHead>
                        <TableHead className='text-xs text-[#86909C] font-normal py-3'>
                          审核类型
                        </TableHead>
                        <TableHead className='text-xs text-[#86909C] font-normal py-3'>
                          风险等级
                        </TableHead>
                        <TableHead className='text-xs text-[#86909C] font-normal py-3'>
                          提交时间
                        </TableHead>
                        <TableHead className='text-xs text-[#86909C] font-normal py-3'>
                          提交人来源
                        </TableHead>
                        <TableHead className='text-xs text-[#86909C] font-normal py-3'>
                          状态
                        </TableHead>
                        <TableHead className='text-xs text-[#86909C] font-normal py-3 text-right'>
                          操作
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className='py-8 text-center text-[#86909C]'>
                            暂无待审核内容
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => {
                          const isPending = item.status === 'pending' || item.status === 'PENDING';
                          return (
                            <TableRow
                              key={item.id}
                              className='hover:bg-[#F7F8FA] border-[#E5E8EF] group'
                            >
                              <TableCell className='py-3'>
                                <input
                                  type='checkbox'
                                  className='size-4 rounded border-[#C9CDD4] text-[#1664FF] focus:ring-[#1664FF]'
                                />
                              </TableCell>
                              <TableCell className='py-3'>
                                <Link
                                  href={`/reviews/${item.id}`}
                                  className='text-sm font-medium text-[#1D2129] hover:text-[#1664FF] hover:underline max-w-[260px] truncate block'
                                >
                                  {item.content?.title || item.title}
                                </Link>
                              </TableCell>
                              <TableCell className='py-3'>
                                <PlatformBadge platform={item.platform} />
                              </TableCell>
                              <TableCell className='py-3 text-sm text-[#4E5969]'>
                                {item.account || '-'}
                              </TableCell>
                              <TableCell className='py-3'>
                                <Badge
                                  variant='secondary'
                                  className='bg-[#F2F5FA] text-[#4E5969] hover:bg-[#F2F5FA] border-0'
                                >
                                  {item.reviewType || '内容合规'}
                                </Badge>
                              </TableCell>
                              <TableCell className='py-3'>
                                {getRiskBadge(item.riskLevel || 'low')}
                              </TableCell>
                              <TableCell className='py-3 text-sm text-[#86909C]'>
                                {item.submittedAt}
                              </TableCell>
                              <TableCell className='py-3 text-sm text-[#86909C]'>
                                {item.source || 'Agent生成'}
                              </TableCell>
                              <TableCell className='py-3'>
                                {getStatusBadge(item.status)}
                              </TableCell>
                              <TableCell className='py-3 text-right'>
                                <div className='flex items-center justify-end gap-3'>
                                  {isPending ? (
                                    <>
                                      <button
                                        type='button'
                                        onClick={() => handleReview(item)}
                                        className='text-sm text-[#1664FF] hover:underline font-medium'
                                      >
                                        审核
                                      </button>
                                      <Link
                                        href={`/reviews/${item.id}`}
                                        className='text-sm text-[#4E5969] hover:text-[#1664FF]'
                                      >
                                        详情
                                      </Link>
                                    </>
                                  ) : (
                                    <Link
                                      href={`/reviews/${item.id}`}
                                      className='text-sm text-[#4E5969] hover:text-[#1664FF]'
                                    >
                                      查看
                                    </Link>
                                  )}
                                  <Link
                                    href={`/reviews/${item.id}`}
                                    className='text-[#86909C] hover:text-[#4E5969] opacity-0 group-hover:opacity-100 transition-opacity'
                                  >
                                    <MoreHorizontal className='size-4' />
                                  </Link>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>

                  <div className='flex items-center justify-between mt-6'>
                    <div className='text-sm text-[#86909C]'>共 {items.length} 条</div>
                    <div className='flex items-center gap-2'>
                      <Select defaultValue='10'>
                        <SelectTrigger size='sm' className='w-20 h-8 text-xs'>
                          <SelectValue placeholder='10条/页' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='10'>10条/页</SelectItem>
                          <SelectItem value='20'>20条/页</SelectItem>
                          <SelectItem value='50'>50条/页</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className='flex items-center gap-1'>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-8 w-8 p-0 bg-white border-[#E5E8EF]'
                          disabled
                        >
                          <ChevronLeft className='size-4 text-[#C9CDD4]' />
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-8 w-8 p-0 bg-[#1664FF] border-[#1664FF] text-white hover:bg-[#1664FF] hover:text-white'
                        >
                          1
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-8 w-8 p-0 bg-white border-[#E5E8EF] text-[#4E5969] hover:bg-[#F5F7FA]'
                        >
                          2
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-8 w-8 p-0 bg-white border-[#E5E8EF] text-[#4E5969] hover:bg-[#F5F7FA]'
                        >
                          3
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-8 w-8 p-0 bg-white border-[#E5E8EF] text-[#4E5969] hover:bg-[#F5F7FA]'
                        >
                          4
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-8 w-8 p-0 bg-white border-[#E5E8EF] text-[#4E5969] hover:bg-[#F5F7FA]'
                        >
                          5
                        </Button>
                        <span className='text-[#C9CDD4] px-1'>…</span>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-8 w-8 p-0 bg-white border-[#E5E8EF] text-[#4E5969] hover:bg-[#F5F7FA]'
                        >
                          26
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          className='h-8 w-8 p-0 bg-white border-[#E5E8EF] text-[#4E5969] hover:bg-[#F5F7FA]'
                        >
                          <ChevronRight className='size-4' />
                        </Button>
                      </div>
                      <div className='flex items-center gap-2 ml-2'>
                        <span className='text-xs text-[#86909C]'>跳至</span>
                        <Select defaultValue='1'>
                          <SelectTrigger size='sm' className='w-16 h-8 text-xs'>
                            <SelectValue placeholder='1' />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 26 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className='text-xs text-[#86909C]'>页</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='w-64 border-l border-[#E5E8EF] bg-white p-5 hidden xl:block'>
              <div className='space-y-6'>
                <div>
                  <h4 className='text-sm font-medium text-[#1D2129] mb-4'>
                    风险分布
                  </h4>
                  <div className='flex flex-col items-center'>
                    <div className='relative w-28 h-28 mb-4'>
                      <svg viewBox='0 0 100 100' className='w-full h-full'>
                        <circle
                          cx='50'
                          cy='50'
                          r='45'
                          fill='none'
                          stroke='#F2F3F5'
                          strokeWidth='12'
                        />
                        <circle
                          cx='50'
                          cy='50'
                          r='45'
                          fill='none'
                          stroke='#F53F3F'
                          strokeWidth='12'
                          strokeDasharray='13 270'
                          strokeDashoffset='0'
                          transform='rotate(-90 50 50)'
                        />
                        <circle
                          cx='50'
                          cy='50'
                          r='45'
                          fill='none'
                          stroke='#FF7D00'
                          strokeWidth='12'
                          strokeDasharray='76 207'
                          strokeDashoffset='-13'
                          transform='rotate(-90 50 50)'
                        />
                        <circle
                          cx='50'
                          cy='50'
                          r='45'
                          fill='none'
                          stroke='#00B42A'
                          strokeWidth='12'
                          strokeDasharray='196 87'
                          strokeDashoffset='-89'
                          transform='rotate(-90 50 50)'
                        />
                      </svg>
                      <div className='absolute inset-0 flex flex-col items-center justify-center'>
                        <div className='text-2xl font-bold text-[#1D2129]'>
                          260
                        </div>
                        <div className='text-xs text-[#86909C]'>总数</div>
                      </div>
                    </div>
                    <div className='w-full space-y-2'>
                      {riskDistribution.items.map((item) => (
                        <div
                          key={item.label}
                          className='flex items-center justify-between text-xs'
                        >
                          <div className='flex items-center gap-2'>
                            <span
                              className='size-2 rounded-full'
                              style={{ backgroundColor: item.color }}
                            />
                            <span className='text-[#86909C]'>{item.label}</span>
                          </div>
                          <span className='text-[#4E5969] font-medium'>
                            {item.value} ({item.percent}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className='border-t border-[#E5E8EF] pt-6'>
                  <h4 className='text-sm font-medium text-[#1D2129] mb-4'>
                    审核类型分布
                  </h4>
                  <div className='space-y-3'>
                    {reviewTypeDistribution.map((item) => (
                      <div key={item.label} className='space-y-1'>
                        <div className='flex items-center justify-between text-xs'>
                          <div className='flex items-center gap-2'>
                            <span className='size-2 rounded-full bg-[#1664FF] opacity-60' />
                            <span className='text-[#86909C]'>{item.label}</span>
                          </div>
                          <span className='text-[#4E5969] font-medium'>
                            {item.value} ({item.percent}%)
                          </span>
                        </div>
                        <div className='h-1.5 bg-[#F2F3F5] rounded-full overflow-hidden'>
                          <div
                            className='h-full bg-[#1664FF] rounded-full transition-all'
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className='border-t border-[#E5E8EF] pt-6'>
                  <h4 className='text-sm font-medium text-[#1D2129] mb-4'>
                    平台分布
                  </h4>
                  <div className='space-y-3'>
                    {platformDistribution.map((item) => (
                      <div key={item.label} className='space-y-1'>
                        <div className='flex items-center justify-between text-xs'>
                          <div className='flex items-center gap-2'>
                            <span className='size-2 rounded-full bg-[#00B42A] opacity-60' />
                            <span className='text-[#86909C]'>{item.label}</span>
                          </div>
                          <span className='text-[#4E5969] font-medium'>
                            {item.value} ({item.percent}%)
                          </span>
                        </div>
                        <div className='h-1.5 bg-[#F2F3F5] rounded-full overflow-hidden'>
                          <div
                            className='h-full bg-[#00B42A] rounded-full transition-all'
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PageContainer>
      </StudioLayout>
    </>
  );
}
