---
name: Simple CMS Admin Design System
version: alpha
description: 내부 운영자용 CMS 관리자 앱 디자인 시스템 — 데이터 밀도 우선·단일 액션 색·다크 모드 1급

colors:
  background: "#ffffff"
  foreground: "#0a0a0a"
  primary: "#171717"
  primary-foreground: "#fafafa"
  secondary: "#f5f5f5"
  secondary-foreground: "#171717"
  muted: "#f5f5f5"
  muted-foreground: "#737373"
  accent: "#f5f5f5"
  accent-foreground: "#171717"
  destructive: "#e7000b"
  border: "#ebebeb"
  input: "#ebebeb"
  ring: "#a1a1a1"
  card: "#ffffff"
  card-foreground: "#0a0a0a"
  popover: "#ffffff"
  popover-foreground: "#0a0a0a"
  success: "#00801a"
  success-foreground: "#fafafa"
  warning: "#ed9800"
  warning-foreground: "#171717"

typography:
  page-title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  section-title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.33
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  body-strong:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, monospace"
    fontSize: "12px"
    fontWeight: 400

rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  full: "9999px"

spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  page-x: "24px"
  card: "24px"

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
    padding: "24px"
  dialog:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
    rounded: "{rounded.lg}"
    padding: "24px"
  badge:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
---

# Simple CMS Admin 디자인 시스템

## 1. Overview

**디자인 철학**: 운영자가 데이터를 빠르게 파악하고 액션을 실행하는 것을 최우선으로 한다. 시각적 노이즈를 최소화하고, 단일 액션 색으로 CTA를 명확하게 구분한다.

**핵심 키워드**: 낮은 시각 노이즈 · 단일 액션 색 · 데이터 밀도 우선 · 다크 모드 1급

### 문서 분담

| 문서 | 책임 |
|---|---|
| `apps/admin/design.md` (이 파일) | 시각 결정 (색·타이포·간격·라운드·primitives) · Stitch lint 가능 |
| `apps/admin/CLAUDE.md` | 운영 정책 (권한·감사로그·페이지 레이아웃 패턴·Stage 진행) |
| `apps/admin/.storybook/` | 실물 컴포넌트 시각 검증 · 인터랙션 회귀 |

- **runtime 진실원**: `apps/admin/app/globals.css` — oklch 토큰, `:root` + `.dark` 페어. 이 파일이 실제 렌더링을 결정한다.
- **문서 진실원**: `apps/admin/design.md` (이 파일) — Stitch hex 근사값으로 디자이너/PM 가독성 우선. hex와 oklch 간 sRGB 차이 < 0.01은 의도적.

### lint 명령

```bash
npx --yes @google/design.md lint apps/admin/design.md
pnpm --filter @simple-cms/admin design:verify   # oklch ↔ hex ΔE 검증 (ΔE > 1.5 시 exit 1)
```

> **경고**: `npx @google/design.md export css-tailwind` 실행 금지 — globals.css의 oklch · light/dark 페어 · radius calc() 구조를 덮어써 shadcn 28개 컴포넌트를 파괴한다.

---

## 2. Colors

`{colors.primary}` (#171717)는 admin의 **유일한 액션 색**이다. 저장·추가·발행·승인 등 모든 주 CTA에 이 색만 사용한다. 두 번째 brand color를 추가하면 "어디를 클릭해야 하는가"라는 신호가 흐려진다.

### shadcn 토큰 의미 매핑

| 토큰 | 사용처 |
|---|---|
| `{colors.primary}` (#171717) | 주 CTA — 저장·추가·발행·승인 |
| `{colors.primary-foreground}` (#fafafa) | primary 버튼 위 텍스트 |
| `{colors.secondary}` (#f5f5f5) | 보조 액션 — 취소·닫기·편집 진입 |
| `{colors.secondary-foreground}` (#171717) | secondary 버튼 위 텍스트 |
| `{colors.destructive}` (#e7000b) | 삭제·거절·정지·비활성 |
| `{colors.success}` (#00801a) | diff add · 긍정 평가(POSITIVE) · DNS 정상 · 성공 |
| `{colors.success-foreground}` (#fafafa) | success 배경 위 텍스트 |
| `{colors.warning}` (#ed9800) | pin 표시 · DNS pending · slug 경고 · 비파괴 주의 |
| `{colors.warning-foreground}` (#171717) | warning 배경 위 텍스트 |
| `{colors.muted-foreground}` (#737373) | 보조 설명·placeholder·hint |
| `{colors.border}` (#ebebeb) | 카드·패널·입력 경계 |
| `{colors.card}` / `{colors.card-foreground}` | 카드 배경·텍스트 |
| `{colors.popover}` / `{colors.popover-foreground}` | Dialog·Tooltip 배경·텍스트 |
| `{colors.ring}` (#a1a1a1) | focus ring |
| `--sidebar-*` (globals.css 전용) | AppSidebar 전용 — YAML 제외 |
| `--chart-1..5` (globals.css 전용) | recharts 시각화 전용 — YAML 제외 |

### 다크 모드 델타 (runtime은 globals.css가 담당)

Stitch DESIGN.md는 단일 토큰 세트만 표현한다. 아래 표는 light/dark 간 변화를 문서화한다. 실제 CSS는 `app/globals.css`의 `:root` + `.dark` 페어가 권위이다.

| 토큰 | light | dark | 비고 |
|---|---|---|---|
| background | #ffffff | #0a0a0a | oklch L: 1 → 0.145 |
| foreground | #0a0a0a | #fafafa | 명도 반전 |
| primary | #171717 | #e5e5e5 | oklch L: 0.205 → 0.922 |
| primary-foreground | #fafafa | #171717 | 명도 반전 |
| card | #ffffff | #171717 | oklch L: 1 → 0.205 |
| secondary | #f5f5f5 | #262626 | oklch L: 0.97 → 0.269 |
| border | #ebebeb | rgba(255,255,255,0.10) | dark는 alpha 기반 |
| muted-foreground | #737373 | #a1a1a1 | 보조 텍스트 명도 올림 |
| success | #00801a | #57b75e | oklch L: 0.52 → 0.7 |
| warning | #ed9800 | #ffb330 | oklch L: 0.745 → 0.82 |

### WCAG AA 대비율 (기준 4.5:1)

| 조합 | 대비율 | 결과 |
|---|---|---|
| `{colors.foreground}` on `{colors.background}` | ~19.8:1 | ✅ AAA |
| `{colors.primary-foreground}` on `{colors.primary}` | ~17.2:1 | ✅ AAA |
| `{colors.destructive}` on `{colors.background}` | ~4.8:1 | ✅ AA |
| `{colors.secondary-foreground}` on `{colors.secondary}` | ~16.4:1 | ✅ AAA |
| `{colors.muted-foreground}` on `{colors.background}` | ~4.8:1 | ✅ AA — hint/장식 전용 |
| `{colors.success-foreground}` on `{colors.success}` | ~4.9:1 | ✅ AA |
| `{colors.warning-foreground}` on `{colors.warning}` | ~7.8:1 | ✅ AAA |

> `{colors.muted-foreground}`는 에러 메시지·필드 라벨 등 필수 정보에 사용 금지. placeholder·보조 안내·테이블 secondary 텍스트에만 허용. `{colors.warning}` (#ed9800)을 텍스트 색으로 직접 사용 시 white 배경 대비율 ~2.3:1 — 배경 색 또는 `{colors.warning-foreground}` 위 텍스트로만 사용.

---

## 3. Typography

폰트: **Geist** (`next/font`로 로드 → `--font-sans` CSS 변수 주입). 폴백: `system-ui, sans-serif`.

### 스케일 매핑

| 용도 | Tailwind 클래스 | 토큰 | 비고 |
|---|---|---|---|
| 페이지 표제 | `text-2xl font-semibold tracking-tight` | `{typography.page-title}` | PageHeader title |
| 섹션 표제 | `text-lg font-semibold` | `{typography.section-title}` | Card title, 폼 섹션 헤더 |
| 본문 (기본) | `text-sm` | `{typography.body}` | 데이터 밀도 우선 (14px) |
| 강조 본문 | `text-base` | `{typography.body-strong}` | 상세 메타, Dialog body |
| 보조 설명 | `text-xs text-muted-foreground` | `{typography.caption}` | 폼 hint, 테이블 secondary |
| 코드 | `font-mono text-xs` | `{typography.mono}` | Monaco 외부 inline 코드 |

**원칙:**
- `tracking-tight`는 `{typography.page-title}` (`text-2xl` 이상) 에만 적용
- weight ladder: **400 / 600** 주 사용 (500은 제한적, 700은 거의 미사용)
- 기본 본문 14px(`text-sm`) 유지 — 데이터 밀도를 위한 의도적 선택 (Apple 17px와 차이)

---

## 4. Layout

### 반응형 브레이크포인트 (Tailwind 기본)

| 토큰 | 값 | admin 의미 |
|---|---|---|
| `sm` | 640px | 거의 미사용 |
| `md` | 768px | 모바일↔태블릿 분기 (PageToolbar Sheet collapse 경계) |
| `lg` | 1024px | 태블릿↔데스크톱 분기 (admin 주 사용 환경) |
| `xl` | 1280px | 와이드 모니터 |
| `2xl` | 1536px | 초와이드 (거의 미사용) |

admin은 **데스크톱 우선**. 모바일(`< md`)에서는 PageToolbar가 Top Sheet로 collapse된다.

### 페이지 레이아웃 표준

```
AdminHeader (sticky top-0 z-10)
PageHeader  (페이지 제목 · back · tabs)
PageToolbar (sticky top-14 z-20 · 필터/검색 left · CTA 버튼 right)
본문 영역   (카드 · 테이블 · 편집 폼)
```

편집 폼 패턴: `<form>` 안에 PageHeader + PageToolbar(저장/삭제) + Card(폼 필드).

### spacing 토큰 사용처

| 토큰 | 값 | 사용처 |
|---|---|---|
| `{spacing.xs}` | 4px | 아이콘·라벨 간격, chip 내부 |
| `{spacing.sm}` | 8px | 버튼 내부 padding, Badge |
| `{spacing.md}` | 16px | 섹션 내부 요소 간격 |
| `{spacing.lg}` | 24px | 카드 padding, 페이지 수평 여백 |
| `{spacing.xl}` | 32px | 섹션 간 여백 |
| `{spacing.page-x}` | 24px | 페이지 좌우 padding |
| `{spacing.card}` | 24px | Card 내부 padding |

---

## 5. Elevation & Depth

**원칙**: admin은 그림자보다 **명도 계조**로 elevation을 표현한다. 카드(`{colors.card}`)와 배경(`{colors.background}`)이 light에서 같은 흰색이지만 `{colors.border}`로 구분된다. 다크 모드에서는 oklch L 차이가 계층을 만든다.

### z-index 계단

| 레이어 | z-index | 비고 |
|---|---|---|
| AdminHeader | `z-10` | `sticky top-0` |
| PageToolbar | `z-20` | `sticky top-14` (AdminHeader 높이) |
| Dialog | `z-50` (shadcn 기본) | — |
| Toast | `z-[100]` (sonner 기본) | — |

### 그림자 토큰 (Stage 15b 추가)

`globals.css`에 정의된 shadow CSS custom properties. Tailwind utility class(`shadow-card`, `shadow-toolbar`, `shadow-popover`)로 사용 가능.

| 토큰 | light | dark | 용도 |
|---|---|---|---|
| `shadow-card` | `0 1px 2px oklch(0 0 0 / 4%)` | `0 1px 3px oklch(0 0 0 / 20%)` | 카드 경계 강조 |
| `shadow-toolbar` | `0 2px 8px oklch(0 0 0 / 6%)` | `0 2px 8px oklch(0 0 0 / 20%)` | sticky toolbar drop shadow (always-on) |
| `shadow-popover` | `0 4px 24px oklch(0 0 0 / 8%), 0 2px 8px oklch(0 0 0 / 4%)` | `0 4px 24px oklch(0 0 0 / 30%), 0 2px 8px oklch(0 0 0 / 20%)` | Dialog·Tooltip 부유 |

**구현 패턴**: `@theme inline { --shadow-card: var(--shadow-card-value); }` + `:root`/`.dark`에 `--shadow-card-value` 정의 (Tailwind v4 순환 참조 방지).

### shadow 토큰 적용 표면 (Stage 15c-1 + 15c-2)

| 표면 | 컴포넌트 | 적용 방법 | Stage |
|---|---|---|---|
| sticky toolbar | `PageToolbar` | 직접 `shadow-toolbar` | 15c-1 |
| 블록 콘텐츠 카드 | `BlockContentView` | 직접 `shadow-card` | 15c-1 |
| Tiptap 팝업 (3곳) | `TiptapEditor` bubble/link/image | 직접 `shadow-popover` | 15c-1 |
| AppSidebar floating/inset | `sidebar.tsx` (admin 변형 예외) | 직접 `shadow-card` | 15c-2 |
| MediaCard 선택 배지 | `MediaCard` | 직접 `shadow-card` | 15c-2 |
| Popover·Select·DropdownMenu·Sheet Content | wrapper 4개 | `cn('shadow-popover', className)` | 15c-2 |

**wrapper 정책**: `shared/ui/shadcn/` 직접 수정 금지 → `shared/ui/{Popover,Select,DropdownMenu,Sheet}.tsx` wrapper가 `Content` 컴포넌트에 `shadow-popover` 주입. ESLint `no-restricted-imports`로 직접 import 차단.

### light/dark alpha 정책

- light: 그림자 alpha 2~4% (barely visible)
- dark: 그림자 alpha 15~20% (명도 낮아 더 진하게)
- `{colors.border}` 활용 우선 (다크 모드에서 `oklch(1 0 0 / 10%)`)

---

## 6. Shapes

`--radius: 0.625rem`가 admin 라운드 시스템의 기준값이다. 모든 파생 값은 이 변수의 calc()로 자동 결정된다.

### 사용처 표

| 토큰 | 값 | CSS 변수 | 사용처 |
|---|---|---|---|
| `{rounded.sm}` | 0.375rem | `--radius-sm` | Badge, chip, 작은 인디케이터 |
| `{rounded.md}` | 0.5rem | `--radius-md` | Button, Input, Select |
| `{rounded.lg}` | 0.625rem | `--radius-lg` | Card, Dialog, Popover, Tooltip |
| `{rounded.xl}` | 0.875rem | `--radius-xl` | Sheet, 큰 오버레이 |
| `{rounded.full}` | 9999px | — | 완전 pill (검색 chip, 원형 아이콘) |

> shadcn/ui는 `{rounded.lg}`를 기본값으로 사용한다. Apple식 pill CTA(`{rounded.full}`)는 운영 도구에 적합하지 않아 미채택.

---

## 7. Components

### YAML primitives (시각 토큰 명세)

| 컴포넌트 | backgroundColor | textColor | rounded | padding |
|---|---|---|---|---|
| `{components.button-primary}` | `{colors.primary}` | `{colors.primary-foreground}` | `{rounded.md}` | 8px 16px |
| `{components.button-secondary}` | `{colors.secondary}` | `{colors.secondary-foreground}` | `{rounded.md}` | 8px 16px |
| `{components.button-destructive}` | `{colors.destructive}` | `{colors.primary-foreground}` | `{rounded.md}` | 8px 16px |
| `{components.card}` | `{colors.card}` | `{colors.card-foreground}` | `{rounded.lg}` | 24px |
| `{components.dialog}` | `{colors.popover}` | `{colors.popover-foreground}` | `{rounded.lg}` | 24px |
| `{components.badge}` | `{colors.secondary}` | `{colors.secondary-foreground}` | `{rounded.sm}` | 2px 8px |
| `{components.input}` | `{colors.background}` | `{colors.foreground}` | `{rounded.md}` | 8px 12px |

### 합성 컴포넌트 가이드

합성 컴포넌트의 픽셀 스펙은 Storybook이 진실원이다. 이 섹션은 토큰 사용 근거와 규칙을 다룬다.

#### 레이아웃

**AdminHeader** (`src/shared/ui/layout/AdminHeader.tsx`)
- Storybook: `Admin/Widgets/AdminHeader`
- 토큰: `{colors.background}` 배경, sticky top-0 z-10
- 규칙: 전역 nav bar. 사이트명 + 검색 트리거(Cmd+K) + 사용자 메뉴. 항상 표시

**AppSidebar / SidebarNavContent** (`src/shared/ui/layout/SidebarNavContent.tsx`)
- Storybook: `Admin/Shared/Layout/SidebarNavGroups`
- 토큰: `--sidebar-*` 전용 토큰 사용 (globals.css). `{colors.primary}`와 분리
- 규칙: FSD 리소스별 메뉴 그룹. `getVisibleMenuItems()`로 권한 필터링

**PageHeader** (`src/shared/ui/PageHeader.tsx`)
- Storybook: `Admin/Shared/PageHeader`
- 토큰: `{typography.page-title}` 제목, `{colors.muted-foreground}` 설명
- 규칙: sticky 아님(default). 슬롯: back / title / description / tabs. `actions` 슬롯 신규 사용 금지 (PageToolbar.right로 대체)

**PageToolbar** (`src/shared/ui/PageToolbar.tsx`)
- Storybook: `Admin/Shared/PageToolbar`
- 토큰: `{colors.background}` + sticky breakout(전체 폭), `{colors.border}` 하단 경계
- 규칙: sticky top-14 z-20. left=필터/검색(Read), right=CUD 버튼. 편집 폼 [저장]/[삭제]는 반드시 right에

#### 데이터

**DataTable** (TanStack Table 기반, `src/shared/ui/shadcn/table.tsx` 원자 + 도메인별 페이지에서 직접 조립)
- 토큰: `{colors.border}` 셀 경계, `{colors.muted}` 헤더 배경
- 규칙: 정렬·페이지네이션은 URL 쿼리 파라미터 기반 서버 사이드

**ListSearchInput** (`src/shared/ui/ListSearchInput.tsx`)
- 토큰: `{components.input}` 기반, `{colors.border}` 경계
- 규칙: Enter + [검색] 버튼 submit만. debounce 자동 검색 금지 (서버 부담)

**ListSummary** (`src/shared/ui/ListSummary.tsx`)
- 토큰: `{typography.caption}`, `{colors.muted-foreground}`
- 규칙: PageToolbar 바로 아래, 테이블 바로 위에 배치. `총 N건` 표시

**ListPagination** (`src/shared/ui/ListPagination.tsx`)
- Storybook: `Admin/Entities/Media/MediaPagination` (MediaPicker 전용 variant)
- 토큰: `{rounded.md}` 페이지 버튼
- 규칙: URL `page` 쿼리 파라미터로 상태 관리

#### 폼

**Card + Field 패턴** (`src/shared/ui/shadcn/card.tsx`)
- 토큰: `{components.card}` — `{spacing.card}` padding, `{rounded.lg}` 라운드
- 규칙: 폼 섹션을 Card로 묶어 시각 그룹화. CardHeader(제목) + CardContent(필드)
- **Auth 페이지 예외**: `LoginForm` / `RegisterForm`은 빈 배경 중앙 카드 패턴(시각적으로 분리). CardTitle = `text-xl`, 의도적 deviation. `{typography.section-title}`(`text-lg`) 미적용.
- **StatCard 예외**: `src/shared/ui/layout/StatCard.tsx` CardTitle은 `text-sm font-medium` — 대시보드 수치 라벨 형식의 의도된 deviation.

**ImageUrlInput** (`src/entities/media/ui/ImageUrlInput.tsx`)
- Storybook: `Admin/Entities/Media/ImageUrlInput`
- 토큰: `{components.input}`, `{components.button-secondary}`
- 규칙: URL 직접 입력 + 파일 업로드 + 라이브러리 선택 3방식 통합

**TiptapEditor** (`src/shared/ui/TiptapEditor.tsx`)
- 토큰: `prose prose-sm` (Tailwind Typography), `{colors.border}`
- 규칙: RICH_TEXT 블록 및 Post 본문 전용. 이미지 paste/drop 시 자동 업로드

#### 인터랙션·피드백

**Button** (`src/shared/ui/shadcn/button.tsx`)
- Storybook: `Admin/Shadcn/Button`
- 토큰: `{components.button-primary}` / `{components.button-secondary}` / `{components.button-destructive}`
- 규칙: hover `scale(0.98)` micro-interaction. 폼 외부 버튼에 `type="button"` 명시 필수

**Dialog** (`src/shared/ui/shadcn/dialog.tsx`)
- Storybook: `Admin/Shared/Dialog`
- 토큰: `{components.dialog}`, size 토큰 (`sm` / `md` / `lg` / `xl`)
- 규칙: 입력 폼이 있는 Dialog는 `disablePointerDismissal` + Dirty 가드 필수

**AlertDialog** (`src/shared/ui/AlertDialog.tsx` wrapper → `shadcn/alert-dialog.tsx`)
- Storybook: `Admin/Shared/AlertDialog`
- 토큰: `{components.dialog}`, size 토큰 3-tier

| size 토큰 | max-width | 사용 의도 | 기본값 |
|---|---|---|---|
| `confirm` | `max-w-xs sm:max-w-sm` | 단순 확인/거절 (1~2줄 메시지) | ✅ |
| `default` | `max-w-md` | 설명 필요 또는 소량 동적 콘텐츠 (DeleteMedia, RestoreVersion 등) | — |
| `wide` | `max-w-xl` | 참조 목록 등 동적 콘텐츠 (BulkXxx 8개) | — |

- 규칙: `<AlertDialogContent size="wide">` 방식 사용. ad-hoc `max-w-*` className 직접 지정 금지 (ESLint 가드 미설정, docs로 안내)

**Badge** (`src/shared/ui/shadcn/badge.tsx`)
- 토큰: `{components.badge}` 기본, variant로 outline/destructive 분기
- 규칙: 상태(PUBLISHED/DRAFT/PENDING) + 타입 표시 전용

**InlineStatusSwitchToggle** (`src/shared/ui/InlineStatusSwitchToggle.tsx`)
- Storybook: `Admin/Shared/InlineStatusSwitchToggle`
- 토큰: `{colors.primary}` checked 상태, `{colors.secondary}` unchecked
- 규칙: 목록 인라인 상태 토글. `onState="PUBLISHED"` / `offState="DRAFT"` 페어

**BulkActionBar** (`src/shared/ui/BulkActionBar.tsx`)
- Storybook: `Admin/Shared/BulkActionBar`
- 토큰: `{colors.primary}` 강조 배경, `{colors.primary-foreground}` 텍스트
- 규칙: 체크박스 선택 시 PageToolbar 위치 대체. 선택 수 + 일괄 액션 버튼

**ConfirmLeaveDialog** (`src/shared/ui/ConfirmLeaveDialog.tsx`)
- Storybook: `Admin/Shared/ConfirmLeaveDialog`
- 토큰: `{components.dialog}`, `{components.button-destructive}` 확인 버튼
- 규칙: `useDirtyGuard` / `useDialogDirtyGuard`와 쌍으로 사용

**Toast** (sonner 기반, `src/shared/ui/shadcn/sonner.tsx`)
- 토큰: `{colors.background}`, `{colors.destructive}` (error variant)
- 규칙: z-[100]. 성공/실패 피드백 전용

**OrderActionButtons** (`src/shared/ui/OrderActionButtons.tsx`)
- Storybook: `Admin/Shared/OrderActionButtons`
- 토큰: `{components.button-secondary}` 스타일
- 규칙: dnd-kit staged commit 패턴 전용 — [순서 저장] 버튼으로 명시적 commit

**BooleanSwitchField** (`src/shared/ui/BooleanSwitchField.tsx`)
- 토큰: shadcn `Switch` + `{typography.body}` 라벨 + `{typography.caption}` description
- 규칙: RHF `Controller` 통합 폼 전용. 목록 인라인 토글(`InlineBooleanToggle`/`InlineStatusSwitchToggle`)과 분리. `disabled` prop으로 조건부 비활성화 (SubpageForm cclAi — cclType null일 때)

---

## 8. Do's and Don'ts

### Do ✅

1. `{colors.primary}` (#171717)를 모든 주 CTA(저장·추가·발행·승인)에 **일관되게** 사용. 두 번째 액션 색 신설 금지
2. 압력(press) 상태에 `transform: scale(0.98)` micro-interaction 적용
3. 페이지 제목은 `{typography.page-title}` (`text-2xl font-semibold tracking-tight`) 사용
4. 신규 토큰 추가 시 globals.css에 **`:root` + `.dark` 페어** 정의 필수
5. Dialog에 입력 폼이 있으면 `disablePointerDismissal` + `useDialogDirtyGuard` 함께 적용
6. 편집 폼의 [저장]/[삭제] 버튼은 PageToolbar.right에 배치
7. `{colors.muted-foreground}`는 hint·보조 설명·placeholder에만 사용 (AA 통과이나 필수 정보 라벨에 사용 금지)

### Don't ❌

1. `npx @google/design.md export css-tailwind` 실행 금지 — globals.css 덮어쓰기로 shadcn 28개 파괴
2. 신규 brand color 신설 금지 (디자이너 합류 전까지). 단, `destructive`/`success`/`warning` 같은 시맨틱 피드백 색은 brand가 아닌 functional 토큰이며 신설 가능
3. shadcn 표준 토큰(`--primary`, `--ring`, `--background` 등) 이름·값 변경 금지 — 28개 컴포넌트 의존
4. YAML `components:` 에 합성 컴포넌트(PageHeader, PageToolbar, BulkActionBar 등) 추가 금지 — 슬롯·동작·다크 분기는 Storybook + markdown이 담당
5. `{colors.muted-foreground}`를 에러 메시지·필드 라벨 등 필수 정보에 사용 금지
6. debounce 자동 검색 사용 금지 (검색은 form submit 기반 — 서버 부담 정책)

---

## 부록 A. Apple 디자인 시스템 — 영감 출처

> 학습 자료. 마케팅 사이트 vs 운영 도구의 차이를 이해하기 위한 참고. 원본 분석 대상: Apple 홈페이지·스토어·환경 페이지·iPhone 구매 페이지·액세서리 페이지.

### admin에 채택한 Apple 원칙

| Apple 원칙 | admin 적용 | 비고 |
|---|---|---|
| 단일 액션 색 (Action Blue #0066cc) | `{colors.primary}` (#171717) 단일 색 | 색은 다르지만 "단일 액션 색" 원칙 채택 |
| hover 대신 `scale(0.95)` press interaction | `scale(0.98)` (더 절제된 수준) | 운영 도구는 더 미세하게 |
| weight ladder: 300/400/600/700 (500 부재) | 400/600 주 사용, 700 제한 | admin은 300 미사용 |
| 그림자는 product imagery에만 | 카드 그림자 최소화 | 명도 계조로 elevation 표현 |

### admin에서 채택하지 않은 Apple 패턴

| Apple 패턴 | 미채택 이유 |
|---|---|
| pill CTA (`{rounded.full}`) | 운영 도구에서 pill은 지나치게 마케팅적. `{rounded.md}` 사용 |
| 교차 tile 구조 (white ↔ dark full-bleed) | 마케팅 페이지 전용. admin은 PageHeader + PageToolbar + Card 단일 레이아웃 |
| 17px body text | 데이터 테이블 환경에서 14px가 더 많은 정보 노출 |
| 마이너스 letter-spacing 전면 적용 | `{typography.page-title}`에만 `-0.025em` 적용. Apple의 `-0.374px`는 브랜드 헤드라인 전용 |

### 참고: Apple 색 시스템 요약

- **단일 인터랙티브 색**: #0066cc (Action Blue) — 모든 링크, CTA, focus ring
- **서브 배경**: #f5f5f7 (Parchment) — 교차 tile, footer
- **본문 텍스트**: #1d1d1f (Near-black Ink) — 순수 검정 대신 near-black
- **그림자**: `rgba(0,0,0,0.22) 3px 5px 30px` 단 하나 — product imagery에만
- **그라디언트**: 없음 (사이트 전체에 걸쳐 CSS 그라디언트 토큰 0개)

이 철학(단일 색, 단일 shadow, 0 gradient, 단순 weight ladder)이 admin 디자인 원칙의 토대에 영향을 주었다.

---

## 부록 B. 토큰 외 색 허용 예외

아래 위치는 design.md 토큰 시스템 밖의 직접 색 지정이 허용된다. 신규 케이스 추가 시 이 표에 1줄 등록.

| 위치 | 사유 | 영구/일시 |
|---|---|---|
| `app/global-error.tsx` | Tailwind 미해석 환경(error boundary fallback). inline style 강제 | 영구 |
| `**/*.stories.tsx` (DirtyGuardProbe 등) | 테스트 fixture 색 — 디자인 토큰 아님 | 영구 |
| `shared/ui/TiptapEditor` color picker 팔레트 | 사용자 콘텐츠 색 데이터 — 디자인 토큰 아님 | 영구 |
