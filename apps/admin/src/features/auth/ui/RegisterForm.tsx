'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

import { register as registerUser } from '@/features/auth/api/authFetchers';

import { FetchError } from '@/shared/api/fetchClient';
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
  registerSchema,
  type RegisterFormData,
} from '@/features/auth/model/registerSchema';

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      const result = await registerUser(data);
      toast.success(result.message);
      router.push('/login');
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
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">회원가입</CardTitle>
        <CardDescription>Simple CMS</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">아이디</Label>
            <Input
              id="username"
              type="text"
              placeholder="영문, 숫자, 밑줄 4~20자"
              autoComplete="username"
              {...register('username')}
            />
            {errors.username && (
              <p className="text-sm text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">이메일 (선택사항)</Label>
            <Input
              id="email"
              type="email"
              placeholder="이메일을 입력하세요"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              type="text"
              placeholder="이름을 입력하세요"
              autoComplete="name"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="8자 이상"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
            <Input
              id="passwordConfirm"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              autoComplete="new-password"
              {...register('passwordConfirm')}
            />
            {errors.passwordConfirm && (
              <p className="text-sm text-destructive">
                {errors.passwordConfirm.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '가입 신청 중...' : '가입 신청'}
          </Button>

          <div className="text-center text-sm">
            <Link
              href="/login"
              className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              로그인으로 돌아가기
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
