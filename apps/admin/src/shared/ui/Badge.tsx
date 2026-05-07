import type { ComponentProps } from 'react';

import { Badge as ShadcnBadge } from '@/shared/ui/shadcn/badge';
import { cn } from '@/shared/lib/utils';

type ShadcnBadgeProps = ComponentProps<typeof ShadcnBadge>;
type ShadcnVariant = ShadcnBadgeProps['variant'];

export type BadgeProps = Omit<ShadcnBadgeProps, 'variant'> & {
  variant?: ShadcnVariant | 'success' | 'warning';
};

export function Badge({ variant, className, ...props }: BadgeProps) {
  if (variant === 'success') {
    return (
      <ShadcnBadge
        {...props}
        variant="default"
        className={cn('border-transparent bg-success text-success-foreground', className)}
      />
    );
  }
  if (variant === 'warning') {
    return (
      <ShadcnBadge
        {...props}
        variant="default"
        className={cn('border-transparent bg-warning text-warning-foreground', className)}
      />
    );
  }
  return <ShadcnBadge {...props} variant={variant as ShadcnVariant} className={className} />;
}
