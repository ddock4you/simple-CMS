import type { Meta, StoryObj } from '@storybook/react';

import { DarkModeContainer } from './lib/colorMode';
import { storyShellDecorator } from './lib/storyShell';
import { GroupHeader, SectionHeader } from './lib/TokenSwatch';
import { CONTROL_HEIGHT_TOKENS, SHADOW_TOKENS } from './lib/tokenList';

const meta = {
  title: 'Admin/Design System/Admin Customs',
  decorators: [storyShellDecorator],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'admin 고유 정책 — Stage 15에서 정립된 design.md 기반 토큰 · 컴포넌트 wrapper · 페이지 레이아웃 표준. ' +
          'web의 "Web Customs"와 대응되는 위치.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Shadow: Story = {
  name: 'Shadow 토큰',
  parameters: {
    docs: {
      description: {
        story:
          'Stage 15b/15c에서 추가된 3개 shadow 토큰. ' +
          '`@theme inline { --shadow-card: var(--shadow-card-value); }` + `:root` / `.dark`에 페어 정의. ' +
          'light는 2~4% alpha, dark는 15~30% alpha.',
      },
    },
  },
  render: () => (
    <DarkModeContainer>
      <div>
        <SectionHeader
          title="Shadow 토큰"
          description="admin은 그림자보다 명도 계조로 elevation을 표현. shadow는 sticky toolbar · dialog 등 부유 표면에 한정."
        />
        <div className="grid gap-6">
          {SHADOW_TOKENS.map((t) => (
            <div key={t.name} className="space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-mono text-[17px] font-semibold">{t.name}</span>
                  <code className="font-mono text-[12px] text-muted-foreground ml-3">
                    {t.utility}
                  </code>
                </div>
                <code className="font-mono text-[12px] text-muted-foreground">{t.cssVar}</code>
              </div>
              <div className="bg-muted rounded-lg p-12 flex items-center justify-center">
                <div
                  className={`bg-card text-card-foreground rounded-lg p-8 min-w-[280px] text-center shadow-${t.name}`}
                >
                  <div className="text-[17px] font-semibold">shadow-{t.name}</div>
                  <div className="text-[14px] text-muted-foreground mt-1">{t.description}</div>
                </div>
              </div>
              <p className="text-[14px] text-muted-foreground">
                <span className="font-semibold">사용처:</span> {t.usage}
              </p>
            </div>
          ))}
        </div>
        <p className="text-[14px] text-muted-foreground mt-6 leading-relaxed">
          wrapper 정책: Popover · Select · DropdownMenu · Sheet는 <code className="font-mono text-[12px] bg-muted px-1.5 py-0.5 rounded">shared/ui/{'{Popover,Select,...}'}</code> wrapper가 <code className="font-mono text-[12px] bg-muted px-1.5 py-0.5 rounded">shadow-popover</code> 주입. shadcn 원본 직접 import는 ESLint로 차단.
        </p>
      </div>
    </DarkModeContainer>
  ),
};

export const PageLayout: Story = {
  name: '페이지 레이아웃 표준',
  render: () => (
    <div className="bg-muted/30 rounded-lg p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          title="페이지 레이아웃 구조"
          description="AdminHeader → PageHeader → PageToolbar → 본문. Stage 14a에서 정립된 표준."
        />
        <div className="space-y-3">
          <div className="rounded-lg border-2 border-dashed border-primary/30 bg-card p-5">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-mono text-[17px] font-semibold">AdminHeader</span>
              <code className="font-mono text-[12px] text-muted-foreground">
                sticky top-0 z-10 · h-14
              </code>
            </div>
            <p className="text-[14px] text-muted-foreground">
              사이트명 · 검색 트리거(Cmd+K) · 사용자 메뉴
            </p>
          </div>
          <div className="rounded-lg border-2 border-dashed border-primary/30 bg-card p-5">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-mono text-[17px] font-semibold">PageHeader</span>
              <code className="font-mono text-[12px] text-muted-foreground">
                sticky 아님 (default false)
              </code>
            </div>
            <p className="text-[14px] text-muted-foreground">
              슬롯: back / title / description / tabs
            </p>
          </div>
          <div className="rounded-lg border-2 border-dashed border-primary/30 bg-card p-5">
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-mono text-[17px] font-semibold">PageToolbar</span>
              <code className="font-mono text-[12px] text-muted-foreground">sticky top-14 z-20</code>
            </div>
            <p className="text-[14px] text-muted-foreground">
              left=필터/검색(Read) · right=CUD 버튼. 편집 폼 [저장]/[삭제] 위치
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 min-h-[160px]">
            <span className="font-mono text-[17px] font-semibold">본문 영역</span>
            <p className="text-[14px] text-muted-foreground mt-1">Card · 테이블 · 편집 폼</p>
          </div>
        </div>
        <p className="text-[14px] text-muted-foreground mt-6 leading-relaxed">
          편집 폼 패턴:{' '}
          <code className="font-mono text-[12px] bg-muted px-2 py-0.5 rounded">
            {'<form> + PageHeader + PageToolbar(저장/삭제) + Card(폼 필드)'}
          </code>
        </p>
      </div>
    </div>
  ),
};

export const ZIndex: Story = {
  name: 'z-index 계단',
  render: () => {
    const layers = [
      { name: 'AdminHeader', z: 'z-10', note: 'sticky top-0' },
      { name: 'PageToolbar', z: 'z-20', note: 'sticky top-14 (AdminHeader 높이)' },
      { name: 'Dialog (shadcn 기본)', z: 'z-50', note: '오버레이 + 컨텐츠' },
      { name: 'Toast (sonner 기본)', z: 'z-[100]', note: '항상 최상단' },
    ];
    return (
      <div className="max-w-3xl mx-auto">
        <SectionHeader
          title="z-index 계단"
          description="sticky 헤더 / toolbar / 부유 dialog / toast의 z-index 순위. 임의 z-index 사용 금지 — 이 표를 기준으로 결정."
        />
        <div className="space-y-2">
          {layers.map((layer) => (
            <div
              key={layer.name}
              className="rounded-lg border bg-card text-card-foreground p-4 flex items-baseline gap-4"
            >
              <span className="font-mono text-[17px] font-semibold flex-1">{layer.name}</span>
              <code className="font-mono text-[14px] text-muted-foreground">{layer.z}</code>
              <span className="text-[14px] text-muted-foreground flex-1 text-right">
                {layer.note}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const ControlHeight: Story = {
  name: '폼 컨트롤 height',
  parameters: {
    docs: {
      description: {
        story:
          'PageToolbar/Dialog 내부 모든 폼 컨트롤은 32px 단일 baseline. design.md §4.5. ' +
          '`default` / `sm` 모두 h-8 — sm은 padding/font/rounded만 차별. ' +
          'Button은 `@/shared/ui/Button` wrapper 경유 필수.',
      },
    },
  },
  render: () => (
    <div className="max-w-3xl mx-auto">
      <SectionHeader
        title="폼 컨트롤 높이"
        description="32px 단일 baseline. design.md §4.5 정책. Button은 @/shared/ui/Button wrapper 경유 필수."
      />
      <div className="space-y-2">
        {CONTROL_HEIGHT_TOKENS.map((t) => (
          <div
            key={t.name}
            className="rounded-lg border bg-card text-card-foreground p-4 flex items-baseline gap-4"
          >
            <span className="font-mono text-[17px] font-semibold w-24 flex-shrink-0">
              {t.name}
            </span>
            <code className="font-mono text-[14px] text-muted-foreground w-48 flex-shrink-0">
              {t.cssVar}
            </code>
            <span className="font-mono text-[14px] w-28 flex-shrink-0">{t.px}</span>
            <span className="text-[14px] text-muted-foreground flex-1">{t.description}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-lg border bg-card p-5">
        <h4 className="text-[17px] font-semibold mb-3">영구 예외 (design.md 부록 B)</h4>
        <ul className="text-[14px] text-muted-foreground space-y-1.5 list-disc pl-5 leading-relaxed">
          <li>
            <code className="font-mono text-[12px]">InlineStatusSwitchToggle</code> /{' '}
            <code className="font-mono text-[12px]">InlineBooleanToggle</code> — 테이블 행 인라인 토글 (행 밀도 유지)
          </li>
          <li>
            Table thead <code className="font-mono text-[12px]">h-10</code> — 테이블 헤더 고유 높이
          </li>
          <li>
            Sidebar nav lg <code className="font-mono text-[12px]">h-12</code> — 사이드바 전용 토큰 사용 영역
          </li>
          <li>
            Input <code className="font-mono text-[12px]">file:h-6</code> — OS 렌더 제약
          </li>
        </ul>
      </div>
    </div>
  ),
};

export const WrapperPolicy: Story = {
  name: 'shadcn wrapper 정책',
  parameters: {
    docs: {
      description: {
        story:
          'Stage 15c-2/3에서 정립된 wrapper 패턴. shadcn 원본 직접 import 금지, wrapper 경유 필수. ESLint `no-restricted-imports`로 자동 차단.',
      },
    },
  },
  render: () => {
    const wrappers = [
      {
        component: 'Popover · Select · DropdownMenu · Sheet',
        wrapper: 'shared/ui/{Popover,Select,DropdownMenu,Sheet}.tsx',
        injects: 'shadow-popover',
        stage: '15c-2',
        note: 'Content 컴포넌트에 className 머지',
      },
      {
        component: 'AlertDialog',
        wrapper: 'shared/ui/AlertDialog.tsx',
        injects: 'size 토큰 3-tier (confirm/default/wide)',
        stage: '15c-3c/3e',
        note: 'AlertDialogContent만 wrapper 함수, 나머지 11개는 단순 re-export',
      },
      {
        component: 'Button',
        wrapper: 'shared/ui/Button.tsx',
        injects: 'sm size h-8 override (32px baseline)',
        stage: '15c-3f',
        note: 'buttonVariants re-export 유지',
      },
      {
        component: 'Badge',
        wrapper: 'shared/ui/Badge.tsx',
        injects: 'success / warning variant 추가',
        stage: '15c-3b',
        note: '신규 호출처는 wrapper 사용, 기존은 점진 swap',
      },
    ];
    return (
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          title="shadcn wrapper 정책"
          description="shadcn 원본은 shared/ui/shadcn/ 하위. 직접 수정 금지. wrapper가 정책(shadow · size · height · variant)을 주입."
        />
        <div className="space-y-3">
          {wrappers.map((w) => (
            <div
              key={w.component}
              className="rounded-lg border bg-card text-card-foreground p-5"
            >
              <div className="flex items-baseline justify-between mb-2">
                <h4 className="text-[17px] font-semibold">{w.component}</h4>
                <code className="font-mono text-[12px] text-muted-foreground">
                  Stage {w.stage}
                </code>
              </div>
              <div className="text-[14px] space-y-1">
                <div>
                  <span className="text-muted-foreground">Wrapper:</span>{' '}
                  <code className="font-mono text-[12px] bg-muted px-1.5 py-0.5 rounded">
                    {w.wrapper}
                  </code>
                </div>
                <div>
                  <span className="text-muted-foreground">주입:</span> {w.injects}
                </div>
                <div className="text-[12px] text-muted-foreground italic pt-1">{w.note}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-muted-foreground mt-6 leading-relaxed">
          🛡 ESLint <code className="font-mono">no-restricted-imports</code>로 shadcn 원본 직접 import 차단 (wrapper · shadcn 디렉토리 내부는 예외).
        </p>
      </div>
    );
  },
};

export const DialogSizeTokens: Story = {
  name: 'Dialog size 토큰',
  parameters: {
    docs: {
      description: {
        story:
          'Stage 14e에서 정립. `<DialogContent size="sm|md|lg|xl">` — ad-hoc `max-w-*` className 직접 사용 금지.',
      },
    },
  },
  render: () => (
    <div className="max-w-3xl mx-auto">
      <SectionHeader
        title="Dialog size 토큰"
        description="Dialog · AlertDialog 모두 size 토큰으로 max-width 표현. ad-hoc max-w-* 사용 금지."
      />
      <div className="space-y-6">
        <div>
          <GroupHeader title="Dialog (입력 폼)" description="Stage 14e — 4-tier" />
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-[14px] font-semibold">size</th>
                  <th className="text-left p-3 text-[14px] font-semibold">max-width</th>
                  <th className="text-left p-3 text-[14px] font-semibold">용도</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { size: 'sm', mw: 'max-w-md', use: '간단 입력 (1~2 필드)' },
                  { size: 'md', mw: 'max-w-lg', use: '중간 (3~5 필드)' },
                  { size: 'lg', mw: 'max-w-3xl', use: '복합 폼 (Tiptap 등)' },
                  { size: 'xl', mw: 'max-w-5xl', use: '대형 작업 영역' },
                ].map((row) => (
                  <tr key={row.size} className="border-t">
                    <td className="p-3 font-mono text-[14px] font-semibold">{row.size}</td>
                    <td className="p-3 font-mono text-[14px] text-muted-foreground">{row.mw}</td>
                    <td className="p-3 text-[14px]">{row.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <GroupHeader title="AlertDialog (확인 액션)" description="Stage 15c-3e — 3-tier" />
          <div className="rounded-lg border bg-card overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-[14px] font-semibold">size</th>
                  <th className="text-left p-3 text-[14px] font-semibold">max-width</th>
                  <th className="text-left p-3 text-[14px] font-semibold">용도</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { size: 'confirm', mw: 'max-w-xs sm:max-w-sm', use: '단순 확인 (1~2줄, 기본값)' },
                  { size: 'default', mw: 'max-w-md', use: '설명 필요 · 소량 동적 콘텐츠' },
                  { size: 'wide', mw: 'max-w-xl', use: '참조 목록 등 동적 콘텐츠 (Bulk 작업)' },
                ].map((row) => (
                  <tr key={row.size} className="border-t">
                    <td className="p-3 font-mono text-[14px] font-semibold">{row.size}</td>
                    <td className="p-3 font-mono text-[14px] text-muted-foreground">{row.mw}</td>
                    <td className="p-3 text-[14px]">{row.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <p className="text-[14px] text-muted-foreground mt-6">
        ‼ 액션이 있는 일반 Dialog는 <code className="font-mono text-[12px]">{'<DialogToolbar>'}</code> + <code className="font-mono text-[12px]">bodyOnlyScroll</code> + <code className="font-mono text-[12px]">{'<DialogBody>'}</code> 조합 사용 — Dialog 헤더/툴바 고정 + 본문만 스크롤. AlertDialog는 제외.
      </p>
    </div>
  ),
};
