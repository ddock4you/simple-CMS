'use client';

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { reportError } from '@/shared/lib/errorReporter';

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
    reportError({
      level: 'ERROR',
      source: 'CLIENT_REACT',
      message: error.message,
      stack: error.stack,
      metadata: {
        boundaryName: this.props.boundaryName ?? 'unknown',
        componentStack: info.componentStack ?? null,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div role="alert" className="error-boundary-fallback">
            문제가 발생했습니다.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
