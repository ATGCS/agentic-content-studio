'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLayout } from '@/components/StudioLayout';
import { PageContainer } from '@/components/layout/page-container';

function BindResultContent() {
  const params = useSearchParams();
  const success = params.get('success') === 'true';
  const accountId = params.get('accountId') ?? '';
  const isDev = params.get('dev') === 'true';
  const error = params.get('error');

  return (
    <StudioLayout>
      <PageContainer>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
          {success ? (
            <>
              <CheckCircle2 className="size-16 text-[#00B42A]" />
              <h1 className="text-xl font-semibold text-[#1D2129]">
                账号绑定成功
              </h1>
              {isDev && (
                <p className="text-sm text-[#FF7D00]">
                  当前为 Dev/Mock 授权，仅本地测试使用
                </p>
              )}
              {accountId && (
                <Link href={`/accounts/${accountId}`}>
                  <Button variant="outline" className="text-sm">
                    查看账号详情
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <>
              <XCircle className="size-16 text-[#F53F3F]" />
              <h1 className="text-xl font-semibold text-[#1D2129]">
                账号绑定失败
              </h1>
              <p className="max-w-md text-center text-sm text-[#4E5969]">
                {error
                  ? decodeURIComponent(error)
                  : '授权流程未完成，请重试或联系管理员'}
              </p>
            </>
          )}

          <Link href="/accounts">
            <Button className="gap-2 bg-[#1664FF] text-white hover:bg-[#0E52D9]">
              <ArrowLeft className="size-4" />
              返回账号列表
            </Button>
          </Link>
        </div>
      </PageContainer>
    </StudioLayout>
  );
}

export default function BindResultPage() {
  return (
    <Suspense
      fallback={
        <StudioLayout>
          <PageContainer>
            <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-[#86909C]">
              <Loader2 className="size-5 animate-spin" />
              加载中…
            </div>
          </PageContainer>
        </StudioLayout>
      }
    >
      <BindResultContent />
    </Suspense>
  );
}
