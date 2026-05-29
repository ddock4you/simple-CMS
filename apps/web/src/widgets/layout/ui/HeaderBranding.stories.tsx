import type { Meta, StoryObj } from '@storybook/react';
import { Header } from 'krds-react';
import { expect, within } from 'storybook/test';

import { HeaderBranding } from './HeaderBranding';

const meta = {
  title: 'Web/Widgets/HeaderBranding',
  component: HeaderBranding,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <Header>
        <Header.Container>
          <Story />
        </Header.Container>
      </Header>
    ),
  ],
} satisfies Meta<typeof HeaderBranding>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Stage 12i — 로고 이미지 렌더 확인.
 * logoUrl 있으면 <img> 렌더 + aria-label 확인.
 */
export const WithLogo: Story = {
  args: {
    branding: {
      siteName: 'Simple CMS',
      siteDescription: '공개 웹',
      logoUrl: 'https://via.placeholder.com/120x40',
      logoAlt: 'Simple CMS 로고',
      faviconUrl: null,
      faviconMediaId: null,
      ogImageUrl: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const logoLink = canvas.getByRole('link', { name: 'Simple CMS 로고' });
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute('href', '/');
    // alt=""인 장식 이미지는 role="presentation" → getByRole('img') 불가
    const logoImg = canvasElement.querySelector('img');
    expect(logoImg).toBeInTheDocument();
    expect(logoImg).toHaveAttribute('alt', '');
    expect(canvas.getByRole('link', { name: '통합검색' })).toBeInTheDocument();
    expect(canvasElement.querySelector('#web-header-desktop-menu')).toBeInTheDocument();
  },
};

/**
 * Stage 12i — 로고 미설정 시 사이트명 텍스트 폴백 렌더.
 * logoUrl=null이면 siteName 텍스트 표시.
 */
export const TextFallback: Story = {
  args: {
    branding: {
      siteName: '공공기관 포털',
      siteDescription: '',
      logoUrl: null,
      logoAlt: '공공기관 포털',
      faviconUrl: null,
      faviconMediaId: null,
      ogImageUrl: null,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('공공기관 포털')).toBeInTheDocument();
    // img 태그가 없어야 함
    expect(canvas.queryByRole('img')).toBeNull();
  },
};
