import type { BoardSkinType } from '@simple-cms/db';

import { Badge } from '@/shared/ui/shadcn/badge';

const SKIN_TYPE_CONFIG: Record<
  BoardSkinType,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  LIST: { label: '목록형', variant: 'secondary' },
  GALLERY: { label: '갤러리형', variant: 'outline' },
};

export function BoardSkinTypeBadge({ skinType }: { skinType: BoardSkinType }) {
  const { label, variant } = SKIN_TYPE_CONFIG[skinType];
  return <Badge variant={variant}>{label}</Badge>;
}
