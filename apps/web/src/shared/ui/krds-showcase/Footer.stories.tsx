import type { Meta, StoryObj } from '@storybook/react';
import { Footer } from 'krds-react';
import type {
  FooterBottomLink,
  FooterLink,
  FooterQuickLink,
  FooterSocialLink,
} from 'krds-react';

/**
 * KRDS `Footer` showcase.
 *
 * 실제 사용처: `apps/web/src/widgets/layout/ui/PageLayout.tsx`.
 * 실서비스 데이터는 admin `/settings/footer`와 메뉴 관리의 FOOTER 슬롯에서 관리한다.
 */
const quickLinks: FooterQuickLink[] = [
  { title: '관련 사이트 1', onClick: () => undefined },
  { title: '관련 사이트 2', onClick: () => undefined },
  { title: '관련 사이트 3', onClick: () => undefined },
  { title: '관련 사이트 4', onClick: () => undefined },
];

const footerLinks: FooterLink[] = [
  { text: '찾아오시는 길', href: '#', target: '_self' },
  { text: '이용안내', href: '#', target: '_self' },
  { text: '직원검색', href: '#', target: '_self' },
];

const socialLinks: FooterSocialLink[] = [
  { platform: 'instagram', href: '#', target: '_self' },
  { platform: 'youtube', href: '#', target: '_self' },
  { platform: 'x', href: '#', target: '_self' },
  { platform: 'facebook', href: '#', target: '_self' },
  { platform: 'blog', href: '#', target: '_self' },
];

const bottomLinks: FooterBottomLink[] = [
  { text: '개인정보처리방침', href: '#', isHighlighted: true },
  { text: '저작권 정책', href: '#' },
  { text: '웹 접근성 품질인증 마크 획득', href: '#' },
];

const meta = {
  title: 'Web/KRDS/Footer',
  component: Footer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '정부 표준 푸터. 공개 웹은 KRDS Default 구조를 사용하고, 데이터는 `/settings/footer`와 FOOTER 슬롯 메뉴에서 관리한다.',
      },
    },
  },
} satisfies Meta<typeof Footer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Footer
      quickLinks={quickLinks}
      address="기관 주소를 입력해 주세요."
      contacts={[
        { title: '대표전화', description: '운영시간을 입력해 주세요.' },
        { title: '이용문의', description: '담당 부서 정보를 입력해 주세요.' },
      ]}
      links={footerLinks}
      socialLinks={socialLinks}
      bottomLinks={bottomLinks}
      copyright="© Simple CMS. All rights reserved."
      identifierText="이 누리집은 공공서비스 제공을 위한 누리집입니다."
      hideQuickLinks={false}
      hideIdentifier={false}
      defaultLinkTarget="_self"
    />
  ),
};
