'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { FetchError } from '@/shared/api/fetchClient';
import { changePassword } from '@/features/auth/api/authFetchers';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import {
  changePasswordSchema,
  type ChangePasswordFormData,
} from '@/features/auth/schemas/profileSchema';

export function ChangePasswordForm() {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setIsLoading(true);

    try {
      await changePassword(data);
      toast.success('비밀번호가 변경되었습니다.');
      reset();
    } catch (error) {
      if (error instanceof FetchError) {
        toast.error(error.message);
      } else {
        toast.error('서버와 통신할 수 없습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>비밀번호 변경</CardTitle>
        <CardDescription>
          현재 비밀번호를 확인한 후 새 비밀번호로 변경합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">현재 비밀번호</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="현재 비밀번호를 입력하세요"
              autoComplete="current-password"
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <p className="text-sm text-destructive">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="8자 이상"
              autoComplete="new-password"
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p className="text-sm text-destructive">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPasswordConfirm">새 비밀번호 확인</Label>
            <Input
              id="newPasswordConfirm"
              type="password"
              placeholder="새 비밀번호를 다시 입력하세요"
              autoComplete="new-password"
              {...register('newPasswordConfirm')}
            />
            {errors.newPasswordConfirm && (
              <p className="text-sm text-destructive">
                {errors.newPasswordConfirm.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
