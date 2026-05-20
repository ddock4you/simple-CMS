import type { Meta, StoryObj } from '@storybook/react';

import { storyShellDecorator } from './lib/storyShell';
import { GroupHeader, SectionHeader, TypographySample } from './lib/TokenSwatch';
import {
  KRDS_FONT_WEIGHTS,
  KRDS_TYPOGRAPHY,
  type KrdsTypographyToken,
} from './lib/krdsTokens';

const meta = {
  title: 'Web/Design System/KRDS Typography',
  decorators: [storyShellDecorator],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'KRDS plugin 타이포 스케일. 폰트: **Pretendard Variable** (`apps/web/app/layout.tsx` + `.storybook/preview-head.html` CDN). ' +
          '`display / heading / title / body / detail / label / link` 7개 그룹. desktop 기본 + mobile 변형은 별도. ' +
          '대부분 line-height 150%, display/heading 일부 + title-xxl만 letter-spacing 1px.',
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const Group = ({
  title,
  tokens,
  description,
}: {
  title: string;
  tokens: KrdsTypographyToken[];
  description?: string;
}) => (
  <section className="space-y-[16px] mb-[40px]">
    <GroupHeader title={title} description={description} />
    <div className="space-y-[16px]">
      {tokens.map((t) => (
        <TypographySample key={t.name} {...t} />
      ))}
    </div>
  </section>
);

export const Display: Story = {
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="Display"
        description="가장 큰 표제. 랜딩 페이지 hero, 캠페인 강조"
      />
      <Group
        title="display-l / m / s"
        tokens={KRDS_TYPOGRAPHY.filter((t) => t.group === 'display')}
      />
    </div>
  ),
};

export const Heading: Story = {
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader title="Heading" description="페이지 제목 · 섹션 표제" />
      <Group
        title="heading-l / m / s"
        tokens={KRDS_TYPOGRAPHY.filter((t) => t.group === 'heading')}
      />
    </div>
  ),
};

export const Title: Story = {
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="Title"
        description="카드 · 모달 · 폼 그룹 제목 (32/25/21/19/17/15)"
      />
      <Group
        title="title-xxl ~ xs"
        tokens={KRDS_TYPOGRAPHY.filter((t) => t.group === 'title')}
      />
    </div>
  ),
};

export const Body: Story = {
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader title="Body" description="본문 텍스트 (19/17/15)" />
      <Group title="body-l / m / s" tokens={KRDS_TYPOGRAPHY.filter((t) => t.group === 'body')} />
    </div>
  ),
};

export const DetailLabelLink: Story = {
  name: 'Detail · Label · Link',
  render: () => (
    <div className="max-w-4xl mx-auto">
      <SectionHeader
        title="Detail · Label · Link"
        description="보조 텍스트와 폼 라벨, 앵커. 작은 사이즈 변형들."
      />
      <Group
        title="Detail (17/15/13)"
        description="보조 설명 · 캡션 · 메타"
        tokens={KRDS_TYPOGRAPHY.filter((t) => t.group === 'detail')}
      />
      <Group
        title="Label (19/17/15/13)"
        description="폼 라벨 · 버튼"
        tokens={KRDS_TYPOGRAPHY.filter((t) => t.group === 'label')}
      />
      <Group
        title="Link (19/17/15)"
        description="앵커 텍스트"
        tokens={KRDS_TYPOGRAPHY.filter((t) => t.group === 'link')}
      />
    </div>
  ),
};

export const FontWeight: Story = {
  name: 'Font Weight',
  render: () => (
    <div className="space-y-[16px] max-w-2xl mx-auto">
      <SectionHeader
        title="Font Weight"
        description={
          <>
            KRDS plugin이 제공하는 weight 토큰: <code className="font-mono text-[12px]">font-regular</code> (400), <code className="font-mono text-[12px]">font-bold</code> (700). ‼ 그 외 단계(300/500/600)는 KRDS plugin에 포함 안 됨 — Pretendard Variable은 100~900 모두 지원하므로 Tailwind 기본 <code className="font-mono text-[12px]">font-N</code> utility로 사용 가능.
          </>
        }
      />
      {KRDS_FONT_WEIGHTS.map((w) => (
        <div
          key={w.name}
          className="p-[24px]"
          style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
        >
          <div className="flex items-baseline justify-between mb-[8px]">
            <code className="font-mono text-[17px] font-bold">{w.utility}</code>
            <span className="font-mono text-[14px]" style={{ color: '#717171' }}>
              {w.value}
            </span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: w.value, lineHeight: 1.5, margin: 0 }}>
            대한민국 정부 디자인 시스템 KRDS · Pretendard Variable
          </p>
        </div>
      ))}
    </div>
  ),
};

export const FontFamily: Story = {
  render: () => (
    <div className="space-y-[20px] max-w-3xl mx-auto">
      <SectionHeader
        title="Font Family"
        description="Pretendard Variable + 시스템 폰트 stack. 한글 우선, 영문/숫자/이모지 fallback."
      />
      <div
        className="p-[28px]"
        style={{ borderRadius: 8, border: '1px solid #E4E4E4', backgroundColor: '#FFFFFF' }}
      >
        <h4 className="text-[17px] font-bold mb-[8px]">Pretendard Variable</h4>
        <p className="font-mono text-[12px] mb-[12px] leading-relaxed" style={{ color: '#555555' }}>
          CDN: cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css<br />
          폴백: -apple-system, BlinkMacSystemFont, system-ui, Roboto, &apos;Apple SD Gothic Neo&apos;, &apos;Noto Sans KR&apos;
        </p>
        <p style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.3, margin: 0 }}>
          대한민국 정부 디자인 시스템 — 공공 웹사이트
        </p>
        <p style={{ fontSize: 17, fontWeight: 400, lineHeight: 1.5, marginTop: 12 }}>
          The quick brown fox jumps over the lazy dog. 0123456789 한글 텍스트와 영문이 자연스럽게 어울리도록 설계.
        </p>
      </div>
    </div>
  ),
};
