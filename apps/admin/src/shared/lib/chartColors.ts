'use client';

const FALLBACK = {
  positive: '#00801a',
  negative: '#e7000b',
  warning: '#ed9800',
  muted: '#737373',
  border: '#ebebeb',
  palette: ['#e5e5e5', '#737373', '#525252', '#404040', '#262626'],
} as const;

export function getChartColors() {
  if (typeof window === 'undefined') return FALLBACK;
  const computed = getComputedStyle(document.documentElement);
  const v = (key: string, fb: string) => computed.getPropertyValue(key).trim() || fb;
  return {
    positive: v('--success', FALLBACK.positive),
    negative: v('--destructive', FALLBACK.negative),
    warning: v('--warning', FALLBACK.warning),
    muted: v('--muted-foreground', FALLBACK.muted),
    border: v('--border', FALLBACK.border),
    palette: [
      v('--chart-1', FALLBACK.palette[0]),
      v('--chart-2', FALLBACK.palette[1]),
      v('--chart-3', FALLBACK.palette[2]),
      v('--chart-4', FALLBACK.palette[3]),
      v('--chart-5', FALLBACK.palette[4]),
    ],
  };
}
