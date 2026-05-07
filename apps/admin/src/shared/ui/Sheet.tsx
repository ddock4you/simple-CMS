'use client';

import type { ComponentProps } from 'react';
import {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent as ShadcnSheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '@/shared/ui/shadcn/sheet';
import { cn } from '@/shared/lib/utils';

function SheetContent({ className, ...props }: ComponentProps<typeof ShadcnSheetContent>) {
  return <ShadcnSheetContent className={cn('shadow-popover', className)} {...props} />;
}
SheetContent.displayName = 'SheetContent';

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
