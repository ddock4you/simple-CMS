import { Badge } from '@/shared/ui/shadcn/badge';

interface UserRoleBadgeProps {
  role: { name: string; isSystem: boolean } | null;
}

export function UserRoleBadge({ role }: UserRoleBadgeProps) {
  if (!role) {
    return <Badge variant="outline">미배정</Badge>;
  }

  return (
    <Badge variant={role.isSystem ? 'default' : 'secondary'}>
      {role.name}
    </Badge>
  );
}
