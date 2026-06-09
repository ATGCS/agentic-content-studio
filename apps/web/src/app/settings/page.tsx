'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Bell,
  ChevronRight,
  Database,
  KeyRound,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { StudioCard } from '@/components/studio/studio-card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type ImaConfig = {
  clientId: string;
  hasApiKey: boolean;
  baseUrl: string;
  configured: boolean;
};

type KnowledgeBase = {
  id: string;
  enabled: boolean;
  isDefault: boolean;
};

const settingCards = [
  {
    title: 'IMA 知识库配置',
    description: '配置 IMA OpenAPI、同步知识库与文档到本地并设置默认知识库',
    href: '/settings/ima',
    icon: Database,
    status: '已接入',
    enabled: true,
  },
  {
    title: '平台账号授权',
    description: '管理内容发布账号授权、账号画像与平台能力',
    href: '/accounts',
    icon: KeyRound,
    status: '已接入',
    enabled: true,
  },
  {
    title: '审核与发布策略',
    description: '审核规则、发布窗口、失败重试等策略配置',
    href: '/reviews',
    icon: ShieldCheck,
    status: '已接入',
    enabled: true,
  },
  {
    title: '系统通知',
    description: '站内通知、邮件通知、Webhook 回调配置',
    href: '/settings',
    icon: Bell,
    status: '规划中',
    enabled: false,
  },
];

function StatusPill({ ready }: { ready: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        ready ? 'bg-[#E8FFEA] text-[#00B42A]' : 'bg-[#FFF7E6] text-[#FF7D00]'
      )}
    >
      {ready ? '可用' : '待配置'}
    </span>
  );
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ImaConfig | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true);
    try {
      const [configRes, knowledgeRes] = await Promise.all([
        api<ImaConfig>('/api/ima/config'),
        api<KnowledgeBase[]>('/api/ima/knowledge-bases'),
      ]);
      setConfig(configRes.data);
      setKnowledgeBases(knowledgeRes.data);
      setLoadError(null);
    } catch (error) {
      console.error(error);
      setLoadError('设置状态加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings().catch(console.error);
  }, []);

  async function syncKnowledgeBases() {
    setSyncing(true);
    try {
      await api('/api/ima/knowledge-bases/sync', { method: 'POST' });
      await loadSettings();
    } finally {
      setSyncing(false);
    }
  }

  const enabledKnowledgeBases = knowledgeBases.filter(
    (item) => item.enabled
  ).length;
  const defaultKnowledgeBase = knowledgeBases.some((item) => item.isDefault);

  return (
    <StudioLayout>
      <PageContainer className="max-w-none gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <Button variant="outline" onClick={loadSettings} disabled={loading}>
            <RefreshCw className={cn('size-4', loading && 'animate-spin')} />
            刷新状态
          </Button>
        </div>

        {loadError && (
          <StudioCard contentClassName="p-4">
            <p className="text-sm text-[#F53F3F]">{loadError}</p>
          </StudioCard>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <StudioCard contentClassName="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#1D2129]">
                IMA 配置
              </span>
              <StatusPill ready={Boolean(config?.configured)} />
            </div>
            <p className="text-2xl font-bold text-[#1D2129]">
              {loading ? '加载中…' : config?.configured ? '已配置' : '未配置'}
            </p>
            <p className="mt-2 text-xs text-[#86909C]">
              {config?.baseUrl ?? '未读取到 Base URL'}
            </p>
          </StudioCard>
          <StudioCard contentClassName="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#1D2129]">
                知识库
              </span>
              <StatusPill ready={enabledKnowledgeBases > 0} />
            </div>
            <p className="text-2xl font-bold text-[#1D2129]">
              {enabledKnowledgeBases}
            </p>
            <p className="mt-2 text-xs text-[#86909C]">
              共 {knowledgeBases.length} 个知识库，
              {defaultKnowledgeBase ? '已设置默认知识库' : '未设置默认知识库'}
            </p>
          </StudioCard>
          <StudioCard contentClassName="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#1D2129]">
                凭证状态
              </span>
              <StatusPill ready={Boolean(config?.hasApiKey)} />
            </div>
            <p className="text-2xl font-bold text-[#1D2129]">
              {config?.hasApiKey ? '已保存' : '未保存'}
            </p>
            <p className="mt-2 text-xs text-[#86909C]">
              API Key 不会在前端明文回显
            </p>
          </StudioCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <StudioCard contentClassName="p-0">
            <div className="border-b border-[#EEF0F5] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#1D2129]">设置入口</h2>
            </div>
            <div className="divide-y divide-[#EEF0F5]">
              {settingCards.map((item) => {
                const Icon = item.icon;
                const content = (
                  <div className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[#F7F8FA]">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-[#F0F5FF] text-[#1664FF]">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-[#1D2129]">
                            {item.title}
                          </h3>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[11px]',
                              item.enabled
                                ? 'bg-[#E8FFEA] text-[#00B42A]'
                                : 'bg-[#F2F3F5] text-[#86909C]'
                            )}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-[#86909C]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-[#C9CDD4]" />
                  </div>
                );

                return item.enabled ? (
                  <Link key={item.title} href={item.href}>
                    {content}
                  </Link>
                ) : (
                  <div key={item.title} className="opacity-70">
                    {content}
                  </div>
                );
              })}
            </div>
          </StudioCard>

          <StudioCard contentClassName="p-5">
            <h2 className="text-sm font-semibold text-[#1D2129]">快捷操作</h2>
            <div className="mt-4 space-y-3">
              <Button
                className="w-full justify-start bg-[#1664FF] text-white hover:bg-[#0E52D9]"
                onClick={syncKnowledgeBases}
                isLoading={syncing}
              >
                <RefreshCw className="size-4" />
                同步到本地
              </Button>
              <Link href="/settings/ima" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Database className="size-4" />
                  打开 IMA 配置
                </Button>
              </Link>
              <Link href="/accounts" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <KeyRound className="size-4" />
                  管理平台账号
                </Button>
              </Link>
            </div>
            <div className="mt-5 rounded-lg bg-[#F7F8FA] p-3 text-xs leading-5 text-[#86909C]">
              API
              Key、Webhook、通知等系统级配置尚未有稳定后端接口，因此这里只保留状态说明，不提供假操作入口。
            </div>
          </StudioCard>
        </div>
      </PageContainer>
    </StudioLayout>
  );
}
