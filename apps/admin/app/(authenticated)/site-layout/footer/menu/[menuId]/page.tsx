import NavigationEditPage from '@/pages/navigation-management/ui/NavigationEditPage';

export default async function EditFooterMenuPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;
  return (
    <NavigationEditPage
      menuId={menuId}
      backHref="/site-layout/footer"
      backLabel="푸터 관리로"
    />
  );
}
