'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { Decorator } from '@storybook/react';

// Storybook shell padding is inline to keep design-system stories independent
// from Tailwind source scanning and token changes.
const OUTER_STYLE: CSSProperties = {
  paddingTop: 48,
  paddingBottom: 48,
  paddingLeft: 32,
  paddingRight: 32,
};

function StoryShellInner({ children }: { children: ReactNode }) {
  return <div style={OUTER_STYLE}>{children}</div>;
}

export const storyShellDecorator: Decorator = (Story) => (
  <StoryShellInner>
    <Story />
  </StoryShellInner>
);
