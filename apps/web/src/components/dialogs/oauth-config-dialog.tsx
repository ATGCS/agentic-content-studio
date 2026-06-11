'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { DialogWrapper } from '@/components/dialog-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type PlatformCfg = {
  wechat?: { configured: boolean; appId?: string };
  douyin?: { configured: boolean; appId?: string };
  kuaishou?: { configured: boolean; appId?: string };
  bilibili?: { configured: boolean; appId?: string };
} | null;

const platformMeta = [
  {
    key: 'wechat',
    label: '微信公众号',
    hint: 'AppID / AppSecret',
    url: 'https://open.weixin.qq.com/',
    help: '登录微信开放平台 → 创建网站应用 → 获取 AppID 和 AppSecret',
  },
  {
    key: 'douyin',
    label: '抖音',
    hint: 'ClientKey / ClientSecret',
    url: 'https://open.douyin.com/',
    help: '登录抖音开放平台 → 控制台 → 我的应用 → 应用信息 → 获取 ClientKey',
  },
  {
    key: 'kuaishou',
    label: '快手',
    hint: 'AppID / AppSecret',
    url: 'https://open.kuaishou.com/',
    help: '登录快手开放平台 → 创建应用 → 获取 AppID 和 AppSecret',
  },
  {
    key: 'bilibili',
    label: 'B站',
    hint: 'AppID / AppSecret',
    url: 'https://open.bilibili.com/',
    help: '登录 B站开放平台 → 创建应用 → 获取 AppID 和 AppSecret',
  },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function OAuthConfigDialog({ open, onOpenChange }: Props) {
  const [cfg, setCfg] = useState<
    Record<string, { key: string; secret: string }>
  >({});
  const [loaded, setLoaded] = useState<PlatformCfg>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!open) return;
    api<PlatformCfg>('/api/accounts/oauth-config')
      .then((r) => {
        setLoaded(r.data);
        const init: Record<string, { key: string; secret: string }> = {};
        for (const p of platformMeta) {
          init[p.key] = { key: '', secret: '' };
        }
        setCfg(init);
      })
      .catch(() => setStatus('加载配置失败'));
  }, [open]);

  async function handleSave() {
    setSaving(true);
    setStatus('');
    try {
      const body: Record<string, unknown> = {};
      for (const p of platformMeta) {
        const c = cfg[p.key];
        if (c.key || c.secret) {
          if (p.key === 'douyin') {
            body[p.key] = { clientKey: c.key, clientSecret: c.secret };
          } else {
            body[p.key] = { appId: c.key, appSecret: c.secret };
          }
        }
      }
      await api('/api/accounts/oauth-config', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      setStatus('配置已保存');
      setTimeout(() => onOpenChange(false), 1000);
    } catch {
      setStatus('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title="平台 OAuth 配置（管理员）"
      description="配置本系统在抖音/微信等平台的开发者应用凭证。保存后，所有登录用户均可各自授权绑定自己的账号，无需修改服务器文件。"
      className="sm:max-w-[560px]"
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-[#FFF7E6] p-3 text-xs text-[#FF7D00]">
          <strong>说明：</strong>
          这里是<strong>全站级</strong>
          配置（类似你在抖音开放平台注册的一个「应用」），不是某个运营同学的私人账号。
          <br />
          配置完成后，每位用户点击「新增账号 → 去授权」，绑定的是
          <strong>自己的</strong>抖音/公众号。
          <br />
          凭证保存在系统数据库中，普通用户无需接触 .env 或服务器配置。
        </div>

        {platformMeta.map((p) => {
          const item =
            loaded && p.key in loaded ? (loaded as any)[p.key] : undefined;
          return (
            <div key={p.key} className="rounded-lg border border-[#E5E8EF] p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-semibold text-[#1D2129]">
                    {p.label}
                  </Label>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#86909C] hover:text-[#1664FF]"
                    title={p.help}
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
                {item && (
                  <span
                    className={cn(
                      'text-[10px]',
                      item.configured ? 'text-[#00B42A]' : 'text-[#86909C]'
                    )}
                  >
                    {item.configured ? `已配置 ${item.appId ?? ''}` : '未配置'}
                  </span>
                )}
              </div>
              <p className="mb-2 text-[10px] leading-relaxed text-[#86909C]">
                {p.help}
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="AppID / ClientKey"
                  className="flex-1 text-xs"
                  value={cfg[p.key]?.key ?? ''}
                  onChange={(e) =>
                    setCfg((prev) => ({
                      ...prev,
                      [p.key]: { ...prev[p.key], key: e.target.value },
                    }))
                  }
                />
                <Input
                  placeholder="Secret"
                  type="password"
                  className="flex-1 text-xs"
                  value={cfg[p.key]?.secret ?? ''}
                  onChange={(e) =>
                    setCfg((prev) => ({
                      ...prev,
                      [p.key]: { ...prev[p.key], secret: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          );
        })}

        {status && (
          <div
            className={cn(
              'rounded-lg p-3 text-xs',
              status.includes('失败')
                ? 'bg-[#FFF1F0] text-[#F53F3F]'
                : 'bg-[#F0F5FF] text-[#1664FF]'
            )}
          >
            {status}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={() => onOpenChange(false)}
          >
            关闭
          </Button>
          <Button
            size="sm"
            className="h-9 bg-[#1664FF] text-xs text-white hover:bg-[#0E52D9]"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? '保存中…' : '保存配置'}
          </Button>
        </div>
      </div>
    </DialogWrapper>
  );
}
