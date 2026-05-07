# Stage 15c-1 — shadow 토큰 실 컴포넌트 적용

## 범위

Stage 15b에서 `globals.css`에 추가한 shadow 토큰 3개를 실제 컴포넌트에 적용한 첫 번째 패치.

## 변경 파일 (3파일 5건)

| 파일 | 변경 전 | 변경 후 | 근거 |
|---|---|---|---|
| `src/shared/ui/PageToolbar.tsx:107` | `shadow-sm` | `shadow-toolbar` | sticky toolbar의 drop shadow — design.md `shadow-toolbar` 용도 |
| `src/features/block-management/ui/BlockContentView.tsx:272` | `shadow-sm` | `shadow-card` | 블록 콘텐츠 카드 경계 강조 — design.md `shadow-card` 용도 |
| `src/entities/editor/ui/TiptapEditor.tsx:391` | `shadow-md` | `shadow-popover` | 이미지 드롭다운 팝업 — design.md `shadow-popover` 용도 |
| `src/entities/editor/ui/TiptapEditor.tsx:563` | `shadow-md` | `shadow-popover` | 색상 선택 팝업 |
| `src/entities/editor/ui/TiptapEditor.tsx:596` | `shadow-md` | `shadow-popover` | 테이블 크기 선택 팝업 |

## design.md 정정

`Section 5` shadow-toolbar 용도 설명을 "toolbar 스크롤 drop shadow" → "sticky toolbar drop shadow (always-on)"으로 수정.

**배경**: 초기 설명이 스크롤 시에만 활성화되는 것처럼 읽힐 수 있었으나, PageToolbar의 실제 구현은 `sticky` 일 때 항상 그림자를 적용한다 (`shadow-toolbar` always-on). 스크롤 감지(IntersectionObserver) 기반 조건부 그림자는 향후 stage에서 검토 가능하다.

## 검증

- `pnpm --filter @simple-cms/admin build` 통과 (Stage 15b에서 확인)
- Storybook smoke 56 tests 회귀 없음 (shadow 토큰은 pure CSS utility, 기능 로직 미변경)
- `shadow-sm`/`shadow-md` 제거 후 Tailwind 기본 utility가 아닌 design system 토큰 사용으로 통일

## 미적용 범위 (향후)

- Boolean Switch 5곳 (BoardForm.isPublic 등) — Stage 14 보류 범위와 동일, 자연 시점에 처리
- 나머지 도메인 UI 개편 (색·타이포·간격 정합성) — Stage 15c-2+ 별도 PR
