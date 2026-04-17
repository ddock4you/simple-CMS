import { SidebarTrigger } from '@/shared/ui/shadcn/sidebar';
import { Separator } from '@/shared/ui/shadcn/separator';
import { UserNav } from '@/shared/ui/layout/UserNav';
import { ViewLiveButton } from '@/entities/preview/ui/ViewLiveButton';
import { CommandPaletteTrigger } from '@/features/quick-switcher/ui/CommandPaletteTrigger';
import { getWebBaseUrl } from '@/shared/lib/siteUrl';

interface AdminHeaderProps {
  user: {
    name: string;
    username: string;
    role: { name: string } | null;
  };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />
      <div className="flex-1" />
      <CommandPaletteTrigger />
      <ViewLiveButton
        url={getWebBaseUrl()}
        label="사이트 메인"
        variant="ghost"
        size="sm"
      />
      <UserNav user={user} />
    </header>
  );
}
