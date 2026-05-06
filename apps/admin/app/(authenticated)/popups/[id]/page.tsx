import PopupViewPage from '@/pages/popup-management/ui/PopupViewPage';

export default async function ViewPopupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PopupViewPage id={id} />;
}
