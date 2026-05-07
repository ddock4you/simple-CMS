'use client';

import type * as React from 'react';

import { cn } from '@/shared/lib/utils';
import { Button as ShadcnButton, buttonVariants } from './shadcn/button';

type ShadcnButtonProps = React.ComponentPropsWithoutRef<typeof ShadcnButton>;

function Button({ size, className, ...props }: ShadcnButtonProps) {
  // sm baseline 32px 정렬: shadcn sm 변형의 h-7을 h-8로 override
  const sizeOverride = size === 'sm' ? 'h-8' : '';
  return (
    <ShadcnButton
      size={size}
      className={cn(sizeOverride, className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
