'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { FetchError } from '@/shared/api/fetchClient';
import { settingsKeys } from '@/shared/api/queryKeys';
import type { UpdateDomainData, UpdateSecurityData, UpdateUploadData } from '../model/settingsSchemas';
import {
  updateDomainSettings,
  deleteDomainSettings,
  checkDns,
  updateSecuritySettings,
  updateUploadSettings,
} from './settingsFetchers';

// Domain
export function useUpdateDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateDomainData) => updateDomainSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.domain() });
      toast.success('도메인이 저장되었습니다.');
    },
    onError: (error: FetchError) => { toast.error(error.message); },
  });
}

export function useDeleteDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteDomainSettings(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.domain() });
      toast.success('도메인이 삭제되었습니다.');
    },
    onError: (error: FetchError) => { toast.error(error.message); },
  });
}

export function useCheckDns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => checkDns(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.domain() });
      toast.success(result.verified ? 'DNS 검증 성공' : 'DNS 검증 실패 — 레코드를 확인해주세요.');
    },
    onError: (error: FetchError) => { toast.error(error.message); },
  });
}

// Security
export function useUpdateSecurity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateSecurityData) => updateSecuritySettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.security() });
      toast.success('보안 설정이 저장되었습니다.');
    },
    onError: (error: FetchError) => { toast.error(error.message); },
  });
}

// Upload
export function useUpdateUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUploadData) => updateUploadSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.upload() });
      toast.success('업로드 설정이 저장되었습니다.');
    },
    onError: (error: FetchError) => { toast.error(error.message); },
  });
}
