'use client';

import { boardKeys, homeKeys, linkTargetKeys } from '@/shared/api/queryKeys';
import { createCrudMutations } from '@/shared/api/crudMutations';
import { createToggleMutation } from '@/shared/api/toggleMutation';
import type { CreateBoardData, UpdateBoardData } from '../model/boardSchemas';
import type { BoardListItem } from '../model/boardFilters';
import {
  createBoard,
  updateBoard,
  deleteBoard,
  toggleBoardVisibility,
} from './boardFetchers';

const {
  useCreate: useCreateBoard,
  useUpdate: useUpdateBoard,
  useDelete: useDeleteBoard,
} = createCrudMutations<CreateBoardData, UpdateBoardData, { id: string }>({
  keys: boardKeys,
  extraInvalidateKeys: [
    boardKeys.options(),
    homeKeys.references(),
    linkTargetKeys.references(),
  ],
  endpoints: {
    create: createBoard,
    update: updateBoard,
    delete: deleteBoard,
  },
  messages: {
    create: '게시판이 생성되었습니다.',
    update: '게시판이 수정되었습니다.',
    delete: '게시판이 삭제되었습니다.',
  },
  routerPaths: {
    afterCreate: (result) => `/boards/${result.id}`,
    afterUpdate: (id) => `/boards/${id}`,
    afterDelete: '/boards',
  },
});

const useToggleBoardVisibility = createToggleMutation<BoardListItem, 'isPublic', boolean>({
  keys: boardKeys,
  field: 'isPublic',
  mutationFn: toggleBoardVisibility,
  successMessage: (isPublic) =>
    isPublic ? '공개로 변경되었습니다.' : '비공개로 변경되었습니다.',
});

export { useCreateBoard, useUpdateBoard, useDeleteBoard, useToggleBoardVisibility };
