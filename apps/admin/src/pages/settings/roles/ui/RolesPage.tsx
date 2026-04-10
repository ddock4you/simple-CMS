import { SettingsNav } from '@/features/site-settings/ui/SettingsNav';
import { RolesContainer } from '@/features/role-management/ui/RolesContainer';

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">사이트 설정</h1>
        <p className="text-muted-foreground">사이트 전역 설정을 관리합니다.</p>
      </div>
      <SettingsNav />
      <div>
        <h2 className="text-lg font-semibold">권한 관리</h2>
        <p className="text-sm text-muted-foreground mb-4">
          역할을 생성하고 메뉴별 CRUD 권한을 설정합니다. 사용자에게 역할을 배정하면 해당 권한이 즉시 적용됩니다.
        </p>
        <RolesContainer />
      </div>
    </div>
  );
}
