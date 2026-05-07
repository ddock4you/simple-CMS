'use client';

import type { ComponentProps } from 'react';
import {
  Select,
  SelectContent as ShadcnSelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { cn } from '@/shared/lib/utils';

function SelectContent({ className, ...props }: ComponentProps<typeof ShadcnSelectContent>) {
  return <ShadcnSelectContent className={cn('shadow-popover', className)} {...props} />;
}
SelectContent.displayName = 'SelectContent';

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
