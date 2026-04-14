import type { ErrorLevel, ErrorSource } from '@simple-cms/db';

export interface ClientErrorReport {
  level: ErrorLevel;
  source: ErrorSource;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  referer?: string;
  digest?: string;
  statusCode?: number;
  metadata?: Record<string, unknown>;
}

const ENDPOINT = '/api/error-report';

export function reportError(report: ClientErrorReport): void {
  if (typeof window === 'undefined') return;

  const payload: ClientErrorReport = {
    ...report,
    url: report.url ?? window.location.href,
    userAgent: report.userAgent ?? navigator.userAgent,
    referer: report.referer ?? (document.referrer || undefined),
  };
  const body = JSON.stringify(payload);

  if (typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    } catch {
      // fallback으로 진행
    }
  }

  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // fire-and-forget: 리포트 자체의 실패는 무시
  });
}

let listenersRegistered = false;

export function registerGlobalErrorListeners(): void {
  if (typeof window === 'undefined' || listenersRegistered) return;
  listenersRegistered = true;

  window.addEventListener('error', (event: ErrorEvent) => {
    // 리소스 로드 에러(img, script 등)는 event.error가 없으므로 제외
    if (!event.error) return;
    reportError({
      level: 'ERROR',
      source: 'CLIENT_JS',
      message: event.message || String(event.error),
      stack: event.error instanceof Error ? event.error.stack : undefined,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener(
    'unhandledrejection',
    (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : String(reason ?? 'Unknown rejection');
      const stack = reason instanceof Error ? reason.stack : undefined;
      reportError({
        level: 'ERROR',
        source: 'CLIENT_JS',
        message,
        stack,
        metadata: { kind: 'unhandledrejection' },
      });
    },
  );
}
