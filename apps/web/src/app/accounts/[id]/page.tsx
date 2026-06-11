'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Bot,
  RefreshCw,
  Save,
  User,
  X,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { PlatformBadge } from '@/components/studio/platform-badge';
import { StatusBadge } from '@/components/studio/status-badge';
import { StudioCard } from '@/components/studio/studio-card';
import { StudioTabs } from '@/components/studio/studio-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { navigateToAuthorization } from '@/lib/oauth';

type AccountDetail = {
  id: string;
  accountName: string;
  platform: string;
  authStatus: string;
  externalAccountId?: string | null;
  avatarUrl?: string | null;
  scopes?: unknown;
  lastSyncAt?: string | null;
  lastError?: string | null;
  boundAt?: string | null;
  revokedAt?: string | null;
  accountType?: string;
  owner?: { name: string } | null;
  token?: { expiresAt?: string; scopes?: unknown; updatedAt?: string } | null;
  socialWorks?: Array<{
    id: string;
    platformWorkId: string;
    workType?: string;
    title?: string;
    url?: string;
    publishedAt?: string;
    status?: string;
  }>;
  recentMetrics?: Array<{
    id: string;
    workId?: string;
    metrics: Record<string, unknown>;
    collectedAt: string;
  }>;
  workCount?: number;
};

type AccountProfile = {
  targetAudience?: string;
  tone?: string;
  titlePreference?: string;
  coverPreference?: string;
  forbiddenExpressions?: string;
  positioning?: string;
  contentStyle?: string;
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

export default function AccountDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [profile, setProfile] = useState<AccountProfile>({});
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncingMetrics, setSyncingMetrics] = useState(false);
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

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api<AccountDetail>(`/api/accounts/${id}`),
      api<AccountProfile>(`/api/account-profiles?accountId=${id}`).catch(
        () => ({ data: {} })
      ),
    ])
      .then(([a, p]) => {
        setAccount(a.data);
        setProfile(p.data ?? {});
      })
      .catch((err) => {
        console.error(err);
        setAccount(null);
        setError('账号不存在或已被删除');
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function saveProfile() {
    setSaving(true);
    try {
      await api(`/api/account-profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
      notify('success', '画像保存成功');
    } catch {
      notify('error', '画像保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  async function syncWorks() {
    setSyncing(true);
    try {
      await api(`/api/accounts/${id}/sync-works`, { method: 'POST' });
      const res = await api<AccountDetail>(`/api/accounts/${id}`);
      setAccount(res.data);
      notify('success', '同步作品成功');
    } catch {
      notify('error', '同步作品失败，请确认账号已授权');
    } finally {
      setSyncing(false);
    }
  }

  async function syncMetrics() {
    setSyncingMetrics(true);
    try {
      await api(`/api/accounts/${id}/sync-metrics`, { method: 'POST' });
      const res = await api<AccountDetail>(`/api/accounts/${id}`);
      setAccount(res.data);
      notify('success', '同步指标成功');
    } catch {
      notify('error', '同步指标失败，请确认账号已授权且有作品数据');
    } finally {
      setSyncingMetrics(false);
    }
  }

  async function reauthorize() {
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
    } catch {
      notify('error', '重新授权失败，请稍后重试');
    }
  }

  if (loading) {
    return (
      <StudioLayout>
        <PageContainer>
          <p className="text-sm text-[#86909c]">加载中…</p>
        </PageContainer>
      </StudioLayout>
    );
  }

  if (error || !account) {
    return (
      <StudioLayout>
        <PageContainer>
          <StudioCard contentClassName="p-6 text-center">
            <h2 className="text-base font-semibold text-[#1D2129]">
              账号不可用
            </h2>
            <p className="mt-2 text-sm text-[#86909c]">
              {error ?? '账号不存在或已被删除'}
            </p>
            <Button className="mt-4" onClick={() => router.push('/accounts')}>
              返回账号列表
            </Button>
          </StudioCard>
        </PageContainer>
      </StudioLayout>
    );
  }

  const tabs = [
    { value: 'profile', label: '账号定位' },
    { value: 'style', label: '内容风格' },
    { value: 'works', label: '作品列表' },
    { value: 'knowledge', label: '知识库绑定' },
  ];

  const isZhihu = account.platform === 'ZHIHU';

  return (
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
        <div className="mb-2">
          <Link
            href="/accounts"
            className="inline-flex items-center gap-1 text-sm text-[#86909c] hover:text-[#1664ff]"
          >
            <ArrowLeft className="size-4" />
            返回账号列表
          </Link>
        </div>

        {/* 账号信息头 */}
        <div className="flex items-center gap-4 rounded-xl border border-[#e5e8ef] bg-white p-5">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[#f0f5ff] text-[#1664ff]">
            <User className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-[#1D2129]">
                {account.accountName}
              </h2>
              <PlatformBadge platform={account.platform} />
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-[#86909c]">
              <span>授权状态：</span>
              <StatusBadge status={account.authStatus} />
              {account.owner && (
                <>
                  <span>·</span>
                  <span>负责人：{account.owner.name}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isZhihu && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={syncing}
                  onClick={syncWorks}
                >
                  <RefreshCw
                    className={`size-4 ${syncing ? 'animate-spin' : ''}`}
                  />
                  {syncing ? '同步中...' : '同步作品'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={syncingMetrics}
                  onClick={syncMetrics}
                >
                  <RefreshCw
                    className={`size-4 ${syncingMetrics ? 'animate-spin' : ''}`}
                  />
                  {syncingMetrics ? '同步中...' : '同步指标'}
                </Button>
              </>
            )}
            {isZhihu && (
              <p className="text-xs text-[#FF7D00]">
                知乎暂不支持自动同步，数据需手动导入
              </p>
            )}
            {account.platform === 'WECHAT' &&
              !isZhihu &&
              account.accountType?.includes('订阅号') && (
                <p className="text-xs text-[#86909C]">
                  个人订阅号暂不支持数据查询
                  API。如需完整的数据同步功能，请将公众号认证为企业/组织类型。
                </p>
              )}
            {(account.authStatus === 'need_reauth' ||
              account.authStatus === 'token_expired') && (
              <Button size="sm" onClick={reauthorize}>
                重新授权
              </Button>
            )}
          </div>
        </div>

        {isZhihu && (
          <StudioCard contentClassName="p-4">
            <p className="text-sm text-[#FF7D00]">
              知乎暂不支持官方自动同步，请使用手动导入或录入作品链接。
            </p>
          </StudioCard>
        )}

        {/* 授权信息 */}
        <StudioCard contentClassName="p-5">
          <h3 className="mb-3 text-sm font-semibold text-[#1D2129]">
            授权信息
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-3">
            {account.externalAccountId && (
              <div>
                <span className="text-[#86909c]">外部账号 ID：</span>
                <span className="text-[#1D2129]">
                  {account.externalAccountId}
                </span>
              </div>
            )}
            {account.boundAt && (
              <div>
                <span className="text-[#86909c]">绑定时间：</span>
                <span className="text-[#1D2129]">
                  {new Date(account.boundAt).toLocaleString('zh-CN')}
                </span>
              </div>
            )}
            {account.lastSyncAt && (
              <div>
                <span className="text-[#86909c]">最近同步：</span>
                <span className="text-[#1D2129]">
                  {new Date(account.lastSyncAt).toLocaleString('zh-CN')}
                </span>
              </div>
            )}
            {account.token?.expiresAt && (
              <div>
                <span className="text-[#86909c]">Token 到期：</span>
                <span className="text-[#1D2129]">
                  {new Date(account.token.expiresAt).toLocaleString('zh-CN')}
                </span>
              </div>
            )}
            {account.workCount !== undefined && (
              <div>
                <span className="text-[#86909c]">作品数：</span>
                <span className="text-[#1D2129]">{account.workCount}</span>
              </div>
            )}
            {account.lastError && (
              <div>
                <span className="text-[#86909c]">最近错误：</span>
                <span className="text-[#F53F3F]">{account.lastError}</span>
              </div>
            )}
          </div>
        </StudioCard>

        <StudioTabs items={tabs} value={tab} onChange={setTab} />

        {tab === 'profile' && (
          <StudioCard contentClassName="space-y-4 p-5">
            <h3 className="text-sm font-semibold text-[#1D2129]">账号定位</h3>
            <div className="space-y-2">
              <Label className="text-xs text-[#86909c]">目标用户</Label>
              <Input
                value={profile.targetAudience ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, targetAudience: e.target.value }))
                }
                className="studio-input"
                placeholder="描述目标受众群体"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#86909c]">账号定位</Label>
              <Textarea
                value={profile.positioning ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, positioning: e.target.value }))
                }
                rows={3}
                className="studio-input resize-none"
                placeholder="描述账号定位、核心价值"
              />
            </div>
            <Button onClick={saveProfile} disabled={saving}>
              <Save className="size-4" />
              {saving ? '保存中…' : '保存画像'}
            </Button>
          </StudioCard>
        )}

        {tab === 'style' && (
          <StudioCard contentClassName="space-y-4 p-5">
            <h3 className="text-sm font-semibold text-[#1D2129]">内容风格</h3>
            <div className="space-y-2">
              <Label className="text-xs text-[#86909c]">语气风格</Label>
              <Input
                value={profile.tone ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, tone: e.target.value }))
                }
                className="studio-input"
                placeholder="如：专业、亲和、幽默"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#86909c]">标题偏好</Label>
              <Input
                value={profile.titlePreference ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, titlePreference: e.target.value }))
                }
                className="studio-input"
                placeholder="如：数字开头、悬念式"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#86909c]">封面偏好</Label>
              <Input
                value={profile.coverPreference ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, coverPreference: e.target.value }))
                }
                className="studio-input"
                placeholder="如：纯色背景、产品实拍"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-[#86909c]">禁用表达</Label>
              <Textarea
                value={profile.forbiddenExpressions ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    forbiddenExpressions: e.target.value,
                  }))
                }
                rows={3}
                className="studio-input resize-none"
                placeholder="禁止使用的词语或表达方式"
              />
            </div>
            <Button onClick={saveProfile} disabled={saving}>
              <Save className="size-4" />
              {saving ? '保存中…' : '保存风格'}
            </Button>
          </StudioCard>
        )}

        {tab === 'works' && (
          <StudioCard contentClassName="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1D2129]">作品列表</h3>
              <span className="text-xs text-[#86909c]">
                共 {account.socialWorks?.length ?? 0} 个作品
              </span>
            </div>
            {isZhihu ? (
              <p className="text-sm text-[#86909c]">
                知乎暂不支持自动同步作品，请手动录入或导入。
              </p>
            ) : !account.socialWorks || account.socialWorks.length === 0 ? (
              <p className="text-sm text-[#86909c]">
                暂无作品，点击同步作品拉取数据
              </p>
            ) : (
              <div className="space-y-3">
                {account.socialWorks.map((work) => {
                  const metric = account.recentMetrics?.find(
                    (m) => m.workId === work.id
                  );
                  return (
                    <div
                      key={work.id}
                      className="rounded-lg border border-[#e5e8ef] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-[#E8F3FF] px-1.5 py-0.5 text-[10px] text-[#1664FF]">
                              {work.workType ?? 'unknown'}
                            </span>
                            {work.status && (
                              <span className="text-[10px] text-[#86909c]">
                                {work.status}
                              </span>
                            )}
                          </div>
                          <h4 className="mt-1 text-sm font-medium text-[#1D2129]">
                            {work.title ?? '无标题'}
                          </h4>
                          {work.url && (
                            <a
                              href={work.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 text-[11px] text-[#1664FF] hover:underline"
                            >
                              查看原文
                            </a>
                          )}
                          {work.publishedAt && (
                            <p className="mt-1 text-[11px] text-[#86909c]">
                              发布时间：
                              {new Date(work.publishedAt).toLocaleString(
                                'zh-CN'
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      {metric && (
                        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#F2F3F5] pt-3 text-[11px]">
                          {(metric.metrics.playCount ??
                            metric.metrics.readCount ??
                            metric.metrics.viewCount) != null && (
                            <div>
                              <span className="text-[#86909c]">
                                播放/阅读：
                              </span>
                              <span className="font-medium text-[#1D2129]">
                                {
                                  (metric.metrics.playCount ??
                                    metric.metrics.readCount ??
                                    metric.metrics.viewCount) as number
                                }
                              </span>
                            </div>
                          )}
                          {metric.metrics.likeCount != null && (
                            <div>
                              <span className="text-[#86909c]">点赞：</span>
                              <span className="font-medium text-[#1D2129]">
                                {metric.metrics.likeCount as number}
                              </span>
                            </div>
                          )}
                          {metric.metrics.commentCount != null && (
                            <div>
                              <span className="text-[#86909c]">评论：</span>
                              <span className="font-medium text-[#1D2129]">
                                {metric.metrics.commentCount as number}
                              </span>
                            </div>
                          )}
                          {metric.metrics.shareCount != null && (
                            <div>
                              <span className="text-[#86909c]">分享：</span>
                              <span className="font-medium text-[#1D2129]">
                                {metric.metrics.shareCount as number}
                              </span>
                            </div>
                          )}
                          {(metric.metrics as Record<string, unknown>)
                            .coinCount != null && (
                            <div>
                              <span className="text-[#86909c]">投币：</span>
                              <span className="font-medium text-[#1D2129]">
                                {
                                  (metric.metrics as Record<string, unknown>)
                                    .coinCount as number
                                }
                              </span>
                            </div>
                          )}
                          {metric.metrics.favoriteCount != null && (
                            <div>
                              <span className="text-[#86909c]">收藏：</span>
                              <span className="font-medium text-[#1D2129]">
                                {metric.metrics.favoriteCount as number}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </StudioCard>
        )}

        {tab === 'knowledge' && (
          <StudioCard contentClassName="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-[#1664ff]" />
              <h3 className="text-sm font-semibold text-[#1D2129]">
                已绑定的知识库
              </h3>
            </div>
            <p className="text-sm text-[#86909c]">
              该功能需要先创建知识库条目，然后在账号画像中绑定可用知识库。
            </p>
            <Button variant="outline" asChild>
              <Link href="/settings/ima">
                <Bot className="size-4" />
                前往知识库管理
              </Link>
            </Button>
          </StudioCard>
        )}
      </PageContainer>
    </StudioLayout>
  );
}
