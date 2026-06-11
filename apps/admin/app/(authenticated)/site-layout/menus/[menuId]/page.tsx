import NavigationEditPage from '@/pages/navigation-management/ui/NavigationEditPage';

export default async function EditSiteLayoutMenuPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;
  return (
    <NavigationEditPage
      menuId={menuId}
      backHref="/site-layout/menus"
      backLabel="사이트 화면 관리로"
    />
  );
}
