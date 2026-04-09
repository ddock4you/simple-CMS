'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { roleKeys } from '@/shared/api/queryKeys';

import {
  createRole,
  updateRole,
  deleteRole,
  updatePermissions,
  setDefaultRole,
} from '@/features/role-management/api/roleFetchers';
import type { FetchError } from '@/shared/api/fetchClient';

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.list() });
      toast.success('역할이 생성되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) =>
      updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      toast.success('역할이 수정되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.list() });
      toast.success('역할이 삭제되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: Record<string, Record<string, boolean>> }) =>
      updatePermissions(id, permissions),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: roleKeys.list() });
      toast.success('권한이 변경되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}

export function useSetDefaultRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => setDefaultRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.list() });
      toast.success('기본 역할이 변경되었습니다.');
    },
    onError: (error: FetchError) => {
      toast.error(error.message);
    },
  });
}
