import type { Meta, StoryObj } from '@storybook/react';

import type { ActiveHomePopup } from '@/entities/home-popup/api/getActiveHomePopups';

import { HomePopupModal } from './HomePopupModal';

/**
 * Client Component — hydrate 후 쿠키 기반 필터링 + body.style.overflow 조작 + Carousel 재사용.
 * 주의: `document.body.style.overflow`를 건드리므로 story 간 leak 방지 필요 시
 * decorator에서 cleanup 추가.
 *
 * 2개 이상 popup은 swiper Carousel을 사용하며, 7f에서 확인된 width 방어 로직이
 * 그대로 적용됨.
 */
const contentPopup: ActiveHomePopup = {
  id: 'popup-content-1',
  popupType: 'CONTENT',
  title: '시스템 점검 안내',
  contentHtml:
    '<p>2026년 4월 25일(토) 03:00~05:00 정기 점검이 예정되어 있습니다.</p><p>이용에 참고 부탁드립니다.</p>',
  imageUrl: null,
  imageAlt: null,
  linkUrl: '/notice/maintenance',
  buttonLabel: '자세히 보기',
};

const imagePopup: ActiveHomePopup = {
  id: 'popup-image-1',
  popupType: 'IMAGE',
  title: '봄맞이 이벤트',
  contentHtml: null,
  imageUrl: 'https://picsum.photos/seed/spring/800/600',
  imageAlt: '봄맞이 이벤트 포스터',
  linkUrl: 'https://example.com/event',
  buttonLabel: null,
};

const secondContentPopup: ActiveHomePopup = {
  ...contentPopup,
  id: 'popup-content-2',
  title: '서비스 개편 공지',
  contentHtml:
    '<p>사용자 경험 개선을 위한 UI 리뉴얼이 진행됩니다. 5월 1일부터 적용됩니다.</p>',
  buttonLabel: '리뉴얼 미리보기',
  linkUrl: '/notice/renewal',
};

const meta = {
  title: 'Web/Widgets/HomePopupModal',
  component: HomePopupModal,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof HomePopupModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ContentSingle: Story = {
  args: {
    popups: [contentPopup],
  },
};

export const ImageSingle: Story = {
  args: {
    popups: [imagePopup],
  },
};

export const SwiperMultiple: Story = {
  args: {
    popups: [contentPopup, imagePopup, secondContentPopup],
  },
};

export const NoPopups: Story = {
  args: {
    popups: [],
  },
};
