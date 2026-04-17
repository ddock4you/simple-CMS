'use client';

import { useEffect, useState } from 'react';

/**
 * 입력값을 지정된 ms 동안 안정화시킨 후 반환.
 * 검색 input 등에서 키 입력마다 API 호출되는 것을 방지.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
