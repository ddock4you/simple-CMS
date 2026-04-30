'use client';

import type { ReactNode } from 'react';
import { Filter, MoreHorizontal } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/shadcn/sheet';

interface PageToolbarProps {
  /** 좌측 슬롯 — Read 기능 (필터, 검색) */
  left?: ReactNode;
  /** 우측 슬롯 — CUD 기능 (추가, 편집, 삭제, 저장) */
  right?: ReactNode;
  /**
   * sticky 고정 여부 (기본값: true).
   * AdminHeader(top-0, z-30, h-14) 바로 아래 고정.
   */
  sticky?: boolean;
  /**
   * 모바일(<md)에서 left 슬롯을 하나의 버튼으로 collapse 할지 여부.
   * 기본값: left 슬롯이 있으면 true, 없으면 false.
   * 단일 자식(필터 1개)처럼 collapse가 어색한 경우 false로 opt-out.
   */
  mobileCollapseLeft?: boolean;
  /**
   * 모바일(<md)에서 right 슬롯을 하나의 버튼으로 collapse 할지 여부.
   * 기본값: right 슬롯이 있으면 true, 없으면 false.
   */
  mobileCollapseRight?: boolean;
  /** 모바일 left 트리거 라벨 (기본값: "검색·필터") */
  mobileLeftLabel?: string;
  /** 모바일 right 트리거 라벨 (기본값: "관리") */
  mobileRightLabel?: string;
  /** 모바일 left 트리거 아이콘 (기본값: Filter 아이콘) */
  mobileLeftIcon?: ReactNode;
  /** 모바일 right 트리거 아이콘 (기본값: MoreHorizontal 아이콘) */
  mobileRightIcon?: ReactNode;
}

export function PageToolbar({
  left,
  right,
  sticky = true,
  mobileCollapseLeft,
  mobileCollapseRight,
  mobileLeftLabel = '검색·필터',
  mobileRightLabel = '관리',
  mobileLeftIcon,
  mobileRightIcon,
}: PageToolbarProps) {
  const shouldCollapseLeft = mobileCollapseLeft ?? Boolean(left);
  const shouldCollapseRight = mobileCollapseRight ?? Boolean(right);

  if (!left && !right) return null;

  return (
    <div
      data-testid="page-toolbar"
      className={cn(
        'flex items-center justify-between gap-2 bg-background py-2',
        sticky && 'sticky top-14 z-20 -mx-6 px-6 shadow-sm',
      )}
    >
      {/* 좌측 그룹 */}
      <div className="flex items-center gap-2">
        {left && shouldCollapseLeft && (
          <>
            <div className="hidden md:flex md:items-center md:gap-2">{left}</div>
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="outline" className="md:hidden" />
                }
              >
                {mobileLeftIcon ?? <Filter className="size-4" />}
                {mobileLeftLabel}
              </SheetTrigger>
              <SheetContent side="top" data-slot="page-toolbar-left-sheet">
                <SheetHeader>
                  <SheetTitle>{mobileLeftLabel}</SheetTitle>
                </SheetHeader>
                <div className="space-y-3 px-4 pb-6">{left}</div>
              </SheetContent>
            </Sheet>
          </>
        )}
        {left && !shouldCollapseLeft && (
          <div className="flex items-center gap-2">{left}</div>
        )}
      </div>

      {/* 우측 그룹 */}
      <div className="flex items-center gap-2">
        {right && shouldCollapseRight && (
          <>
            <div className="hidden md:flex md:items-center md:gap-2">{right}</div>
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="outline" className="md:hidden" />
                }
              >
                {mobileRightIcon ?? <MoreHorizontal className="size-4" />}
                {mobileRightLabel}
              </SheetTrigger>
              <SheetContent side="top" data-slot="page-toolbar-right-sheet">
                <SheetHeader>
                  <SheetTitle>{mobileRightLabel}</SheetTitle>
                </SheetHeader>
                <div className="space-y-2 px-4 pb-6">{right}</div>
              </SheetContent>
            </Sheet>
          </>
        )}
        {right && !shouldCollapseRight && (
          <div className="flex items-center gap-2">{right}</div>
        )}
      </div>
    </div>
  );
}
