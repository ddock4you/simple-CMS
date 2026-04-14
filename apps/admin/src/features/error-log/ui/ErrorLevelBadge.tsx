import type { ErrorLevel } from '@simple-cms/db';

import { Badge } from '@/shared/ui/shadcn/badge';

import { LEVEL_LABELS } from '../model/errorLogFilters';

const VARIANT: Record<
  ErrorLevel,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  ERROR: 'destructive',
  WARN: 'secondary',
};

export function ErrorLevelBadge({ level }: { level: ErrorLevel }) {
  return <Badge variant={VARIANT[level]}>{LEVEL_LABELS[level]}</Badge>;
}
