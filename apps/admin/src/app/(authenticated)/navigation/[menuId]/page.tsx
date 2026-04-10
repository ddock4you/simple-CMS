import NavigationEditPage from '@/pages/navigation-management/ui/NavigationEditPage';

export default async function EditNavigationPage({
  params,
}: {
  params: Promise<{ menuId: string }>;
}) {
  const { menuId } = await params;
  return <NavigationEditPage menuId={menuId} />;
}
