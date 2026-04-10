'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { updateProfile } from '@/features/auth/api/authFetchers';

import { FetchError } from '@/shared/api/fetchClient';
import { userKeys } from '@/shared/api/queryKeys';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import {
  profileSchema,
  type ProfileFormData,
} from '@/features/auth/model/profileSchema';

interface ProfileFormProps {
  user: {
    username: string;
    name: string;
    email: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      email: user.email ?? '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);

    try {
      await updateProfile(data);
      toast.success('프로필이 변경되었습니다.');
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      router.refresh();
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
        <CardTitle>기본 정보</CardTitle>
        <CardDescription>이름과 이메일을 변경할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">아이디</Label>
            <Input
              id="username"
              type="text"
              value={user.username}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              type="text"
              placeholder="이름을 입력하세요"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">이메일 (선택사항)</Label>
            <Input
              id="email"
              type="email"
              placeholder="이메일을 입력하세요"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? '저장 중...' : '저장'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
