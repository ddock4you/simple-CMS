import { RolesContainer } from '@/features/role-management/ui/RolesContainer';

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">권한 관리</h1>
        <p className="text-muted-foreground">
          역할을 생성하고 권한을 설정합니다.
        </p>
      </div>
      <RolesContainer />
    </div>
  );
}
