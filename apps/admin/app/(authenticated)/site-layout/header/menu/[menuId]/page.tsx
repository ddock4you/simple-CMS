import NavigationEditPage from '@/pages/navigation-management/ui/NavigationEditPage';

export default async function EditHeaderMenuPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;
  return (
    <NavigationEditPage
      menuId={menuId}
      backHref="/site-layout/header"
      backLabel="헤더 관리로"
    />
  );
}
