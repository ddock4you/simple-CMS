import { cn } from '@/shared/lib/utils';

interface PageHeaderProps {
  /** 뒤로 가기 링크/버튼 슬롯 */
  back?: React.ReactNode;
  /** 페이지 제목 */
  title: React.ReactNode;
  /** 제목 아래 설명 */
  description?: React.ReactNode;
  /** 우측 액션 버튼 슬롯 */
  actions?: React.ReactNode;
  /** 하단 탭 네비게이션 슬롯 (Settings 6탭 등) */
  tabs?: React.ReactNode;
  /**
   * sticky 동작 여부 (기본값: false).
   * true 전달 시 md+(768px↑)에서만 sticky 적용. 거의 사용하지 않음.
   * sticky 책임은 PageToolbar로 이전됨 — PageToolbar가 top-14에 고정.
   */
  sticky?: boolean;
}

/**
 * 관리 페이지 공통 헤더.
 *
 * sticky 기본값: false (in-flow). sticky 고정은 PageToolbar가 담당.
 * PageHeader.actions 슬롯은 legacy — 신규 사용 금지. 대신 PageToolbar.right 사용.
 */
export function PageHeader({
  back,
  title,
  description,
  actions,
  tabs,
  sticky = false,
}: PageHeaderProps) {
  return (
    <div
      data-testid="page-header"
      className={cn(
        'border-b pb-4',
        sticky && 'md:sticky md:top-14 md:z-20 md:bg-background',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {back && <div className="mb-2">{back}</div>}
          <h1 className="text-2xl font-bold leading-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      {tabs && <div className="mt-3">{tabs}</div>}
    </div>
  );
}
