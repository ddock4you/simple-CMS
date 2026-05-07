'use client';

import type * as React from 'react';

import {
  AlertDialogContent as ShadcnAlertDialogContent,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './shadcn/alert-dialog';

type AlertDialogContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof ShadcnAlertDialogContent>,
  'size'
> & {
  size?: 'confirm' | 'default' | 'wide';
};

function AlertDialogContent({ size = 'confirm', ...props }: AlertDialogContentProps) {
  return <ShadcnAlertDialogContent size={size} {...props} />;
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
