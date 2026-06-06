'use client';

import { useEffect, useState } from 'react';
import { Database, RefreshCw, Save } from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import {
  PageContainer,
  PageHeader,
} from '@/components/layout/page-container';
import { StudioCard } from '@/components/studio/studio-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';

type ImaConfig = {
  clientId: string;
  apiKey: string;
  hasApiKey: boolean;
  baseUrl: string;
  useMock: boolean;
  configured: boolean;
};

type KnowledgeBase = {
  id: string;
  externalId: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  isDefault: boolean;
  syncedAt?: string | null;
};

export default function ImaSettingsPage() {
  const [config, setConfig] = useState<ImaConfig | null>(null);
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://ima.qq.com');
  const [useMock, setUseMock] = useState(true);
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    const [cfgRes, kbRes] = await Promise.all([
      api<ImaConfig>('/api/ima/config'),
      api<KnowledgeBase[]>('/api/ima/knowledge-bases'),
    ]);
    setConfig(cfgRes.data);
    setClientId(cfgRes.data.clientId);
    setBaseUrl(cfgRes.data.baseUrl);
    setUseMock(cfgRes.data.useMock);
    setApiKey('');
    setKbs(kbRes.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function saveConfig() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        clientId,
        baseUrl,
        useMock,
      };
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      await api('/api/ima/config', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      await load();
      alert('IMA 配置已保存');
    } finally {
      setSaving(false);
    }
  }

  async function syncKbs() {
    setSyncing(true);
    try {
      await api('/api/ima/knowledge-bases/sync', { method: 'POST' });
      await load();
      alert('知识库列表已同步');
    } catch (e) {
      alert(e instanceof Error ? e.message : '同步失败');
    } finally {
      setSyncing(false);
    }
  }

  async function setDefaultKb(id: string) {
    await api(`/api/ima/knowledge-bases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isDefault: true }),
    });
    await load();
  }

  async function toggleKb(id: string, enabled: boolean) {
    await api(`/api/ima/knowledge-bases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
    await load();
  }

  return (
    <StudioLayout>
      <PageContainer>
        <PageHeader
          title="IMA 知识库"
          description="配置 ima.qq.com OpenAPI，并维护可检索的知识库列表"
        />

        <StudioCard className="mb-6 p-5">
          <h3 className="mb-4 text-sm font-semibold">API 凭证</h3>
          <p className="text-muted-foreground mb-4 text-sm">
            在{' '}
            <a
              href="https://ima.qq.com/agent-interface"
              target="_blank"
              rel="noreferrer"
              className="text-[#1664ff] hover:underline"
            >
              ima.qq.com/agent-interface
            </a>{' '}
            获取 Client ID 与 API Key。凭证保存在系统配置中，不会明文回显。
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="studio-input"
                placeholder="ima-openapi-clientid"
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="studio-input"
                placeholder={
                  config?.hasApiKey ? `已配置 ${config.apiKey}` : '输入新 API Key'
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Base URL</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="studio-input"
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                id="useMock"
                type="checkbox"
                className="accent-[#1664ff]"
                checked={useMock}
                onChange={(e) => setUseMock(e.target.checked)}
              />
              <Label htmlFor="useMock">使用 Mock（无真实 IMA 调用）</Label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={saveConfig} disabled={saving}>
              <Save className="size-4" />
              保存配置
            </Button>
            <Button variant="secondary" onClick={syncKbs} disabled={syncing}>
              <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
              同步知识库列表
            </Button>
          </div>
          {config && (
            <p className="text-muted-foreground mt-3 text-xs">
              状态：{config.configured ? '已配置凭证' : '未配置凭证'} ·{' '}
              {config.useMock ? 'Mock 模式' : '真实 API 模式'}
            </p>
          )}
        </StudioCard>

        <StudioCard className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Database className="size-4 text-[#1664ff]" />
            <h3 className="text-sm font-semibold">知识库列表</h3>
          </div>
          <Table className="studio-table">
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>外部 ID</TableHead>
                <TableHead>默认</TableHead>
                <TableHead>启用</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kbs.map((kb) => (
                <TableRow key={kb.id}>
                  <TableCell className="font-medium">{kb.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {kb.externalId}
                  </TableCell>
                  <TableCell>{kb.isDefault ? '是' : '—'}</TableCell>
                  <TableCell>{kb.enabled ? '是' : '否'}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    {!kb.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDefaultKb(kb.id)}
                      >
                        设为默认
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleKb(kb.id, !kb.enabled)}
                    >
                      {kb.enabled ? '禁用' : '启用'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {kbs.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              暂无知识库，请点击「同步知识库列表」
            </p>
          )}
        </StudioCard>
      </PageContainer>
    </StudioLayout>
  );
}
