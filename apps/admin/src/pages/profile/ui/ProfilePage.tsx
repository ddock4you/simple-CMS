import { requireAuth } from '@/entities/auth/lib/getCurrentUser';
import { ProfileForm } from '@/features/auth/ui/ProfileForm';
import { ChangePasswordForm } from '@/features/auth/ui/ChangePasswordForm';

export default async function ProfilePage() {
  const user = await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">내 정보</h1>
        <p className="text-muted-foreground">
          프로필 정보와 비밀번호를 변경할 수 있습니다.
        </p>
      </div>

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
