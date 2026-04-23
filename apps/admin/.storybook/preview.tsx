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

import { fetchStubDecorator } from './fetchStubDecorator';

function buildFullPermissions(): PermissionMap {
  return (Object.keys(RESOURCE_ACTIONS) as ResourceKey[]).reduce<PermissionMap>((acc, resource) => {
    acc[resource] = { create: true, read: true, update: true, delete: true };
    return acc;
  }, {});
}

/**
 * app/layout.tsx 재현 — 모든 story의 outermost decorator.
 * ThemeProvider → QueryClient(스토리 스코프 · retry:false) → TooltipProvider + Toaster.
 *
 * Hooks는 `RootProviders` 내부 컴포넌트로 추출 (react-hooks/rules-of-hooks).
 */
function RootProviders({ children }: { children: React.ReactNode }) {
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
          {children}
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const rootDecorator: Decorator = (Story) => (
  <RootProviders>
    <Story />
  </RootProviders>
);

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
  // Storybook decorator order: 배열의 첫 번째가 outermost, 마지막이 innermost (Story에 가장 가까움).
  // fetchStubDecorator를 가장 안쪽에 두어 useEffect가 Story mount 직후 가장 먼저 실행되도록 한다.
  decorators: [rootDecorator, authenticatedDecorator, fetchStubDecorator],
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
    },
  },
};

export default preview;
