import type { Meta, StoryObj } from '@storybook/react';
import { SkipLink } from 'krds-react';

/**
 * KRDS `SkipLink` showcase — 웹 접근성 "본문 바로가기".
 *
 * 실제 사용처: `apps/web/src/widgets/layout/ui/PageLayout.tsx`
 * Tab 키로 포커스 접근 시 화면에 나타나며, 클릭 시 `targetId`의 요소로 스크롤 포커스 이동.
 */
const meta = {
  title: 'Web/KRDS/SkipLink',
  component: SkipLink,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '웹 접근성 표준 "본문 바로가기" 링크. 시각적으로는 숨어있다가 키보드 포커스 시 나타남.',
      },
    },
  },
} satisfies Meta<typeof SkipLink>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div>
      <p style={{ padding: 16, background: '#f6f6f6' }}>
        <strong>Tip:</strong> Tab 키를 누르면 좌상단에 "본문 바로가기" 링크가
        나타납니다.
      </p>
      <SkipLink targetId="main-content">본문 바로가기</SkipLink>
      <main
        id="main-content"
        style={{ padding: 24, marginTop: 16 }}
      >
        <h1>본문 영역</h1>
        <p>SkipLink의 targetId와 연결되는 main 요소.</p>
      </main>
    </div>
  ),
};
