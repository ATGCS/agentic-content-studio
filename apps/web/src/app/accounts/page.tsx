'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PlatformLogoMark,
  platformIconMeta,
  type PlatformIconKey,
} from '@/components/platform-icon';
import { CreateAccountDialog } from '@/components/dialogs/create-account-dialog';
import { OAuthConfigDialog } from '@/components/dialogs/oauth-config-dialog';
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { StudioCard } from '@/components/studio/studio-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';
import { navigateToAuthorization } from '@/lib/oauth';
import { cn } from '@/lib/utils';

type AccountCard = {
  id: string;
  platform: PlatformIconKey;
  tag: string;
  name: string;
  code: string;
  owner: string;
  authStatus: string;
  accountType: string;
  externalAccountId?: string | null;
  avatarUrl?: string | null;
  scopes?: unknown;
  lastSyncAt?: string | null;
  lastError?: string | null;
  boundAt?: string | null;
  revokedAt?: string | null;
  health:
    | 'active'
    | 'authorizing'
    | 'expired'
    | 'need_reauth'
    | 'revoked'
    | 'error'
    | 'created';
};

type ApiAccount = {
  id: string;
  platform: string;
  accountName: string;
  accountType?: string | null;
  authStatus: string;
  externalAccountId?: string | null;
  avatarUrl?: string | null;
  scopes?: unknown;
  lastSyncAt?: string | null;
  lastError?: string | null;
  boundAt?: string | null;
  revokedAt?: string | null;
  owner?: { name?: string | null; email?: string | null } | null;
};

const platformMap: Record<string, PlatformIconKey> = {
  WECHAT: 'wechat',
  XIAOHONGSHU: 'xiaohongshu',
  DOUYIN: 'douyin',
  VIDEO_CHANNEL: 'shipinhao',
  BILIBILI: 'bilibili',
  ZHIHU: 'zhihu',
  KUAISHOU: 'kuaishou',
  OTHER: 'wechat',
};

const platformTagMap: Record<string, string> = {
  WECHAT: '公众号',
  XIAOHONGSHU: '小红书',
  DOUYIN: '抖音',
  VIDEO_CHANNEL: '视频号',
  BILIBILI: 'B站',
  ZHIHU: '知乎',
  KUAISHOU: '快手',
  OTHER: '其他',
};

const authStatusLabel: Record<string, string> = {
  active: '已授权',
  authorizing: '授权中',
  created: '未绑定',
  token_expired: 'Token 过期',
  need_reauth: '需重新授权',
  revoked: '已解绑',
  error: '授权错误',
  pending: '待授权',
};

function mapApiAccount(account: ApiAccount): AccountCard {
  return {
    id: account.id,
    platform: platformMap[account.platform] ?? 'wechat',
    tag: platformTagMap[account.platform] ?? account.platform,
    name: account.accountName,
    code: account.externalAccountId ?? account.id.slice(0, 8),
    owner: account.owner?.name ?? account.owner?.email ?? '未分配',
    authStatus: account.authStatus,
    accountType: account.accountType ?? '未设置',
    externalAccountId: account.externalAccountId,
    avatarUrl: account.avatarUrl,
    scopes: account.scopes,
    lastSyncAt: account.lastSyncAt,
    lastError: account.lastError,
    boundAt: account.boundAt,
    revokedAt: account.revokedAt,
    health: account.authStatus as AccountCard['health'],
  };
}

const statusStyles: Record<string, string> = {
  active: 'bg-[#E8FFEA] text-[#00B42A]',
  authorizing: 'bg-[#FFF7E6] text-[#FF7D00]',
  created: 'bg-[#F2F3F5] text-[#86909C]',
  token_expired: 'bg-[#FFF1F0] text-[#F53F3F]',
  need_reauth: 'bg-[#FFF7E6] text-[#FF7D00]',
  revoked: 'bg-[#F2F3F5] text-[#86909C]',
  error: 'bg-[#FFF1F0] text-[#F53F3F]',
  pending: 'bg-[#F2F3F5] text-[#86909C]',
};

function PlatformLogo({ platform }: { platform: PlatformIconKey }) {
  const meta = platformIconMeta[platform];

  return (
    <div
      className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl text-sm font-semibold shadow-sm"
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      <PlatformLogoMark platform={platform} size={meta.image ? 44 : 24} />
    </div>
  );
}

function AccountItem({
  account,
  onReauthorize,
}: {
  account: AccountCard;
  onReauthorize: (id: string) => void;
}) {
  const statusLabel = authStatusLabel[account.authStatus] ?? account.authStatus;

  return (
    <StudioCard
      contentClassName="p-4"
      className="border-[#EDF0F7] shadow-[0_8px_24px_rgba(29,33,41,0.04)]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link href={`/accounts/${account.id}`}>
            <PlatformLogo platform={account.platform} />
          </Link>
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded bg-[#E8F3FF] px-1.5 py-0.5 text-[10px] text-[#1664FF]">
                {account.tag}
              </span>
            </div>
            <Link
              href={`/accounts/${account.id}`}
              className="truncate text-sm font-semibold text-[#1D2129] hover:text-[#1664FF]"
            >
              {account.name}
            </Link>
            <div className="mt-1 text-[11px] text-[#4E5969]">
              外部 ID：{account.code}
            </div>
            <div className="mt-1 text-[11px] text-[#4E5969]">
              负责人：{account.owner}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link href={`/accounts/${account.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 rounded-md p-0 text-[#86909C]"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </Link>
          <span
            className={cn(
              'rounded px-2 py-0.5 text-[11px]',
              statusStyles[account.authStatus]
            )}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="space-y-3 text-[11px]">
        <div className="grid grid-cols-[64px_1fr] items-center gap-2">
          <span className="text-[#86909C]">账号类型</span>
          <span className="text-[#4E5969]">{account.accountType}</span>
        </div>
        {account.boundAt && (
          <div className="grid grid-cols-[64px_1fr] items-center gap-2">
            <span className="text-[#86909C]">绑定时间</span>
            <span className="text-[#4E5969]">
              {new Date(account.boundAt).toLocaleString('zh-CN')}
            </span>
          </div>
        )}
        {account.lastSyncAt && (
          <div className="grid grid-cols-[64px_1fr] items-center gap-2">
            <span className="text-[#86909C]">最近同步</span>
            <span className="text-[#4E5969]">
              {new Date(account.lastSyncAt).toLocaleString('zh-CN')}
            </span>
          </div>
        )}
        {account.lastError && (
          <div className="grid grid-cols-[64px_1fr] items-center gap-2">
            <span className="text-[#86909C]">最近错误</span>
            <span className="text-[#F53F3F]">{account.lastError}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#F2F3F5] pt-3 text-[11px]">
        {(account.authStatus === 'need_reauth' ||
          account.authStatus === 'token_expired') && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px]"
            onClick={() => onReauthorize(account.id)}
          >
            重新授权
          </Button>
        )}
        <span
          className={cn(
            'rounded-full px-2 py-0.5',
            statusStyles[account.authStatus]
          )}
        >
          {account.authStatus === 'active' ? '● 正常' : statusLabel}
        </span>
      </div>
    </StudioCard>
  );
}

export default function AccountsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [oauthConfigOpen, setOauthConfigOpen] = useState(false);
  const [accounts, setAccounts] = useState<AccountCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [notifications, setNotifications] = useState<
    { id: number; type: 'success' | 'error'; message: string }[]
  >([]);
  const notifIdRef = useRef(0);

  function notify(type: 'success' | 'error', message: string) {
    const id = ++notifIdRef.current;
    setNotifications((prev) => [...prev, { type, message, id }]);
    setTimeout(
      () => setNotifications((prev) => prev.filter((n) => n.id !== id)),
      3000
    );
  }

  // Pagination
  const totalPages = Math.ceil(accounts.length / pageSize) || 1;
  const paginatedAccounts = accounts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const pageRange = useMemo(() => {
    const maxVisible = 5;
    const start = Math.max(
      1,
      Math.min(
        currentPage - Math.floor(maxVisible / 2),
        totalPages - maxVisible + 1
      )
    );
    return Array.from(
      { length: Math.min(maxVisible, totalPages) },
      (_, i) => start + i
    );
  }, [currentPage, totalPages]);

  const loadAccounts = (
    platform?: string,
    authStatus?: string,
    search?: string
  ) => {
    const params = new URLSearchParams();
    if (platform && platform !== 'all-platforms')
      params.set('platform', platform);
    if (authStatus && authStatus !== 'all-auth')
      params.set('authStatus', authStatus);
    if (search) params.set('keyword', search);
    const qs = params.toString();
    api<ApiAccount[]>(`/api/accounts${qs ? '?' + qs : ''}`)
      .then((res) => {
        setAccounts(res.data.map(mapApiAccount));
        setLoadError(null);
      })
      .catch((error) => {
        console.error(error);
        setLoadError('账号加载失败，请稍后重试');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAccounts(platformFilter, statusFilter, keyword);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAccounts(platformFilter, statusFilter, keyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleReauthorize = async (id: string) => {
    try {
      const res = await api<{ authorizationUrl: string }>(
        `/api/accounts/${id}/reauthorize`,
        {
          method: 'POST',
        }
      );
      if (res.data?.authorizationUrl) {
        notify('success', '正在跳转授权页...');
        navigateToAuthorization(res.data.authorizationUrl);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '授权请求失败';
      notify('error', `重新授权失败：${msg}`);
    }
  };

  return (
    <>
      <CreateAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => loadAccounts(platformFilter, statusFilter)}
      />
      <OAuthConfigDialog
        open={oauthConfigOpen}
        onOpenChange={setOauthConfigOpen}
      />
      <StudioLayout>
        <PageContainer>
          {/* ---- notification bar ---- */}
          {notifications.length > 0 && (
            <div className="fixed right-6 top-6 z-50 flex flex-col gap-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${n.type === 'success' ? 'bg-[#00B42A] text-white' : 'bg-[#F53F3F] text-white'}`}
                >
                  <span>{n.message}</span>
                  <button
                    onClick={() =>
                      setNotifications((prev) =>
                        prev.filter((x) => x.id !== n.id)
                      )
                    }
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="h-9 bg-[#1664FF] px-5 text-xs text-white hover:bg-[#0E52D9]"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="size-4" />
                新增账号
              </Button>
              <Select
                defaultValue="all-platforms"
                onValueChange={(v) => {
                  const p = v === 'all-platforms' ? '' : v;
                  setPlatformFilter(p);
                  setCurrentPage(1);
                  loadAccounts(p, statusFilter);
                }}
              >
                <SelectTrigger className="h-9 w-[150px] bg-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-platforms">全部平台</SelectItem>
                  <SelectItem value="WECHAT">公众号</SelectItem>
                  <SelectItem value="XIAOHONGSHU">小红书</SelectItem>
                  <SelectItem value="DOUYIN">抖音</SelectItem>
                  <SelectItem value="KUAISHOU">快手</SelectItem>
                </SelectContent>
              </Select>
              <Select
                defaultValue="all-auth"
                onValueChange={(v) => {
                  setStatusFilter(v === 'all-auth' ? '' : v);
                  setCurrentPage(1);
                  loadAccounts(platformFilter, v === 'all-auth' ? '' : v);
                }}
              >
                <SelectTrigger className="h-9 w-[170px] bg-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-auth">全部授权状态</SelectItem>
                  <SelectItem value="active">已授权</SelectItem>
                  <SelectItem value="authorizing">授权中</SelectItem>
                  <SelectItem value="need_reauth">需重新授权</SelectItem>
                  <SelectItem value="token_expired">Token 过期</SelectItem>
                  <SelectItem value="revoked">已解绑</SelectItem>
                  <SelectItem value="error">授权错误</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="h-9 px-4 text-xs"
                onClick={() => {
                  setPlatformFilter('');
                  setStatusFilter('');
                  setCurrentPage(1);
                  loadAccounts();
                }}
              >
                重置
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#A9AEB8]" />
                <Input
                  className="h-9 w-[280px] rounded-lg border-[#E5E8EF] bg-white pl-9 text-xs"
                  placeholder="搜索账号名称、平台、负责人..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                className="h-9 gap-1 px-3 text-xs"
                onClick={() => setOauthConfigOpen(true)}
              >
                <KeyRound className="size-3.5" />
                OAuth 配置
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              <StudioCard contentClassName="p-5" className="border-[#EDF0F7]">
                <p className="text-xs text-[#86909C]">账号加载中…</p>
              </StudioCard>
            ) : loadError ? (
              <StudioCard contentClassName="p-5" className="border-[#EDF0F7]">
                <p className="text-xs text-[#F53F3F]">{loadError}</p>
              </StudioCard>
            ) : accounts.length === 0 ? (
              <StudioCard contentClassName="p-5" className="border-[#EDF0F7]">
                <p className="text-xs text-[#86909C]">
                  暂无账号，请先同步或新增平台账号
                </p>
              </StudioCard>
            ) : (
              paginatedAccounts.map((account) => (
                <AccountItem
                  key={account.id}
                  account={account}
                  onReauthorize={handleReauthorize}
                />
              ))
            )}
            <button
              type="button"
              onClick={() => setCreateDialogOpen(true)}
              className="min-h-[218px] rounded-xl border border-dashed border-[#C9D8FF] bg-white text-center transition-colors hover:bg-[#FAFBFF]"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F5FF] text-[#1664FF]">
                <Plus className="size-6" />
              </div>
              <div className="text-sm font-semibold text-[#1D2129]">
                新增平台账号
              </div>
              <div className="mt-2 text-xs leading-5 text-[#86909C]">
                支持快速授权
                <br />
                多平台管理
              </div>
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#4E5969]">
            <span>
              共 {accounts.length} 个账号，第 {currentPage}/{totalPages} 页
            </span>
            <div className="flex items-center gap-3">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[92px] bg-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12条/页</SelectItem>
                  <SelectItem value="24">24条/页</SelectItem>
                  <SelectItem value="48">48条/页</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              {pageRange.map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'h-8 w-8 p-0 text-xs',
                    page === currentPage &&
                      'bg-[#1664FF] text-white hover:bg-[#0E52D9]'
                  )}
                >
                  {page}
                </Button>
              ))}
              {pageRange[pageRange.length - 1] < totalPages && (
                <span className="px-1 text-[#86909C]">...</span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 text-xs"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
                下一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-4 text-xs"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                尾页
              </Button>
            </div>
          </div>
        </PageContainer>
      </StudioLayout>
    </>
  );
}
