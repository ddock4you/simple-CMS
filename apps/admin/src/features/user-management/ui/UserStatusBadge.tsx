import type { UserStatus } from '@simple-cms/db';

import { Badge } from '@/shared/ui/shadcn/badge';

const STATUS_CONFIG: Record<
  UserStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING: { label: '대기', variant: 'outline' },
  ACTIVE: { label: '활성', variant: 'default' },
  SUSPENDED: { label: '정지', variant: 'destructive' },
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const { label, variant } = STATUS_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
