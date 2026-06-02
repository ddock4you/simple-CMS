'use client';

import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';

import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';

import { homeReferencesOptions } from '../../api/homeQueries';
import type { GalleryCollectionConfigData } from '../../model/homeSchemas';

interface GalleryCollectionFieldsProps {
  register: UseFormRegister<GalleryCollectionConfigData>;
  control: Control<GalleryCollectionConfigData>;
  errors: FieldErrors<GalleryCollectionConfigData>;
}

export function GalleryCollectionFields({
  register,
  control,
  errors,
}: GalleryCollectionFieldsProps) {
  const { data: references } = useQuery(homeReferencesOptions());
  const boards = references?.boards ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="heading">섹션 제목 *</Label>
        <Input
          id="heading"
          {...register('heading')}
          placeholder="예: 갤러리 모아보기"
        />
        {errors.heading && (
          <p className="text-sm text-destructive">{errors.heading.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">설명 (선택)</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="섹션에 대한 부가 설명"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>게시판 선택 *</Label>
        <Controller
          name="boardIds"
          control={control}
          render={({ field }) => {
            const selectedIds = field.value ?? [];
            const boardIdSet = new Set(boards.map((board) => board.id));
            const deadReferences = selectedIds.filter(
              (id) => !boardIdSet.has(id),
            );

            const toggleBoard = (boardId: string, checked: boolean) => {
              if (checked) {
                field.onChange([...selectedIds, boardId]);
                return;
              }
              field.onChange(selectedIds.filter((id) => id !== boardId));
            };

            return (
              <div className="rounded-md border p-3">
                {deadReferences.length > 0 && (
                  <div className="mb-3 space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-2">
                    {deadReferences.map((id) => (
                      <label
                        key={id}
                        className="flex items-center gap-2 text-sm text-destructive"
                      >
                        <Checkbox checked disabled />
                        삭제되었거나 비공개 처리된 게시판
                      </label>
                    ))}
                  </div>
                )}

                {boards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    공개 게시판이 없습니다.
                  </p>
                ) : (
                  <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                    {boards.map((board) => (
                      <label
                        key={board.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                      >
                        <Checkbox
                          checked={selectedIds.includes(board.id)}
                          onCheckedChange={(checked) =>
                            toggleBoard(board.id, checked === true)
                          }
                        />
                        <span className="text-sm">{board.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          }}
        />
        {errors.boardIds && (
          <p className="text-sm text-destructive">{errors.boardIds.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          선택한 순서대로 탭이 표시됩니다. 전체 탭은 선택한 게시판의 최신글을
          함께 보여줍니다.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="limit">탭별 표시 개수</Label>
        <Input
          id="limit"
          type="number"
          min={1}
          max={12}
          {...register('limit', { valueAsNumber: true })}
        />
        {errors.limit && (
          <p className="text-sm text-destructive">{errors.limit.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          전체 탭과 각 게시판 탭에 1~12개까지 표시할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
