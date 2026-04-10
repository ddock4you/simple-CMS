import { Badge } from '@/shared/ui/badge';

const VISIBILITY_CONFIG: Record<
  'public' | 'private',
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  public: { label: '공개', variant: 'default' },
  private: { label: '비공개', variant: 'secondary' },
};

export function BoardVisibilityBadge({ isPublic }: { isPublic: boolean }) {
  const key = isPublic ? 'public' : 'private';
  const { label, variant } = VISIBILITY_CONFIG[key];
  return <Badge variant={variant}>{label}</Badge>;
}
