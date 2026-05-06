'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { userKeys } from '@/features/user-management/api/userQueries';
import {
  approveUser,
  rejectUser,
  suspendUser,
  reactivateUser,
  changeUserRole,
  bulkApproveUsers,
  bulkRejectUsers,
  bulkSuspendUsers,
  bulkReactivateUsers,
  bulkChangeUserRole,
} from '@/features/user-management/api/userFetchers';
import type {
  BulkUserUpdateResult,
  BulkUserDeleteResult,
} from '@/features/user-management/api/userFetchers';
import type { FetchError } from '@/shared/api/fetchClient';

export function useApproveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => approveUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('사용자가 승인되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useRejectUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => rejectUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('가입이 거절되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => suspendUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('사용자가 정지되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => reactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('사용자가 활성화되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useChangeUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      changeUserRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('역할이 변경되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useBulkApproveUsers(options?: {
  onSuccess?: (result: BulkUserUpdateResult) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkApproveUsers(ids),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      options?.onSuccess?.(result);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useBulkRejectUsers(options?: {
  onSuccess?: (result: BulkUserDeleteResult) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkRejectUsers(ids),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      options?.onSuccess?.(result);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useBulkSuspendUsers(options?: {
  onSuccess?: (result: BulkUserUpdateResult) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkSuspendUsers(ids),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      options?.onSuccess?.(result);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useBulkReactivateUsers(options?: {
  onSuccess?: (result: BulkUserUpdateResult) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => bulkReactivateUsers(ids),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      options?.onSuccess?.(result);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useBulkChangeUserRole(options?: {
  onSuccess?: (result: BulkUserUpdateResult) => void;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, roleId }: { ids: string[]; roleId: string }) =>
      bulkChangeUserRole(ids, roleId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      options?.onSuccess?.(result);
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}
