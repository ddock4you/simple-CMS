# Stage 11c — 에러 바운더리 커버리지 보강

## 요약

admin에 `error.tsx` / `global-error.tsx`가 전무했던 상태를 해소하고,
admin 공용 `ErrorBoundary` 클래스를 신규 추가했다.
web은 기존 `ErrorBoundary` 클래스가 있었으나 실제 사용처가 0개였으므로
위험도가 높은 Client Component 4곳에 래핑을 추가했다.

lint ✅ typecheck ✅ build ✅ (admin + web 양 앱)

---

## 변경 파일 목록

### 신규 생성

| 파일 | 내용 |
|------|------|
| `apps/admin/app/error.tsx` | Next.js 세그먼트 에러 바운더리. `useEffect`로 `console.error` 로깅 + reset 버튼 + `error.digest` 표시. Tailwind + shadcn 토큰 사용 |
| `apps/admin/app/global-error.tsx` | 루트 레이아웃 치명 에러 캡처. `<html lang="ko"><body>` 포함 필수. 기존 파일(web 패턴 그대로) 복제 |
| `apps/admin/src/shared/ui/ErrorBoundary.tsx` | React class Error Boundary. `componentDidCatch`에서 `console.error` + `toast.error`(sonner). fallback prop 없으면 "오류가 발생했습니다. 새로 고침" UI |

### 수정

| 파일 | 변경 내용 |
|------|-----------|
| `apps/admin/src/features/block-management/ui/BlockManager.tsx` | `BlockEditDialog`를 `ErrorBoundary`로 래핑. `fallback={null}` (toast가 사용자 알림 담당). `key` prop을 `BlockEditDialog`에서 `ErrorBoundary`로 이동 — 블록 전환 시 에러 상태도 함께 초기화 |
| `apps/web/src/pages/home/ui/HomePage.tsx` | `HomeSections`와 `HomePopupModal`을 각각 `ErrorBoundary`로 래핑. HomeSections는 기본 fallback(에러 UI), HomePopupModal은 `fallback={null}` |
| `apps/web/src/pages/subpage/ui/SubpagePage.tsx` | `SubpageFeedback`을 `ErrorBoundary`로 래핑. `fallback={null}` |

---

## 설계 판단

### admin ErrorBoundary ≠ web ErrorBoundary

web의 `ErrorBoundary`는 `@/shared/lib/errorReporter`의 `reportError()`를 호출해 `/api/error-report`로 전송한다.
admin에는 `errorReporter`가 없고, 인증된 내부 도구라 toast 알림으로 충분하다.
admin 전용 클래스를 별도 파일로 신규 작성했다.

### fallback 선택 기준

| 위치 | fallback | 이유 |
|------|----------|------|
| `BlockEditDialog` | `null` | Dialog 에러 시 반투명 overlay가 남으면 닫을 방법 없음. toast가 사용자 알림 |
| `HomePopupModal` | `null` | 팝업이 없어도 메인 페이지 콘텐츠가 정상 렌더되어야 함 |
| `SubpageFeedback` | `null` | 피드백 위젯 에러가 본문 표시에 영향 주면 안 됨 |
| `HomeSections` | 기본 fallback | 메인 페이지 핵심 콘텐츠 — 에러 시 사용자에게 명시적 표시 필요 |

### key prop 이동 (BlockManager)

기존:
```tsx
<BlockEditDialog key={editingBlock ? `edit-${id}` : `create-${type}`} ... />
```

변경 후:
```tsx
<ErrorBoundary key={editingBlock ? `edit-${id}` : `create-${type}`} ...>
  <BlockEditDialog ... />
</ErrorBoundary>
```

`key`를 `ErrorBoundary`로 이동하면 블록 전환 시 `ErrorBoundary.state.hasError`도 함께 초기화된다.
기존 동작(DialogContent 언마운트→리마운트로 내부 상태 초기화)은 그대로 유지된다.

### web SearchPage / SubpageBlockRenderer 제외 이유

`SearchPage`와 `SubpageBlockRenderer`는 Server Component다.
Server Component의 런타임 에러는 `apps/web/app/error.tsx`(이미 존재)로 처리된다.
React class `ErrorBoundary`는 Client Component 에러만 캡처한다.
래핑해도 효과가 없으므로 제외했다.

---

## 검증 시나리오

- `apps/admin/app/error.tsx`: 의도적 throw를 발생시키면 세그먼트 단위 에러 UI 표시 + "다시 시도" reset 동작
- `apps/admin/app/global-error.tsx`: 루트 레이아웃에서 의도적 throw 시 치명 에러 UI 표시
- `BlockManager`: `BlockEditDialog` 내부에서 의도적 throw → toast 알림 + 블록 목록 정상 유지

---

## 다음 단계

Stage 11f → 11b → 11a → 11e → 11d 순서로 진행 후 Stage 8 (Docker + CI/CD).
