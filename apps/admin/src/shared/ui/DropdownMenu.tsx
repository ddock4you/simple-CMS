'use client';

import type { ComponentProps } from 'react';
import {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent as ShadcnDropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent as ShadcnDropdownMenuSubContent,
} from '@/shared/ui/shadcn/dropdown-menu';
import { cn } from '@/shared/lib/utils';

function DropdownMenuContent({
  className,
  ...props
}: ComponentProps<typeof ShadcnDropdownMenuContent>) {
  return <ShadcnDropdownMenuContent className={cn('shadow-popover', className)} {...props} />;
}
DropdownMenuContent.displayName = 'DropdownMenuContent';

function DropdownMenuSubContent({
  className,
  ...props
}: ComponentProps<typeof ShadcnDropdownMenuSubContent>) {
  return <ShadcnDropdownMenuSubContent className={cn('shadow-popover', className)} {...props} />;
}
DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
