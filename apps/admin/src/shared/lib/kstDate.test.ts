import { describe, it, expect } from 'vitest';

import {
  kstStartOfDay,
  kstEndOfDay,
  toKstDateKey,
  toKstDateString,
  formatKstDateTime,
  getDefaultKstRange,
  KST_OFFSET_MS,
} from './kstDate';

describe('kstStartOfDay', () => {
  it('YYYY-MM-DD → KST 자정을 UTC Date로 반환', () => {
    const result = kstStartOfDay('2024-01-02');
    // 2024-01-02T00:00:00+09:00 = 2024-01-01T15:00:00.000Z
    expect(result.getTime()).toBe(new Date('2024-01-01T15:00:00.000Z').getTime());
  });

  it('월 첫째 날 경계', () => {
    const result = kstStartOfDay('2024-03-01');
    expect(result.getTime()).toBe(new Date('2024-02-29T15:00:00.000Z').getTime());
  });
});

describe('kstEndOfDay', () => {
  it('YYYY-MM-DD → KST 23:59:59.999를 UTC Date로 반환', () => {
    const result = kstEndOfDay('2024-01-02');
    // 2024-01-02T23:59:59.999+09:00 = 2024-01-02T14:59:59.999Z
    expect(result.getTime()).toBe(new Date('2024-01-02T14:59:59.999Z').getTime());
  });
});

describe('toKstDateKey', () => {
  it('UTC 15:00 = KST 익일 자정 → 익일 날짜 반환 (UTC↔KST 경계 회귀)', () => {
    // UTC 2024-01-01 15:00:00 = KST 2024-01-02 00:00:00
    expect(toKstDateKey(new Date('2024-01-01T15:00:00.000Z'))).toBe('2024-01-02');
  });

  it('UTC 14:59:59 = KST 23:59:59 → 당일 날짜 반환', () => {
    // UTC 2024-01-01 14:59:59 = KST 2024-01-01 23:59:59
    expect(toKstDateKey(new Date('2024-01-01T14:59:59.999Z'))).toBe('2024-01-01');
  });

  it('UTC 자정 = KST 오전 09:00 → KST 당일 반환', () => {
    // UTC 2024-06-15 00:00:00 = KST 2024-06-15 09:00:00
    expect(toKstDateKey(new Date('2024-06-15T00:00:00.000Z'))).toBe('2024-06-15');
  });
});

describe('toKstDateString', () => {
  it('로컬 생성자 Date → 로컬 날짜 문자열 반환', () => {
    // new Date(year, month, day) 는 로컬 기준 자정
    // getFullYear/getMonth/getDate 로 읽으므로 타임존 무관하게 일관됨
    expect(toKstDateString(new Date(2024, 0, 2))).toBe('2024-01-02');
    expect(toKstDateString(new Date(2024, 11, 31))).toBe('2024-12-31');
    expect(toKstDateString(new Date(2024, 0, 1))).toBe('2024-01-01');
  });

  it('한 자리 월/일에 0 패딩', () => {
    expect(toKstDateString(new Date(2024, 2, 5))).toBe('2024-03-05');
  });

  it('toISOString과 달리 로컬 날짜를 유지 (라이브러리 계약 보장)', () => {
    // toISOString().slice(0,10) 은 UTC 기준이라 환경에 따라 전날 반환 가능
    // toKstDateString 은 항상 getFullYear/Month/Date (로컬) 를 반환
    const d = new Date(2024, 0, 2); // 로컬 2024-01-02 자정
    expect(toKstDateString(d)).toBe('2024-01-02');
  });
});

describe('formatKstDateTime', () => {
  it('UTC 15:00:00 → KST 익일 00:00:00 문자열 (회귀)', () => {
    // UTC 2024-01-01 15:00:00 = KST 2024-01-02 00:00:00
    expect(formatKstDateTime(new Date('2024-01-01T15:00:00.000Z'))).toBe(
      '2024-01-02 00:00:00',
    );
  });

  it('UTC 00:00:00 → KST 09:00:00 문자열', () => {
    expect(formatKstDateTime(new Date('2024-06-15T00:00:00.000Z'))).toBe(
      '2024-06-15 09:00:00',
    );
  });
});

describe('getDefaultKstRange', () => {
  it('toKey는 오늘 KST 날짜, fromKey는 29일 전 (30일 범위)', () => {
    const { fromKey, toKey } = getDefaultKstRange(30);
    const todayKst = toKstDateKey(new Date());
    expect(toKey).toBe(todayKst);

    const fromDate = kstStartOfDay(fromKey);
    const toDate = kstStartOfDay(toKey);
    const diffDays = Math.round(
      (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    expect(diffDays).toBe(29);
  });

  it('기본 period는 30일', () => {
    const { fromKey, toKey } = getDefaultKstRange();
    const fromDate = kstStartOfDay(fromKey);
    const toDate = kstStartOfDay(toKey);
    const diffDays = Math.round(
      (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    expect(diffDays).toBe(29);
  });

  it('kstStartOfDay 와 kstEndOfDay 의 KST_OFFSET_MS 일관성', () => {
    expect(KST_OFFSET_MS).toBe(9 * 60 * 60 * 1000);
  });
});
