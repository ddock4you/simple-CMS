import '../app/globals.css';

import { useState } from 'react';
import type { Decorator, Preview } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';

import { RESOURCE_ACTIONS, type PermissionMap, type ResourceKey } from '@simple-cms/types';

import { PermissionProvider } from '@/entities/auth/ui/PermissionProvider';
import { SidebarProvider } from '@/shared/ui/shadcn/sidebar';
import { Toaster } from '@/shared/ui/shadcn/sonner';
import { TooltipProvider } from '@/shared/ui/shadcn/tooltip';

function buildFullPermissions(): PermissionMap {
  return (Object.keys(RESOURCE_ACTIONS) as ResourceKey[]).reduce<PermissionMap>((acc, resource) => {
    acc[resource] = { create: true, read: true, update: true, delete: true };
    return acc;
  }, {});
}

/**
 * app/layout.tsx 재현 — 모든 story의 outermost decorator.
 * ThemeProvider → QueryClient(스토리 스코프 · retry:false) → TooltipProvider + Toaster.
 */
const rootDecorator: Decorator = (Story) => {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <Story />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

/**
 * app/(authenticated)/layout.tsx 재현 — `parameters.authenticated=true` 일 때만 wrap.
 * - `parameters.permissions`: PermissionMap override (기본값은 모든 리소스 full access)
 * - `parameters.isSystem`: 총괄 관리자 모드 토글 (usePermission가 true 반환)
 */
const authenticatedDecorator: Decorator = (Story, ctx) => {
  const params = ctx.parameters as {
    authenticated?: boolean;
    permissions?: PermissionMap;
    isSystem?: boolean;
  };

  if (!params.authenticated) {
    return <Story />;
  }

  const permissions = params.permissions ?? buildFullPermissions();
  const isSystem = params.isSystem ?? false;

  return (
    <PermissionProvider permissions={permissions} isSystem={isSystem}>
      <SidebarProvider defaultOpen>
        <Story />
      </SidebarProvider>
    </PermissionProvider>
  );
};

const preview: Preview = {
  decorators: [rootDecorator, authenticatedDecorator],
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
    },
  },
};

export default preview;
