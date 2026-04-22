import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';

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
