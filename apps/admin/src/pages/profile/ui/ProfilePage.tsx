import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { ProfileForm } from '@/features/auth/ui/ProfileForm';
import { ChangePasswordForm } from '@/features/auth/ui/ChangePasswordForm';
import { PageHeader } from '@/shared/ui/PageHeader';

export default async function ProfilePage() {
  const user = await requireAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="내 정보"
        description="프로필 정보와 비밀번호를 변경할 수 있습니다."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileForm
          user={{
            username: user.username,
            name: user.name,
            email: user.email,
          }}
        />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
