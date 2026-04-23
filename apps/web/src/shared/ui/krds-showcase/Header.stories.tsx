import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import { Header } from 'krds-react';

type HeaderProps = ComponentProps<typeof Header>;

/**
 * KRDS `Header` showcase.
 *
 * 실제 사용처: `apps/web/src/widgets/layout/ui/PageLayout.tsx`
 * 이 프로젝트에서 쓰는 variant만 등록 (KRDS 모든 variant 전수 등록은 scope 외).
 * PageLayout에서 Header.Container + Header.Branding (+옵션 Header.MainMenu)로 조합.
 */
const meta: Meta<HeaderProps> = {
  title: 'Web/KRDS/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '정부 디자인 시스템 표준 헤더. `apps/web/src/widgets/layout/ui/PageLayout.tsx`에서 사용.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<HeaderProps>;

export const Branded: Story = {
  render: () => (
    <Header>
      <Header.Container>
        <Header.Branding logoHref="/" logoAltText="Simple CMS" />
      </Header.Container>
    </Header>
  ),
};

export const WithMainMenu: Story = {
  render: () => {
    const desktopMenu = {
      items: [
        {
          type: 'link' as const,
          id: 'home',
          label: '홈',
          href: '/',
          isExternal: false,
        },
        {
          type: 'dropdown' as const,
          id: 'about',
          label: '소개',
          sections: [
            {
              type: 'link' as const,
              id: 'intro',
              label: '기관 안내',
              href: '/p/intro',
              isExternal: false,
            },
            {
              type: 'link' as const,
              id: 'history',
              label: '연혁',
              href: '/p/history',
              isExternal: false,
            },
          ],
        },
        {
          type: 'link' as const,
          id: 'notice',
          label: '공지사항',
          href: '/board/notice',
          isExternal: false,
        },
      ],
    };

    const mobileMenu = {
      body: {
        mainItems: desktopMenu.items.map((item) => ({
          id: item.id,
          label: item.label,
          panels: [
            {
              label: item.label,
              items:
                item.type === 'dropdown'
                  ? item.sections.map((section) => ({
                      type: 'link' as const,
                      id: section.id,
                      label: section.label,
                      href: section.href,
                      isExternal: section.isExternal,
                    }))
                  : [
                      {
                        type: 'link' as const,
                        id: `${item.id}-self`,
                        label: item.label,
                        href: item.href,
                        isExternal: item.isExternal,
                      },
                    ],
            },
          ],
        })),
      },
    };

    return (
      <Header>
        <Header.Container>
          <Header.Branding logoHref="/" logoAltText="Simple CMS" />
        </Header.Container>
        <Header.MainMenu desktop={desktopMenu} mobile={mobileMenu} />
      </Header>
    );
  },
};
