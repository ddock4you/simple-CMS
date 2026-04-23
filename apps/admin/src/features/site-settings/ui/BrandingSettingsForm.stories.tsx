import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { BrandingSettingsData } from '../model/settingsSchemas';
import { brandingSettingsOptions } from '../api/settingsQueries';
import { BrandingSettingsForm } from './BrandingSettingsForm';

/**
 * Stage 7l — 사이트 브랜딩 + SEO 메타데이터 설정 폼.
 *
 * `useQuery(brandingSettingsOptions())`로 초기 데이터를 가져오므로 story에서는
 * `MockBrandingProvider`(LinkTargetInput.stories의 MockRefsProvider 패턴)로
 * 자체 QueryClient를 덮어쓰고 `setQueryData`로 모의 응답을 주입한다.
 * PATCH 분기는 `fetchStubDecorator`가 처리.
 */

const EMPTY_DATA: BrandingSettingsData = {
  siteName: 'Simple CMS',
  siteDescription: null,
  logoMediaId: null,
  logoUrl: null,
  logoAlt: null,
  faviconMediaId: null,
  faviconUrl: null,
  ogImageMediaId: null,
  ogImageUrl: null,
};

const FILLED_DATA: BrandingSettingsData = {
  siteName: '테스트 사이트',
  siteDescription: '테스트 사이트의 SEO 설명입니다.',
  logoMediaId: 'media-logo-1',
  logoUrl: '/uploads/branding/logo.png',
  logoAlt: '테스트 사이트 로고',
  faviconMediaId: 'media-favicon-1',
  faviconUrl: '/uploads/branding/favicon.png',
  ogImageMediaId: 'media-og-1',
  ogImageUrl: '/uploads/branding/og.png',
};

function makeMockProvider(data: BrandingSettingsData): Decorator {
  function MockBrandingProvider({ children }: { children: ReactNode }) {
    const [client] = useState(() => {
      const c = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      c.setQueryData(brandingSettingsOptions().queryKey, data);
      return c;
    });
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  }
  const decorator: Decorator = (Story) => (
    <MockBrandingProvider>
      <Story />
    </MockBrandingProvider>
  );
  return decorator;
}

const meta = {
  title: 'Admin/Features/SiteSettings/BrandingSettingsForm',
  component: BrandingSettingsForm,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
} satisfies Meta<typeof BrandingSettingsForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [makeMockProvider(EMPTY_DATA)],
};

export const Filled: Story = {
  decorators: [makeMockProvider(FILLED_DATA)],
};

export const SubmitSuccess: Story = {
  decorators: [makeMockProvider(EMPTY_DATA)],
  parameters: {
    fetchMock: {
      '/api/settings/branding': {
        status: 200,
        body: { success: true, data: null },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    const siteNameInput = await canvas.findByLabelText('사이트명');
    await userEvent.clear(siteNameInput);
    await userEvent.type(siteNameInput, '새 사이트');

    await userEvent.click(await canvas.findByRole('button', { name: '저장' }));

    await waitFor(async () => {
      await body.findByText(/저장되었습니다/);
    });
  },
};

export const SubmitError400: Story = {
  decorators: [makeMockProvider(EMPTY_DATA)],
  parameters: {
    fetchMock: {
      '/api/settings/branding': {
        status: 400,
        body: {
          success: false,
          error: '파비콘은 PNG, WEBP, ICO만 사용할 수 있습니다.',
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // 폼을 dirty로 만들기 위해 사이트명 변경 후 submit
    const siteNameInput = await canvas.findByLabelText('사이트명');
    await userEvent.clear(siteNameInput);
    await userEvent.type(siteNameInput, '잘못된 시도');

    await userEvent.click(await canvas.findByRole('button', { name: '저장' }));

    await body.findByText('파비콘은 PNG, WEBP, ICO만 사용할 수 있습니다.');

    // Dialog가 아니므로 form은 그대로 유지 — 저장 버튼이 다시 활성화되어야 함
    await expect(
      canvas.getByRole('button', { name: '저장' }),
    ).toBeInTheDocument();
  },
};
