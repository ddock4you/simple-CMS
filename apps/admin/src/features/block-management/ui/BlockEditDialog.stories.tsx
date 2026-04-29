import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

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
 * Stage 12e — HTML 탭 전환 검증.
 * defaultValue="html"이라 HTML 탭이 처음부터 active.
 * CSS 탭 클릭 후 active 상태가 바뀌는지 회귀 방어.
 */
export const CreateHtmlTabSwitch: Story = {
  args: { blockType: 'HTML' },
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    const htmlTab = await body.findByRole('tab', { name: 'HTML' });
    const cssTab = body.getByRole('tab', { name: 'CSS' });

    // Base UI Tabs는 Radix와 달리 data-state 대신 data-active boolean 속성 사용
    expect(htmlTab).toHaveAttribute('data-active');

    await userEvent.click(cssTab);

    expect(cssTab).toHaveAttribute('data-active');
    expect(htmlTab).not.toHaveAttribute('data-active');
  },
};

/**
 * Stage 12e — HTML 블록 빈 입력 검증.
 * html: '' 기본값으로 저장 시도 → Zod min(1) 실패 → toast 표시.
 */
export const CreateHtmlEmptyValidation: Story = {
  args: { blockType: 'HTML' },
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole('button', { name: '저장' }));
    expect(await body.findByText(/HTML을 입력해주세요/)).toBeInTheDocument();
  },
};

/**
 * Stage 12e — IMAGE 블록 URL 필수 검증.
 * alt만 입력하고 imageUrl 비워서 저장 → imageUrl 에러 toast.
 */
export const CreateImageUrlRequired: Story = {
  args: { blockType: 'IMAGE' },
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    const altInput = await body.findByLabelText(/대체 텍스트/);
    await userEvent.type(altInput, '이미지 설명');
    await userEvent.click(await body.findByRole('button', { name: '저장' }));
    expect(
      await body.findByText(/이미지 URL을 입력해주세요/),
    ).toBeInTheDocument();
  },
};

/**
 * Stage 12e — IMAGE 블록 alt 필수 검증.
 * imageUrl만 입력하고 alt 비워서 저장 → imageAlt 에러 toast.
 */
export const CreateImageAltRequired: Story = {
  args: { blockType: 'IMAGE' },
  play: async ({ canvasElement: _ }) => {
    const body = within(document.body);
    const urlInput = await body.findByLabelText('이미지');
    await userEvent.type(urlInput, 'https://example.com/photo.jpg');
    await userEvent.click(body.getByRole('button', { name: '저장' }));
    expect(
      await body.findByText(/이미지 대체 텍스트\(alt\)는 필수/),
    ).toBeInTheDocument();
  },
};

/**
 * Stage 12e — IFRAME 유효한 URL + 제목 → 저장 성공 경로.
 * YouTube 일반 시청 URL은 normalizeIframeEmbedUrl이 embed URL로 변환 후 mutation 성공.
 * onOpenChange(false) 호출 여부로 dialog 닫힘을 검증.
 */
export const CreateIframeValidUrl: Story = {
  args: { blockType: 'IFRAME' },
  parameters: {
    fetchMock: {
      '/api/subpages/story-subpage-1/blocks': {
        status: 201,
        body: { success: true, data: { id: 'new-block-id' } },
      },
    },
  },
  play: async ({ args, canvasElement: _ }) => {
    const body = within(document.body);
    const urlInput = await body.findByLabelText(/iframe URL/i);
    await userEvent.clear(urlInput);
    await userEvent.type(
      urlInput,
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
    const titleInput = body.getByLabelText(/제목/);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, '유튜브 영상');
    await userEvent.click(body.getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(args.onOpenChange).toHaveBeenCalledWith(false),
    );
  },
};

/**
 * Stage 7h — IFRAME 블록의 호스트 화이트리스트 거부 경로 검증.
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
