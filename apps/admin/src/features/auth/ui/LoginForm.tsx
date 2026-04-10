'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

import { login } from '@/features/auth/api/authFetchers';

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
  loginSchema,
  type LoginFormData,
} from '@/features/auth/model/loginSchema';

const ERROR_MESSAGES: Record<string, string> = {
  PENDING_APPROVAL:
    '가입 승인 대기 중입니다. 관리자 승인 후 로그인이 가능합니다.',
  ACCOUNT_SUSPENDED: '계정이 정지되었습니다. 관리자에게 문의하세요.',
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      await login(data);
      router.push(callbackUrl);
    } catch (error) {
      if (error instanceof FetchError) {
        const message =
          ERROR_MESSAGES[error.message] ??
          error.message ??
          '로그인에 실패했습니다.';
        toast.error(message);
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
        <CardTitle className="text-xl">관리자 로그인</CardTitle>
        <CardDescription>Simple CMS</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">아이디</Label>
            <Input
              id="username"
              type="text"
              placeholder="아이디를 입력하세요"
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
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>

          <div className="text-center text-sm">
            <Link
              href="/register"
              className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              회원가입
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
