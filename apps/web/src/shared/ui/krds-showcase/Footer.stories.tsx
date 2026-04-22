import type { Meta, StoryObj } from '@storybook/react';
import { Footer } from 'krds-react';
import type { FooterLink } from 'krds-react';

/**
 * KRDS `Footer` showcase.
 *
 * 실제 사용처: `apps/web/src/widgets/layout/ui/PageLayout.tsx`
 * 이 프로젝트는 quickLinks와 identifier를 숨기고 (`hideQuickLinks`, `hideIdentifier`)
 * `links`와 `copyright`만 사용.
 */
const footerLinks: FooterLink[] = [
  { text: '이용약관', href: '/p/terms', target: '_self' },
  { text: '개인정보처리방침', href: '/p/privacy', target: '_self' },
  { text: '공공누리', href: 'https://www.kogl.or.kr/', target: '_blank' },
];

const meta = {
  title: 'Web/KRDS/Footer',
  component: Footer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '정부 표준 푸터. `apps/web/src/widgets/layout/ui/PageLayout.tsx`에서 links + copyright로 사용.',
      },
    },
  },
} satisfies Meta<typeof Footer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Standard: Story = {
  render: () => (
    <Footer
      links={footerLinks}
      copyright="© Simple CMS. All rights reserved."
      hideQuickLinks
      hideIdentifier
    />
  ),
};
