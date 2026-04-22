import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BlockEditDialog } from './BlockEditDialog';

/**
 * BlockEditDialog는 부모가 `key` prop으로 매번 새 인스턴스를 마운트하는 패턴이라,
 * 한 story에서 타입을 전환하는 시나리오는 불가능.
 * → blockType별로 각각의 story로 분리 (CreateRichText / CreateHtml / CreateImage / CreateIframe).
 *
 * Stage 7h에서 각 story에 play function으로 타입별 필드 검증 추가 예정.
 *
 * 참고: `fn`은 Storybook v10부터 `storybook/test` core 경로에서 import
 * (`@storybook/test` 패키지 별도 설치 불필요).
 */
const meta = {
  title: 'Admin/Features/Block/BlockEditDialog',
  component: BlockEditDialog,
  parameters: {
    layout: 'padded',
    authenticated: true,
  },
  args: {
    subpageId: 'story-subpage-1',
    block: null,
    open: true,
    onOpenChange: fn(),
  },
} satisfies Meta<typeof BlockEditDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CreateRichText: Story = {
  args: {
    blockType: 'RICH_TEXT',
  },
};

export const CreateHtml: Story = {
  args: {
    blockType: 'HTML',
  },
};

export const CreateImage: Story = {
  args: {
    blockType: 'IMAGE',
  },
};

export const CreateIframe: Story = {
  args: {
    blockType: 'IFRAME',
  },
};

/**
 * Stage 7h 작업 1 — IFRAME 블록의 호스트 화이트리스트 거부 경로 검증.
 * `normalizeIframeEmbedUrl`이 YouTube/Vimeo 외 호스트는 null 반환 → submit 직전에
 * 차단 + toast.error. 관리자가 우회 입력해도 서버까지 가기 전에 방어되는지 회귀 방어.
 *
 * mutation은 호출되지 않으므로 `useCreateBlock`의 fetch 경로와 무관하게 안전하게 동작.
 */
export const CreateIframeInvalidUrl: Story = {
  args: {
    blockType: 'IFRAME',
  },
  play: async ({ canvasElement: _ }) => {
    // Dialog는 body portal에 렌더되므로 canvasElement 범위가 아닌 document.body 사용
    const body = within(document.body);

    const urlInput = await body.findByLabelText(/iframe URL/i);
    await userEvent.clear(urlInput);
    await userEvent.type(urlInput, 'https://example.com/video/xyz');

    await userEvent.click(body.getByRole('button', { name: '저장' }));

    expect(
      await body.findByText(/임베드 가능한 URL이 아닙니다/),
    ).toBeInTheDocument();
  },
};
