interface QueryStateMessageProps {
  title: string;
  details?: string;
  tone?: 'muted' | 'destructive';
}

export function getQueryErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '알 수 없는 오류가 발생했습니다.';
}

export function QueryStateMessage({
  title,
  details,
  tone = 'muted',
}: QueryStateMessageProps) {
  return (
    <div
      className={`rounded-md border border-dashed p-8 text-center ${
        tone === 'destructive' ? 'text-destructive' : 'text-muted-foreground'
      }`}
    >
      <p>{title}</p>
      {details && <p className="mt-2 text-xs">{details}</p>}
    </div>
  );
}
