import type { NavigationMenuItemType } from '@simple-cms/db';

import { Badge } from '@/shared/ui/shadcn/badge';

const TYPE_CONFIG: Record<
  NavigationMenuItemType,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  GROUP: { label: '그룹', variant: 'secondary' },
  SUBPAGE: { label: '서브 페이지', variant: 'default' },
  BOARD: { label: '게시판', variant: 'secondary' },
  EXTERNAL: { label: '외부 링크', variant: 'outline' },
  CUSTOM: { label: '커스텀', variant: 'outline' },
};

export function MenuItemTypeBadge({ itemType }: { itemType: NavigationMenuItemType }) {
  const { label, variant } = TYPE_CONFIG[itemType];
  return <Badge variant={variant}>{label}</Badge>;
}
