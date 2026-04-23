import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, within } from 'storybook/test';

import { linkTargetReferencesOptions } from '../api/linkTargetReferencesQueries';
import { LinkTargetInput } from './LinkTargetInput';

/**
 * 메인 팝업 + 홈 섹션(CTA/Hero/Recommended/Shortcut/Notice) 공용 URL 입력 컴포넌트.
 * 단일 `linkUrl: string`을 4가지 UX 모드(NONE/SUBPAGE/BOARD/EXTERNAL)로 분기
 * 입력하며, 편집 진입 시 저장된 url을 정규식 파싱해 탭을 자동 활성화합니다.
 *
 * 내부에서 `useQuery(linkTargetReferencesOptions())` 호출 → story에서는 자체
 * `withMockRefs` decorator로 QueryClient를 덮어쓰고 `setQueryData`로 모의
 * references 주입 (MSW 무의존 패턴, 7h probe와 동일 계열).
 *
 * `allowNone=false`는 url 필수 필드(예: ShortcutFields, CtaFields)에서만 사용.
 * 그 외는 기본 true로 '링크 없음' 옵션 노출.
 */

const MOCK_REFS = {
  subpages: [
    { id: 'sp-1', title: 'About', slug: 'about' },
    { id: 'sp-2', title: 'Contact', slug: 'contact' },
  ],
  boards: [
    { id: 'bd-1', name: '공지사항', slug: 'news' },
    { id: 'bd-2', name: '자료실', slug: 'resources' },
  ],
};

function MockRefsProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const c = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    c.setQueryData(linkTargetReferencesOptions().queryKey, MOCK_REFS);
    return c;
  });
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const withMockRefs: Decorator = (Story) => (
  <MockRefsProvider>
    <Story />
  </MockRefsProvider>
);

const meta = {
  title: 'Admin/Entities/LinkTarget/LinkTargetInput',
  component: LinkTargetInput,
  parameters: {
    layout: 'padded',
  },
  decorators: [withMockRefs],
} satisfies Meta<typeof LinkTargetInput>;

export default meta;

type Story = StoryObj<typeof meta>;

function ControlledDemo({
  initial,
  allowNone = true,
  label = '링크',
}: {
  initial: string;
  allowNone?: boolean;
  label?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <LinkTargetInput
      value={value}
      onChange={setValue}
      label={label}
      allowNone={allowNone}
    />
  );
}

// render에서 ControlledDemo를 사용하므로 args는 실제 사용되지 않지만
// meta.component에 선언된 LinkTargetInput의 Props 타입에 맞추기 위해 placeholder로 제공.
const placeholderArgs = {
  value: '',
  onChange: () => {},
};

export const None: Story = {
  args: placeholderArgs,
  render: () => <ControlledDemo initial="" />,
};

export const SubpageLinked: Story = {
  args: placeholderArgs,
  render: () => <ControlledDemo initial="/p/about" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(await canvas.findByText('About')).toBeInTheDocument();
  },
};

export const BoardLinked: Story = {
  args: placeholderArgs,
  render: () => <ControlledDemo initial="/board/news" />,
};

export const ExternalUrl: Story = {
  args: placeholderArgs,
  render: () => <ControlledDemo initial="https://example.com" />,
};

export const RequiredUrl: Story = {
  args: placeholderArgs,
  render: () => (
    <ControlledDemo initial="" allowNone={false} label="URL *" />
  ),
};
