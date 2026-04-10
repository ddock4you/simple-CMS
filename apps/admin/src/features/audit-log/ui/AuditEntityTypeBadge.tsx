import type { AuditEntityType } from '@simple-cms/db';

import { Badge } from '@/shared/ui/shadcn/badge';
import { ENTITY_TYPE_LABELS } from '../model/auditLogFilters';

export function AuditEntityTypeBadge({ entityType }: { entityType: AuditEntityType }) {
  const label = ENTITY_TYPE_LABELS[entityType] ?? entityType;
  return <Badge variant="outline">{label}</Badge>;
}
