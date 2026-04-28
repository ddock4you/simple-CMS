'use client';

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { toast } from 'sonner';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  boundaryName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[Admin] ErrorBoundary caught (${this.props.boundaryName ?? 'unknown'})`,
      error,
      info.componentStack,
    );
    toast.error('컴포넌트 오류가 발생했습니다', {
      description: error.message,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            role="alert"
            className="flex items-center justify-center p-6 rounded-md border border-destructive/30 bg-destructive/5 text-sm text-destructive"
          >
            오류가 발생했습니다. 페이지를 새로 고침해 주세요.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
