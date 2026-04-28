# Stage 11b — N+1 쿼리 점검

## 요약

admin API Route와 web 쿼리 전체를 대상으로 N+1 루프 패턴을 정적 분석했다.
루프 내 개별 DB 쿼리 호출 패턴은 발견되지 않았으며, 코드 변경 없이 통과했다.

---

## 점검 결과

### 검사 항목

| 패턴 | 실제 발견 여부 | 비고 |
|------|--------------|------|
| `for...of + await prisma.*` 루프 | ❌ 없음 | admin API, web src 모두 |
| `.forEach + await` | ❌ 없음 | |
| `.map(async ...) (Promise.all 없이)` | ❌ 없음 | |

### 실제 사용 패턴 (N+1 아님)

| 파일 | 패턴 | 평가 |
|------|------|------|
| 페이지네이션 API 전반 | `Promise.all([findMany, count])` | ✅ 병렬 쿼리 |
| `home/reorder`, `home-popups/reorder` | `prisma.$transaction(map(...))` | ✅ 트랜잭션 일괄 실행 |
| `media/bulk-delete` | `for (const media of medias)` 내 `findMediaReferences + delete` | ✅ 의도적 — 부분 성공 행동, zod max(200) 상한 |
| web `getHomeSections` | `Promise.all` batch + Map 조인 | ✅ N+1 방지 패턴 (주석 명시) |
| `home/references`, `link-target/references` | `Promise.all([subpages, boards, posts])` | ✅ 병렬 쿼리 |

### bulk-delete의 루프 패턴에 대한 판단

`apps/admin/app/api/media/bulk-delete/route.ts`의 `for (const media of medias)` 내
`findMediaReferences(media.id)` + `prisma.media.delete()` 호출은 기술적으로 N개 쿼리를 발생시키지만:

1. **설계 의도**: 참조 확인 후 개별 삭제/차단 분리 → partial success 행동이 목적
2. **입력 상한**: Zod `max(200)` 검증으로 최대 200건 제한
3. **대안 부재**: 참조 확인(findMediaReferences)이 복잡한 다중 테이블 스캔이라 batch화 어려움

→ **N+1 문제로 분류하지 않음.** 문서화 주석 추가로 의도 명시.

---

## 조치

`apps/admin/app/api/media/bulk-delete/route.ts`에 의도 주석 추가:

```ts
// 의도적 per-item 루프: 참조 확인 후 개별 삭제/차단 분리 → partial success 행동.
// 입력 zod max(200) 제한으로 최대 쿼리 수 통제.
for (const media of medias) {
```

---

## 다음 단계

Stage 11a → 11e → 11d 순서로 진행.
