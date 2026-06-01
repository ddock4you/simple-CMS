'use client';

import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';

import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/shared/ui/Select';

import { homeReferencesOptions } from '../../api/homeQueries';
import type { NoticeConfigData } from '../../model/homeSchemas';

interface NoticeFieldsProps {
  register: UseFormRegister<NoticeConfigData>;
  control: Control<NoticeConfigData>;
  errors: FieldErrors<NoticeConfigData>;
}

export function NoticeFields({ register, control, errors }: NoticeFieldsProps) {
  const { data: references } = useQuery(homeReferencesOptions());
  const boards = references?.boards ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="heading">섹션 제목 *</Label>
        <Input
          id="heading"
          {...register('heading')}
          placeholder="예: 공지 알림"
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
        <Label>대표 게시판 선택 *</Label>
        <Controller
          name="boardId"
          control={control}
          render={({ field }) => {
            const selected = boards.find((board) => board.id === field.value);
            const deadReference = field.value && !selected;

            return (
              <Select
                value={field.value ?? ''}
                onValueChange={(value) => field.onChange(value || null)}
              >
                <SelectTrigger
                  className={deadReference ? 'border-destructive' : undefined}
                >
                  <span
                    className={deadReference ? 'text-destructive' : undefined}
                  >
                    {selected?.name ??
                      (deadReference
                        ? '삭제된 게시판'
                        : field.value
                          ? '선택'
                          : '게시판을 선택하세요')}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {boards.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      공개 게시판이 없습니다.
                    </div>
                  ) : (
                    boards.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            );
          }}
        />
        <p className="text-xs text-muted-foreground">
          선택한 게시판의 중요 게시글 최신 1건과 일반 최신글을 메인에
          표시합니다.
        </p>
        <p className="text-xs text-muted-foreground">
          상단 강조 영역은 게시글 관리의 &quot;중요 게시글&quot; 체크 여부를
          따릅니다.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="limit">일반 게시글 표시 개수</Label>
        <Input
          id="limit"
          type="number"
          min={1}
          max={10}
          {...register('limit', { valueAsNumber: true })}
        />
        {errors.limit && (
          <p className="text-sm text-destructive">{errors.limit.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          일반 게시글은 1~10개까지 표시할 수 있습니다. 중요 게시글은 별도
          1건으로 표시됩니다.
        </p>
      </div>
    </div>
  );
}
