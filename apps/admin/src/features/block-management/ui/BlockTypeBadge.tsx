import type { PageBlockType } from '@simple-cms/types';

import { Badge } from '@/shared/ui/shadcn/badge';

import { BLOCK_TYPE_LABELS } from '../model/blockLabels';

const VARIANT_BY_TYPE: Record<
  PageBlockType,
  'default' | 'secondary' | 'outline'
> = {
  RICH_TEXT: 'default',
  HTML: 'outline',
  IMAGE: 'secondary',
  IFRAME: 'outline',
};

export function BlockTypeBadge({ type }: { type: PageBlockType }) {
  return (
    <Badge variant={VARIANT_BY_TYPE[type]}>{BLOCK_TYPE_LABELS[type]}</Badge>
  );
}
