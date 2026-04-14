'use client';

import { useEffect } from 'react';

import { registerGlobalErrorListeners } from '@/shared/lib/errorReporter';

export function ErrorReporterMount() {
  useEffect(() => {
    registerGlobalErrorListeners();
  }, []);
  return null;
}
