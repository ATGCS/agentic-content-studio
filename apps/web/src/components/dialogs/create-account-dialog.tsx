'use client';

import { useState } from 'react';
import { PlatformIcon, platformIconMeta, type PlatformIconKey } from '@/components/platform-icon';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DialogWrapper } from '@/components/dialog-wrapper';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { navigateToAuthorization } from '@/lib/oauth';

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const platforms = [
  { key: 'WECHAT', label: '微信公众号' },
  { key: 'XIAOHONGSHU', label: '小红书' },
  { key: 'DOUYIN', label: '抖音' },
  { key: 'VIDEO_CHANNEL', label: '视频号' },
  { key: 'BILIBILI', label: 'Bilibili' },
  { key: 'ZHIHU', label: '知乎' },
  { key: 'KUAISHOU', label: '快手' },
];

const platformKeyMap: Record<string, PlatformIconKey> = {
  WECHAT: 'wechat',
  XIAOHONGSHU: 'xiaohongshu',
  DOUYIN: 'douyin',
  VIDEO_CHANNEL: 'shipinhao',
  BILIBILI: 'bilibili',
  ZHIHU: 'zhihu',
  KUAISHOU: 'kuaishou',
};

export function CreateAccountDialog({ open, onOpenChange, onSuccess }: CreateAccountDialogProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handleAuthorize = async () => {
    if (!selectedPlatform) return;
    if (selectedPlatform === 'ZHIHU') {
      setStatus('知乎暂不支持官方自动同步，请手动录入');
      return;
    }

    setLoading(true);
    setStatus('正在发起授权...');
    try {
      const res = await api<{ authorizationUrl: string; state: string }>('/api/accounts/bind/start', {
        method: 'POST',
        body: JSON.stringify({
          platform: selectedPlatform,
          redirectAfterBind: '/accounts/bind/result?success=true',
        }),
      });

      if (res.data?.authorizationUrl) {
        setStatus('跳转授权页...');
        navigateToAuthorization(res.data.authorizationUrl);
        onSuccess?.();
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '未知错误';
      setStatus(`授权发起失败：${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogWrapper
      open={open}
      onOpenChange={onOpenChange}
      title="新增平台账号"
      description="选择平台后点击授权；本地开发将使用 Mock 授权完成绑定"
      className="sm:max-w-[480px]"
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <Label className="text-xs font-medium text-[#4E5969]">选择平台</Label>
          <div className="grid grid-cols-4 gap-2">
            {platforms.map((platform) => {
              const iconKey = platformKeyMap[platform.key] ?? 'wechat';
              const meta = platformIconMeta[iconKey] || {
                bg: '#F2F3F5',
                color: '#86909C',
                short: '?',
              };
              return (
                <button
                  key={platform.key}
                  type="button"
                  onClick={() => {
                    setSelectedPlatform(platform.key);
                    setStatus('');
                  }}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-lg border p-3 transition-all',
                    selectedPlatform === platform.key
                      ? 'border-[#1664FF] bg-[#F0F5FF]'
                      : 'border-[#E5E8EF] bg-white hover:border-[#C9D8FF]'
                  )}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: meta.bg, color: meta.color }}
                  >
                    {meta.icon ? <PlatformIcon icon={meta.icon} size={20} /> : meta.short}
                  </div>
                  <span className="text-[11px] text-[#4E5969]">{platform.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {status && (
          <div
            className={cn(
              'rounded-lg p-3 text-xs',
              status.includes('失败') ? 'bg-[#FFF1F0] text-[#F53F3F]' : 'bg-[#F0F5FF] text-[#1664FF]'
            )}
          >
            {status}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={() => {
              onOpenChange(false);
              setStatus('');
            }}
          >
            取消
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!selectedPlatform || loading}
            className="h-9 bg-[#1664FF] text-xs text-white hover:bg-[#0E52D9] disabled:opacity-50"
            onClick={handleAuthorize}
          >
            {loading ? '跳转中...' : '去授权'}
          </Button>
        </div>
      </div>
    </DialogWrapper>
  );
}
