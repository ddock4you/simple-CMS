import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';

import { HeaderChrome } from './HeaderChrome';

const branding = {
  siteName: 'Simple CMS',
  siteDescription: '공개 웹',
  logoUrl: null,
  logoAlt: 'Simple CMS',
  faviconUrl: null,
  faviconMediaId: null,
  ogImageUrl: null,
};

const headerMenuItems: FilteredMenuItem[] = [
  {
    id: 'about',
    label: '기관소개',
    itemType: 'CUSTOM',
    url: '/p/about',
    openInNewTab: false,
    subpage: null,
    board: null,
    children: [
      {
        id: 'about-overview',
        label: '기관 안내',
        itemType: 'SUBPAGE',
        url: null,
        openInNewTab: false,
        subpage: { slug: 'about' },
        board: null,
        children: [],
      },
      {
        id: 'about-history',
        label: '연혁',
        itemType: 'SUBPAGE',
        url: null,
        openInNewTab: false,
        subpage: { slug: 'history' },
        board: null,
        children: [],
      },
    ],
  },
  {
    id: 'service',
    label: '서비스',
    itemType: 'CUSTOM',
    url: '/p/service',
    openInNewTab: false,
    subpage: null,
    board: null,
    children: [
      {
        id: 'service-info',
        label: '이용안내',
        itemType: 'CUSTOM',
        url: '/p/service-info',
        openInNewTab: false,
        subpage: null,
        board: null,
        children: [
          {
            id: 'service-faq',
            label: '자주하는 질문',
            itemType: 'CUSTOM',
            url: '/p/faq',
            openInNewTab: false,
            subpage: null,
            board: null,
            children: [],
          },
          {
            id: 'service-guide',
            label: '사용 가이드',
            itemType: 'CUSTOM',
            url: '/p/guide',
            openInNewTab: false,
            subpage: null,
            board: null,
            children: [],
          },
        ],
      },
      {
        id: 'service-notice',
        label: '공지사항',
        itemType: 'BOARD',
        url: null,
        openInNewTab: false,
        subpage: null,
        board: { slug: 'notice' },
        children: [],
      },
    ],
  },
  {
    id: 'external',
    label: 'KRDS',
    itemType: 'EXTERNAL',
    url: 'https://www.krds.go.kr/',
    openInNewTab: true,
    subpage: null,
    board: null,
    children: [],
  },
];

const meta = {
  title: 'Web/Widgets/HeaderChrome',
  component: HeaderChrome,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '공개 웹 런타임 헤더. KRDS DOM 클래스를 직접 렌더하고 통합검색/전체메뉴 레이어는 body portal로 표시한다.',
      },
    },
  },
  args: {
    branding,
    headerMenuItems,
  },
} satisfies Meta<typeof HeaderChrome>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole('link', { name: 'Simple CMS' })).toBeInTheDocument();
    expect(canvas.getByRole('link', { name: '통합검색' })).toHaveAttribute(
      'aria-haspopup',
      'dialog',
    );
    expect(canvasElement.querySelector('.btn-navi.all')).toBeInTheDocument();
    expect(canvas.getByRole('navigation', { name: '주 메뉴' })).toBeInTheDocument();
  },
};

export const WithLogo: Story = {
  args: {
    branding: {
      ...branding,
      logoUrl: 'https://via.placeholder.com/160x56',
      logoAlt: 'Simple CMS 로고',
    },
  },
};
