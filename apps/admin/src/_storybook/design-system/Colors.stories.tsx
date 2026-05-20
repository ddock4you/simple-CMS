import type { Meta, StoryObj } from '@storybook/react';

import { DarkModeContainer } from './lib/colorMode';
import { storyShellDecorator } from './lib/storyShell';
import { ColorSwatch, GroupHeader, SectionHeader } from './lib/TokenSwatch';
import {
  CHART_TOKENS,
  SIDEBAR_TOKENS,
  getColorsByCategory,
  type ColorToken,
  type ExtraColorToken,
} from './lib/tokenList';

const meta = {
  title: 'Admin/Design System/Colors',
  decorators: [storyShellDecorator],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'globals.css의 :root + .dark 페어가 runtime 권위. design.md §2 색 시스템과 동일 토큰 22개 + sidebar 8 + chart 5. ' +
          'admin 유일 액션 색은 `--primary` (#171717). 다크 모드 토글 버튼으로 light/dark 양쪽 확인 가능.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{children}</div>
);

const Section = ({
  title,
  description,
  tokens,
}: {
  title: string;
  description: string;
  tokens: ColorToken[] | ExtraColorToken[];
}) => (
  <div>
    <SectionHeader title={title} description={description} />
    <Grid>
      {tokens.map((t) => (
        <ColorSwatch
          key={t.cssVar}
          cssVar={t.cssVar}
          utility={t.utility}
          yamlKey={t.yamlKey}
          description={t.description}
        />
      ))}
    </Grid>
  </div>
);

export const Surface: Story = {
  name: 'Surface',
  render: () => (
    <DarkModeContainer>
      <Section
        title="Surface"
        description="페이지 · 카드 · 다이얼로그 등 표면 색. 10 토큰. light/dark 페어 비교 가능."
        tokens={getColorsByCategory('surface')}
      />
    </DarkModeContainer>
  ),
};

export const Action: Story = {
  name: 'Action',
  parameters: {
    docs: {
      description: {
        story:
          '주 CTA · 보조 액션 · 삭제 액션. **admin은 단일 액션 색 정책** — `--primary` (#171717)만 주 CTA로 사용. 두 번째 브랜드 색 신설 금지.',
      },
    },
  },
  render: () => (
    <DarkModeContainer>
      <Section
        title="Action"
        description="버튼 · CTA · 폼 확정 액션. 5 토큰."
        tokens={getColorsByCategory('action')}
      />
    </DarkModeContainer>
  ),
};

export const Status: Story = {
  name: 'Status',
  parameters: {
    docs: {
      description: {
        story:
          '시맨틱 피드백 색. Stage 15c-3a에서 추가됨. destructive와 동일 위계지만 차이는 — destructive는 액션, success/warning은 상태.',
      },
    },
  },
  render: () => (
    <DarkModeContainer>
      <Section
        title="Status"
        description="긍정 평가 · DNS 정상 · pin 표시 · slug 경고 등 상태 표현. 4 토큰."
        tokens={getColorsByCategory('status')}
      />
    </DarkModeContainer>
  ),
};

export const Border: Story = {
  name: 'Border · Input · Focus',
  render: () => (
    <DarkModeContainer>
      <Section
        title="Border · Input · Focus"
        description="경계 · 입력 컨트롤 · focus ring. 3 토큰."
        tokens={getColorsByCategory('border')}
      />
    </DarkModeContainer>
  ),
};

export const Sidebar: Story = {
  name: 'Sidebar',
  parameters: {
    docs: {
      description: {
        story:
          '`AppSidebar` 전용 토큰 8개. design.md YAML 제외 — globals.css가 단일 정의. `--primary`와 분리하여 사이드바 영역만 독립적으로 색 관리.',
      },
    },
  },
  render: () => (
    <DarkModeContainer>
      <Section
        title="Sidebar"
        description="AppSidebar 전용 색 토큰. design.md YAML에서 의도적으로 제외."
        tokens={SIDEBAR_TOKENS}
      />
    </DarkModeContainer>
  ),
};

export const Chart: Story = {
  name: 'Chart',
  parameters: {
    docs: {
      description: {
        story: 'recharts 시각화 전용. `shared/lib/chartColors.ts`가 mount 시 CSS variable에서 읽어 chart series에 주입.',
      },
    },
  },
  render: () => (
    <DarkModeContainer>
      <Section
        title="Chart"
        description="recharts 5개 series 색. design.md YAML 제외."
        tokens={CHART_TOKENS}
      />
    </DarkModeContainer>
  ),
};

export const All: Story = {
  name: '전체',
  render: () => (
    <DarkModeContainer>
      <div>
        <SectionHeader
          title="Admin 전체 색 토큰"
          description="design.md YAML 22 + Sidebar 8 + Chart 5. light/dark 토글 가능."
        />

        <div className="mb-8">
          <GroupHeader title="Surface" />
          <Grid>
            {getColorsByCategory('surface').map((t) => (
              <ColorSwatch key={t.cssVar} cssVar={t.cssVar} utility={t.utility} yamlKey={t.yamlKey} description={t.description} />
            ))}
          </Grid>
        </div>
        <div className="mb-8">
          <GroupHeader title="Action" />
          <Grid>
            {getColorsByCategory('action').map((t) => (
              <ColorSwatch key={t.cssVar} cssVar={t.cssVar} utility={t.utility} yamlKey={t.yamlKey} description={t.description} />
            ))}
          </Grid>
        </div>
        <div className="mb-8">
          <GroupHeader title="Status" />
          <Grid>
            {getColorsByCategory('status').map((t) => (
              <ColorSwatch key={t.cssVar} cssVar={t.cssVar} utility={t.utility} yamlKey={t.yamlKey} description={t.description} />
            ))}
          </Grid>
        </div>
        <div className="mb-8">
          <GroupHeader title="Border · Input · Focus" />
          <Grid>
            {getColorsByCategory('border').map((t) => (
              <ColorSwatch key={t.cssVar} cssVar={t.cssVar} utility={t.utility} yamlKey={t.yamlKey} description={t.description} />
            ))}
          </Grid>
        </div>
        <div className="mb-8">
          <GroupHeader title="Sidebar (전용)" description="design.md YAML 제외" />
          <Grid>
            {SIDEBAR_TOKENS.map((t) => (
              <ColorSwatch key={t.cssVar} cssVar={t.cssVar} utility={t.utility} description={t.description} />
            ))}
          </Grid>
        </div>
        <div>
          <GroupHeader title="Chart (recharts)" description="design.md YAML 제외" />
          <Grid>
            {CHART_TOKENS.map((t) => (
              <ColorSwatch key={t.cssVar} cssVar={t.cssVar} utility={t.utility} description={t.description} />
            ))}
          </Grid>
        </div>
      </div>
    </DarkModeContainer>
  ),
};

const WCAG_ROWS = [
  { fg: '--foreground', bg: '--background', ratio: '~19.8:1', grade: 'AAA' },
  { fg: '--primary-foreground', bg: '--primary', ratio: '~17.2:1', grade: 'AAA' },
  { fg: '--secondary-foreground', bg: '--secondary', ratio: '~16.4:1', grade: 'AAA' },
  { fg: '--destructive-foreground', bg: '--destructive', ratio: '~4.8:1', grade: 'AA' },
  { fg: '--muted-foreground', bg: '--background', ratio: '~4.8:1', grade: 'AA (hint 전용)' },
  { fg: '--success-foreground', bg: '--success', ratio: '~4.9:1', grade: 'AA' },
  { fg: '--warning-foreground', bg: '--warning', ratio: '~7.8:1', grade: 'AAA' },
];

export const WCAGContrast: Story = {
  name: 'WCAG AA 대비율',
  parameters: {
    docs: {
      description: {
        story: 'design.md §2 표 미러. 모든 조합 4.5:1 이상 AA 통과. AAA(7:1) 조합 별도 표시.',
      },
    },
  },
  render: () => (
    <DarkModeContainer>
      <div>
        <SectionHeader
          title="WCAG AA 대비율"
          description="모든 조합이 4.5:1 이상 AA 통과. AAA(7:1) 조합도 별도 표시."
        />
        <div className="space-y-3">
          {WCAG_ROWS.map((row) => (
            <div
              key={`${row.fg}-${row.bg}`}
              className="flex items-center gap-4 rounded-lg border p-5"
              style={{
                backgroundColor: `var(${row.bg})`,
                color: row.fg === '--destructive-foreground' ? 'white' : `var(${row.fg})`,
              }}
            >
              <div className="flex-1">
                <div className="font-mono text-[17px] font-semibold">
                  {row.fg} <span className="opacity-60">on</span> {row.bg}
                </div>
                <div className="text-[14px] opacity-80 mt-1">예: 본문 텍스트 · 버튼 라벨 · Badge</div>
              </div>
              <div className="font-mono text-[17px] font-semibold whitespace-nowrap">
                {row.ratio}
              </div>
              <div className="text-[14px] font-semibold rounded-full px-3 py-1 bg-black/10 backdrop-blur whitespace-nowrap">
                {row.grade}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[12px] text-muted-foreground mt-4 leading-relaxed">
          ⚠ <code>--muted-foreground</code>는 에러 메시지 · 필드 라벨 등 필수 정보에 사용 금지. placeholder · 보조 안내 · 테이블 secondary 텍스트에만 허용.
          <br />
          ⚠ <code>--warning</code> (#ed9800)을 텍스트 색으로 직접 사용 시 white 배경 대비율 ~2.3:1 — 배경 색 또는 <code>--warning-foreground</code> 위 텍스트로만 사용.
        </p>
      </div>
    </DarkModeContainer>
  ),
};
