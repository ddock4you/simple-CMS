import type { AuditAction } from '@simple-cms/db';

import { Badge } from '@/shared/ui/shadcn/badge';

const ACTION_CONFIG: Record<
  AuditAction,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  CREATE: { label: '생성', variant: 'default' },
  UPDATE: { label: '수정', variant: 'secondary' },
  DELETE: { label: '삭제', variant: 'destructive' },
  LOGIN: { label: '로그인', variant: 'outline' },
  LOGOUT: { label: '로그아웃', variant: 'outline' },
};

export function AuditActionBadge({ action }: { action: AuditAction }) {
  const { label, variant } = ACTION_CONFIG[action];
  return <Badge variant={variant}>{label}</Badge>;
}
