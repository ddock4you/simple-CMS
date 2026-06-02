import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from 'storybook/test';

import { FrequentMenuSection } from './FrequentMenuSection';

const iconUrls = [
  makeIconSvg('business', '#256ef4'),
  makeIconSvg('school', '#00a36f'),
  makeIconSvg('tax', '#7c3aed'),
  makeIconSvg('car', '#f97316'),
  makeIconSvg('passport', '#0f766e'),
  makeIconSvg('building', '#64748b'),
] as const;

const meta = {
  title: 'Web/Features/HomeSection/FrequentMenuSection',
  component: FrequentMenuSection,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof FrequentMenuSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SixItems: Story = {
  args: {
    section: {
      id: 'frequent-menu-1',
      sectionType: 'FREQUENT_MENU',
      config: {
        heading: '자주찾는 메뉴',
        items: [],
      },
      items: [
        '사업자등록 증명',
        '취학 통지서',
        '지방세 납세증명',
        '자동차등록원부',
        '여권재발급',
        '건축물대장',
      ].map((title, index) => ({
        title,
        href: index === 0 ? 'https://example.com' : `/p/frequent-${index}`,
        openInNewTab: index === 0,
        iconUrl: iconUrls[index],
        iconAlt: `${title} 아이콘`,
      })),
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText('자주찾는 메뉴')).toBeInTheDocument();
    expect(canvas.getAllByRole('link')).toHaveLength(6);
    expect(
      canvas.getByRole('link', { name: /사업자등록 증명/ }),
    ).toHaveAttribute('target', '_blank');
    expect(canvas.getByText('건축물대장')).toBeInTheDocument();
  },
};

function makeIconSvg(kind: string, color: string): string {
  const iconPathByKind: Record<string, string> = {
    business:
      '<path d="M15 11h34v32H15z" fill="white" stroke="currentColor" stroke-width="3"/><path d="M22 11V7h20v4M22 20h20M22 28h20M22 36h12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    school:
      '<path d="M8 24l24-11 24 11-24 11L8 24z" fill="white" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M18 30v10c5 6 23 6 28 0V30" fill="white" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>',
    tax: '<rect x="15" y="10" width="34" height="44" rx="4" fill="white" stroke="currentColor" stroke-width="3"/><path d="M23 22h18M23 31h18M23 40h10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M38 45l8 8 8-14" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    car: '<path d="M14 35h36l-4-12H18l-4 12z" fill="white" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M11 35h42v10H11z" fill="white" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="21" cy="47" r="4" fill="currentColor"/><circle cx="43" cy="47" r="4" fill="currentColor"/>',
    passport:
      '<rect x="18" y="8" width="28" height="48" rx="4" fill="white" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="29" r="10" fill="none" stroke="currentColor" stroke-width="3"/><path d="M22 45h20M32 19c4 5 4 15 0 20M32 19c-4 5-4 15 0 20M23 29h18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
    building:
      '<path d="M14 54h36V18L32 9 14 18v36z" fill="white" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M24 54V40h16v14M23 25h4M37 25h4M23 34h4M37 34h4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  };

  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" color="${color}"><circle cx="32" cy="32" r="30" fill="${color}" opacity="0.12"/>${iconPathByKind[kind]}</svg>`,
  )}`;
}

export const Empty: Story = {
  args: {
    section: {
      id: 'frequent-menu-empty',
      sectionType: 'FREQUENT_MENU',
      config: {
        heading: '자주찾는 메뉴',
        items: [],
      },
      items: [],
    },
  },
  play: async ({ canvasElement }) => {
    expect(canvasElement.querySelector('section')).toBeNull();
  },
};
