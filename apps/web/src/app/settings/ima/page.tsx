'use client';

import { useEffect, useState } from 'react';
import { Database, RefreshCw, Save, Trash2 } from 'lucide-react';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';
import { StudioCard } from '@/components/studio/studio-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  StudioTable,
  StudioTableBody,
  StudioTableCell,
  StudioTableEmpty,
  StudioTableFrame,
  StudioTableHead,
  StudioTableHeader,
  StudioTableRow,
} from '@/components/studio/studio-table';
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
  agentType?: string | null;
  enabled: boolean;
  isDefault: boolean;
  syncedAt?: string | null;
};

const agentTypeOptions = [
  { value: 'UNBOUND', label: '未绑定' },
  { value: 'TOPIC', label: '选题生成 Agent' },
  { value: 'TITLE', label: '标题生成 Agent' },
  { value: 'COVER', label: '封面文案 Agent' },
  { value: 'BODY', label: '正文生成 Agent' },
  { value: 'TAG', label: '标签生成 Agent' },
  { value: 'PLATFORM_RULE', label: '平台规则库' },
  { value: 'ACCOUNT_STYLE', label: '账号风格库' },
  { value: 'MATERIAL', label: '素材知识库' },
];

const agentTypeLabels: Record<string, string> = {
  UNBOUND: '未绑定',
  TOPIC: '选题生成 Agent',
  TITLE: '标题生成 Agent',
  COVER: '封面文案 Agent',
  BODY: '正文生成 Agent',
  TAG: '标签生成 Agent',
  PLATFORM_RULE: '平台规则库',
  ACCOUNT_STYLE: '账号风格库',
  MATERIAL: '素材知识库',
};

export default function ImaSettingsPage() {
  const [config, setConfig] = useState<ImaConfig | null>(null);
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://ima.qq.com');
  const [useMock, setUseMock] = useState(false);
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const [cfgRes, kbRes] = await Promise.all([
      api<ImaConfig>('/api/ima/config'),
      api<KnowledgeBase[]>('/api/ima/knowledge-bases'),
    ]);
    setConfig(cfgRes.data);
    setClientId(cfgRes.data.clientId);
    setBaseUrl(cfgRes.data.baseUrl);
    setApiKey('');
    setKbs(kbRes.data);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function saveConfig() {
    setSaving(true);
    try {
      const body: Record<string, string> = {
        clientId,
        baseUrl,
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

  async function updateAgentType(id: string, agentType: string) {
    await api(`/api/ima/knowledge-bases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ agentType }),
    });
    await load();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === kbs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(kbs.map((kb) => kb.id)));
    }
  }

  function openDeleteDialog() {
    if (selectedIds.size === 0) return;
    setDeleteDialogOpen(true);
  }

  async function handleDeleteSelected() {
    setDeleting(true);
    try {
      await api('/api/ima/knowledge-bases/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      await load();
      setSelectedIds(new Set());
      alert(`成功删除 ${selectedIds.size} 个知识库`);
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  const isAllSelected = kbs.length > 0 && selectedIds.size === kbs.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < kbs.length;

  return (
    <StudioLayout>
      <PageContainer>
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
                  config?.hasApiKey
                    ? `已配置 ${config.apiKey}`
                    : '输入新 API Key'
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
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={saveConfig} disabled={saving}>
              <Save className="size-4" />
              保存配置
            </Button>
            <Button variant="secondary" onClick={syncKbs} disabled={syncing}>
              <RefreshCw
                className={`size-4 ${syncing ? 'animate-spin' : ''}`}
              />
              同步知识库列表
            </Button>
          </div>
          {config && (
            <p className="text-muted-foreground mt-3 text-xs">
              状态：
              {config.configured
                ? '已配置凭证可直接调用'
                : '未配置凭证，请在 .env 中设置 IMA_OPENAPI_CLIENTID 和 IMA_OPENAPI_APIKEY'}
            </p>
          )}
        </StudioCard>

        <StudioCard className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-[#1664ff]" />
              <h3 className="text-sm font-semibold">知识库列表</h3>
            </div>
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={openDeleteDialog}
                disabled={deleting}
              >
                <Trash2 className="size-4" />
                批量删除 ({selectedIds.size})
              </Button>
            )}
          </div>
          <StudioTable>
            <StudioTableHeader>
              <StudioTableRow>
                <StudioTableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="全选"
                    className={
                      isIndeterminate ? 'data-[state=checked]:bg-[#1664ff]' : ''
                    }
                  />
                </StudioTableHead>
                <StudioTableHead>名称</StudioTableHead>
                <StudioTableHead>外部 ID</StudioTableHead>
                <StudioTableHead>绑定 Agent</StudioTableHead>
                <StudioTableHead>默认</StudioTableHead>
                <StudioTableHead>启用</StudioTableHead>
                <StudioTableHead className="text-right">操作</StudioTableHead>
              </StudioTableRow>
            </StudioTableHeader>
            <StudioTableBody>
              {kbs.map((kb) => (
                <StudioTableRow key={kb.id}>
                  <StudioTableCell>
                    <Checkbox
                      checked={selectedIds.has(kb.id)}
                      onCheckedChange={() => toggleSelect(kb.id)}
                      aria-label={`选择 ${kb.name}`}
                    />
                  </StudioTableCell>
                  <StudioTableCell className="font-medium">
                    {kb.name}
                  </StudioTableCell>
                  <StudioTableCell className="text-muted-foreground text-xs">
                    {kb.externalId}
                  </StudioTableCell>
                  <StudioTableCell>
                    <Select
                      value={kb.agentType || 'UNBOUND'}
                      onValueChange={(value) =>
                        updateAgentType(kb.id, value === 'UNBOUND' ? '' : value)
                      }
                    >
                      <SelectTrigger className="h-7 w-40">
                        <SelectValue placeholder="未绑定" />
                      </SelectTrigger>
                      <SelectContent>
                        {agentTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </StudioTableCell>
                  <StudioTableCell>{kb.isDefault ? '是' : '—'}</StudioTableCell>
                  <StudioTableCell>{kb.enabled ? '是' : '否'}</StudioTableCell>
                  <StudioTableCell className="space-x-2 text-right">
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
                  </StudioTableCell>
                </StudioTableRow>
              ))}
            </StudioTableBody>
          </StudioTable>
          {kbs.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              暂无知识库，请点击「同步知识库列表」
            </p>
          )}
        </StudioCard>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除选中的 {selectedIds.size} 个知识库吗？此操作不可恢复。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSelected}
                disabled={deleting}
                className="bg-[#ef4444] hover:bg-[#dc2626]"
              >
                {deleting ? '删除中...' : '确认删除'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageContainer>
    </StudioLayout>
  );
}
