export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PERIOD_DAYS = 30;

/** YYYY-MM-DD 문자열을 받아 해당 KST 날짜의 자정(00:00:00.000+09:00)을 UTC Date로 반환 */
export function kstStartOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000+09:00`);
}

/** YYYY-MM-DD 문자열을 받아 해당 KST 날짜의 끝(23:59:59.999+09:00)을 UTC Date로 반환 */
export function kstEndOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999+09:00`);
}

/** UTC Date를 KST 기준 YYYY-MM-DD 문자열로 변환 */
export function toKstDateKey(d: Date): string {
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * 클라이언트의 DatePicker Date를 KST 로컬 날짜 문자열(YYYY-MM-DD)로 변환.
 * toISOString()은 UTC 기준이라 한국 자정 이전(00:00~08:59 KST) 선택 시 전날로 표기됨.
 */
export function toKstDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** UTC Date를 "YYYY-MM-DD HH:MM:SS" 형식의 KST 문자열로 변환 (Excel 등 표시용) */
export function formatKstDateTime(d: Date): string {
  return new Date(d.getTime() + KST_OFFSET_MS)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19);
}

/** from/to 미설정 시 KST 기준 최근 N일 범위를 반환 */
export function getDefaultKstRange(days = DEFAULT_PERIOD_DAYS): {
  fromKey: string;
  toKey: string;
} {
  const todayKstKey = toKstDateKey(new Date());
  const fallbackFromDate = new Date(
    kstStartOfDay(todayKstKey).getTime() - (days - 1) * DAY_MS,
  );
  return { fromKey: toKstDateKey(fallbackFromDate), toKey: todayKstKey };
}
