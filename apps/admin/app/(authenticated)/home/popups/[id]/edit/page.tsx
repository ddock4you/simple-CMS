import PopupEditPage from '@/pages/popup-management/ui/PopupEditPage';

export default async function EditPopupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PopupEditPage mode="edit" id={id} />;
}
