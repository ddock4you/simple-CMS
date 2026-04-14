import type { ErrorSource } from '@simple-cms/db';

import { Badge } from '@/shared/ui/shadcn/badge';

import { SOURCE_LABELS } from '../model/errorLogFilters';

export function ErrorSourceBadge({ source }: { source: ErrorSource }) {
  return <Badge variant="outline">{SOURCE_LABELS[source]}</Badge>;
}
