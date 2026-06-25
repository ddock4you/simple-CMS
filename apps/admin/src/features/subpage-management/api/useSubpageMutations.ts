'use client';

import type { QueryKey, UseMutationResult } from '@tanstack/react-query';
import type { ContentStatus } from '@simple-cms/db';
import type { ListSnapshot } from '@simple-cms/types';

import { subpageKeys } from '@/shared/api/queryKeys';
import type { FetchError } from '@/shared/api/fetchClient';
import { createCrudMutations } from '@/shared/api/crudMutations';
import { createToggleMutation } from '@/shared/api/toggleMutation';
import { createBulkDeleteMutation } from '@/shared/api/bulkDeleteMutation';
import { createBulkStatusMutation } from '@/shared/api/bulkStatusMutation';
import type { CreateSubpageData, UpdateSubpageData } from '../model/subpageSchemas';
import type { SubpageListItem } from '../model/subpageFilters';
import {
  createSubpage,
  updateSubpage,
  deleteSubpage,
  toggleSubpageStatus,
  bulkDeleteSubpages,
  bulkUpdateSubpageStatus,
  type BulkDeleteSubpageResponse,
  type BulkStatusSubpageResponse,
} from './subpageFetchers';

const {
  useCreate: useCreateSubpage,
  useUpdate: useUpdateSubpage,
  useDelete: useDeleteSubpage,
} = createCrudMutations<CreateSubpageData, UpdateSubpageData, { id: string }>({
  keys: subpageKeys,
  endpoints: {
    create: createSubpage,
    update: updateSubpage,
    delete: deleteSubpage,
  },
  messages: {
    create: '서브 페이지가 생성되었습니다.',
    update: '기본 정보가 저장되었습니다.',
    delete: '서브 페이지가 삭제되었습니다.',
  },
  routerPaths: {
    afterCreate: (result) => `/subpages/${result.id}/edit`,
    afterUpdate: (id) => `/subpages/${id}`,
    afterDelete: '/subpages',
  },
});

const _useToggleSubpageStatus = createToggleMutation<SubpageListItem, 'status', ContentStatus>({
  keys: subpageKeys,
  field: 'status',
  mutationFn: toggleSubpageStatus,
  successMessage: (status) =>
    status === 'PUBLISHED' ? '발행되었습니다.' : '초안으로 변경되었습니다.',
});

export function useToggleSubpageStatus(): UseMutationResult<
  unknown,
  FetchError,
  { id: string; status: ContentStatus },
  { previousLists: [QueryKey, ListSnapshot<SubpageListItem> | undefined][] }
> {
  return _useToggleSubpageStatus();
}

const useBulkDeleteSubpages = createBulkDeleteMutation<BulkDeleteSubpageResponse>({
  keys: subpageKeys,
  mutationFn: bulkDeleteSubpages,
  messages: {
    allSuccess: (count) => `${count}개 서브 페이지가 삭제되었습니다.`,
    partial: (deleted, blocked) =>
      `${deleted}개 삭제, ${blocked}개는 참조 중이라 제외되었습니다.`,
    allBlocked: (count) => `선택한 ${count}개 모두 참조 중이라 삭제할 수 없습니다.`,
  },
});

const useBulkUpdateSubpageStatus = createBulkStatusMutation<BulkStatusSubpageResponse>({
  keys: subpageKeys,
  mutationFn: bulkUpdateSubpageStatus,
});

export {
  useCreateSubpage,
  useUpdateSubpage,
  useDeleteSubpage,
  useBulkDeleteSubpages,
  useBulkUpdateSubpageStatus,
};
