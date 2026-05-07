'use client';

import type { ComponentProps } from 'react';
import {
  Popover,
  PopoverContent as ShadcnPopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/shared/ui/shadcn/popover';
import { cn } from '@/shared/lib/utils';

function PopoverContent({ className, ...props }: ComponentProps<typeof ShadcnPopoverContent>) {
  return <ShadcnPopoverContent className={cn('shadow-popover', className)} {...props} />;
}
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger };
