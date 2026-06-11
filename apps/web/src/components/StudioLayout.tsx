'use client';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { StudioHeader } from '@/components/layout/studio-header';
import { StudioOnboarding } from '@/components/studio/studio-onboarding';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { Loader2 } from 'lucide-react';

export function StudioLayout({ children }: { children: React.ReactNode }) {
  const ready = useRequireAuth();

  if (!ready) {
    return (
      <div className="studio-canvas flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#1664ff]" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <StudioOnboarding />
      <AppSidebar />
      <SidebarInset className="studio-canvas">
        <StudioHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
