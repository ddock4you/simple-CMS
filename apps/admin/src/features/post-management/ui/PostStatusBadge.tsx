import type { ContentStatus } from '@simple-cms/db';

import { Badge } from '@/shared/ui/shadcn/badge';

const STATUS_CONFIG: Record<
  ContentStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  DRAFT: { label: '초안', variant: 'secondary' },
  PUBLISHED: { label: '발행', variant: 'default' },
};

export function PostStatusBadge({ status }: { status: ContentStatus }) {
  const { label, variant } = STATUS_CONFIG[status];
  return <Badge variant={variant}>{label}</Badge>;
}
