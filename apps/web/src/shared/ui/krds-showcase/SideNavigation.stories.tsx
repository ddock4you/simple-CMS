import type { Meta, StoryObj } from '@storybook/react';
import { SideNavigation } from 'krds-react';

/**
 * KRDS `SideNavigation` showcase.
 *
 * 실제 사용처: `apps/web/src/widgets/subpage-sidebar/ui/SubpageSideNavigation.tsx`
 * HEADER 메뉴에서 현재 경로의 루트를 찾아 그 루트의 2/3뎁스 트리를 렌더.
 */
const meta = {
  title: 'Web/KRDS/SideNavigation',
  component: SideNavigation,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '좌측 서브페이지 사이드바. `apps/web/src/widgets/subpage-sidebar/ui/SubpageSideNavigation.tsx`에서 사용.',
      },
    },
  },
} satisfies Meta<typeof SideNavigation>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
  render: () => (
    <SideNavigation aria-label="소개 하위 메뉴">
      <SideNavigation.Title>소개</SideNavigation.Title>
      <SideNavigation.Menu>
        <SideNavigation.Item>
          <SideNavigation.Link href="/p/intro">기관 안내</SideNavigation.Link>
        </SideNavigation.Item>
        <SideNavigation.Item>
          <SideNavigation.Link href="/p/history">연혁</SideNavigation.Link>
        </SideNavigation.Item>
        <SideNavigation.Item>
          <SideNavigation.Link href="/p/contact">오시는 길</SideNavigation.Link>
        </SideNavigation.Item>
      </SideNavigation.Menu>
    </SideNavigation>
  ),
};

export const Expanded: Story = {
  render: () => (
    <SideNavigation aria-label="정책 하위 메뉴">
      <SideNavigation.Title>정책</SideNavigation.Title>
      <SideNavigation.Menu>
        <SideNavigation.Item active>
          <SideNavigation.Toggle expanded aria-controls="policy-1">
            시행 정책
          </SideNavigation.Toggle>
          <SideNavigation.SubMenu id="policy-1">
            <SideNavigation.SubItem active>
              <SideNavigation.Link href="/p/policy-a" current>
                정책 A
              </SideNavigation.Link>
            </SideNavigation.SubItem>
            <SideNavigation.SubItem>
              <SideNavigation.Link href="/p/policy-b">
                정책 B
              </SideNavigation.Link>
            </SideNavigation.SubItem>
          </SideNavigation.SubMenu>
        </SideNavigation.Item>
        <SideNavigation.Item>
          <SideNavigation.Link href="/p/archive">자료실</SideNavigation.Link>
        </SideNavigation.Item>
      </SideNavigation.Menu>
    </SideNavigation>
  ),
};
