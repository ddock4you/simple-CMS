# Stage 20 — 게시글 중요 표시 + 공개 본문 렌더링 개선

> **요약**: 게시글에 `isImportant` 상태를 추가해 관리자/공개 목록/홈 최신글에서 중요글을 우선 노출하고, 공개 목록형 게시판에는 일반글 번호와 중요 라벨을 표시했다. 동시에 게시글·서브페이지 RICH_TEXT 본문에 Tailwind Typography를 적용하고, KRDS 전역 CSS와 충돌하던 글자 크기·목록 marker·이미지 정렬·HTML 블록 hydration 문제를 정리했다.

## Context

- 운영자가 공지성 게시글을 목록 최상단에 고정하고 싶어 했다.
- 게시글 작성 UX에서 slug/SEO 값을 매번 수동 입력해야 했다.
- 공개 게시글/서브페이지 본문은 관리자 뷰와 달리 typography 표현이 약했고, 이미지 정렬이 공개 뷰에서 유지되지 않았다.
- 서브페이지 HTML 블록을 2개 이상 사용할 때 `<style>` 문자열의 Windows 개행(`\r\n`) 때문에 SSR/CSR hydration mismatch가 발생했다.
- KRDS React CSS는 전역 root font-size와 list reset을 제공한다.
  - build CSS에서 `--krds-font-size-base: 62.5%` + root `font-size` 적용 확인
  - `ul,ol { list-style: none; }` 전역 reset 확인

## 적용된 변경

### 게시글 중요 표시

| 변경 | 파일 | 내용 |
|---|---|---|
| DB 필드 추가 | `packages/db/prisma/schema.prisma` | `Post.isImportant Boolean @default(false)` |
| 관리자 API | `apps/admin/app/api/posts/route.ts`, `apps/admin/app/api/posts/[id]/route.ts` | 생성/수정/목록/상세 응답과 감사 로그 diff에 `isImportant` 포함 |
| 관리자 UI | `PostForm.tsx`, `PostTable.tsx`, `PostView.tsx` | `중요 게시글` 체크박스 + warning 계열 배지 표시 |
| 시연 모드 | `cloneSeedToSession.ts`, snapshot export/import/types/walker tests | demo clone과 snapshot payload에 `isImportant` 포함. 기존 snapshot은 누락 시 `false` 수용 |

### 정렬 정책

| 영역 | 정렬 |
|---|---|
| 관리자 게시글 목록 | `isImportant DESC`, `updatedAt DESC` |
| 공개 게시판 목록 | `isImportant DESC`, `publishedAt DESC` |
| 홈 `LATEST_POSTS` | 각 게시판 limit 안에서 `isImportant DESC`, `publishedAt DESC` |
| 공개 검색 결과 | 기존 점수 기반 정렬 유지. 중요글 우선 정렬 미적용 |

중요글 내부 정렬은 일반글과 동일한 날짜 필드를 사용한다. 관리자에서는 수정일(`updatedAt`), 공개 영역에서는 발행일(`publishedAt`) 기준이다.

### 공개 목록형 게시판 번호

- LIST 스킨에 `번호` 열을 추가했다.
- 중요글 행은 번호 대신 `중요` 라벨을 표시한다.
- 일반글 번호는 해당 게시판의 공개 일반글(`isImportant = false`) 총 개수를 기준으로 최신 일반글부터 역순 번호를 계산한다.
- 페이지 이동 시에도 번호가 이어지며, 중요글 수는 번호 계산에서 제외한다.
- GALLERY 스킨에는 번호/중요 라벨을 추가하지 않는다.

### 작성 UX

- `SlugField`가 신규 작성의 빈 slug를 제목 기반으로 자동 생성한다.
- 사용자가 slug를 직접 수정하면 자동 동기화를 중단한다.
- 편집 화면의 저장된 slug는 초기 렌더에서 제목으로 덮어쓰지 않는다.
- 신규 게시글 작성 시 `seoTitle`은 제목, `seoDescription`은 본문 plain text를 공백 정규화한 최대 160자 요약으로 자동 입력한다.
- 사용자가 SEO 제목/설명을 직접 수정하면 해당 필드의 자동 동기화를 중단한다.
- 기존 게시글의 빈 SEO 값은 backfill하지 않고, 공개 상세 페이지의 metadata fallback을 유지한다.

### 공개 본문 렌더링

- `@tailwindcss/typography`를 web 앱과 root workspace에 추가했다.
  - Turbopack dev가 `apps/web/app` 기준으로 plugin을 해석하지 못해 root `package.json`에도 직접 의존성을 둔다.
- 게시글 본문과 서브페이지 `RICH_TEXT` 블록은 `TiptapContent` 공용 wrapper를 사용한다.
- 콘텐츠형 홈 팝업도 `TiptapContent`를 재사용한다.
- `.tiptap-content` 전역 CSS 블록은 제거하고, `TiptapContent.tsx`의 Tailwind class 문자열이 본문 렌더링 경계의 단일 진실원이 되었다.
- 본문 기본 크기는 `text-[16px]!`로 고정해 KRDS root `62.5%` 영향을 차단한다.
- 일반 `ul`/`ol`은 `prose-ul:list-disc!`, `prose-ol:list-decimal!`로 marker를 복원한다.
- task list는 `list-none!`을 유지한다.
- Tiptap의 `text-align: center/right` 문단 안 이미지는 Tailwind arbitrary variant로 `inline-block` + `margin-inline: 0`을 강제해 정렬을 유지한다.

## Tailwind 경계 패턴과 한계

이번 작업은 `globals.css`를 줄이려는 방향에 맞춰 본문 출력 스타일을 Tailwind utility로 이동했다. 다만 이 방식에는 명확한 비용이 있다.

- `dangerouslySetInnerHTML`로 들어오는 CMS HTML에는 각 자식 노드에 직접 class를 붙일 수 없다.
- 따라서 wrapper에 `[&_ul]`, `prose-ul:*`, `[&_ul[data-type="taskList"]_li]` 같은 descendant utility를 길게 선언해야 한다.
- KRDS 전역 CSS는 layer 밖에서 root font-size와 list reset을 적용하므로, 충돌하는 속성에는 Tailwind important modifier(`!`)가 필요하다.
- `text-base`, `prose-base`, `p-6` 같은 rem 기반 utility는 KRDS root `62.5%`의 영향을 받는다. CMS 본문처럼 일반 웹 타이포그래피 기준이 필요한 영역은 `text-[16px]`, `pl-[24px]` 같은 px 기반 arbitrary value가 더 안전하다.
- 이 패턴을 다른 영역에 무비판적으로 복제하면 className이 비대해지고 selector 의도가 숨겨질 수 있다.

### 판단 기준

- 일반 React 컴포넌트: Tailwind/KRDS utility를 우선 사용한다.
- CMS/Tiptap처럼 내부 HTML을 제어하지 못하는 영역: 공용 wrapper 컴포넌트를 만들고 wrapper class에 descendant utility를 모은다.
- selector가 너무 복잡해지거나 런타임 사용자 CSS/HTML과 직접 맞물리는 영역: 제한된 CSS를 문서화해서 남긴다.
- `globals.css`는 import, theme/token, reset, 외부 라이브러리 보정처럼 전역성이 필요한 규칙만 남기는 방향을 유지한다.

## Hydration 수정

- HTML 블록에 주입되는 scoped CSS 문자열은 `<style>` 출력 전에 `\r\n` 및 `\r`을 `\n`으로 정규화한다.
- 여러 HTML 블록을 렌더링해도 서버 문자열과 클라이언트 문자열이 일치한다.
- `scopeCustomCss.test.ts`에 Windows 개행 회귀 테스트를 추가했다.

## Critical Files

### 관리자

- `apps/admin/app/api/posts/route.ts`
- `apps/admin/app/api/posts/[id]/route.ts`
- `apps/admin/src/features/post-management/ui/PostForm.tsx`
- `apps/admin/src/features/post-management/ui/PostTable.tsx`
- `apps/admin/src/features/post-management/ui/PostView.tsx`
- `apps/admin/src/entities/form-fields/ui/SlugField.tsx`
- `apps/admin/src/features/block-management/ui/BlockContentView.tsx`

### 공개 웹

- `apps/web/src/shared/ui/TiptapContent.tsx`
- `apps/web/app/globals.css`
- `apps/web/src/entities/post/api/getPostList.ts`
- `apps/web/src/entities/home-section/api/getHomeSections.ts`
- `apps/web/src/pages/board/ui/BoardPage.tsx`
- `apps/web/src/shared/lib/scopeCustomCss.ts`
- `apps/web/src/widgets/home-popup/ui/HomePopupModal.tsx`

### DB / Demo

- `packages/db/prisma/schema.prisma`
- `packages/db/src/demo/cloneSeedToSession.ts`
- `packages/db/src/demo/exportSnapshot.ts`
- `packages/db/src/demo/importSnapshot.ts`
- `packages/db/src/demo/snapshot.types.ts`
- `packages/db/src/demo/snapshotWalker.test.ts`

## Verification

- `pnpm db:push` 성공
- admin typecheck 통과
- web typecheck 통과
- db typecheck 통과
- admin test: 308 passed
- db test: 119 passed, 1 skipped
- web test: 129 passed, 1 expected fail
- web lint: error 0건, 기존 `KoglFooter.tsx` `<img>` warning 2건
- admin build 통과
- web build 통과
- build 산출 CSS에서 다음 규칙 생성 확인:
  - `font-size:16px!important`
  - `list-style-type:disc!important`
  - `list-style-type:decimal!important`
  - task list `list-style-type:none!important`
  - 정렬 이미지 `display:inline-block!important`, `margin-inline:0!important`

## 알려진 한계 / 후속 과제

- `TiptapContent` class 문자열은 의도적으로 길다. CMS HTML 자식에 직접 class를 부여할 수 없는 구조의 대가다.
- 같은 패턴을 여러 wrapper가 복제하지 않도록, rich text 렌더링은 `TiptapContent`로 통일한다.
- 독립형 서브페이지 `IMAGE` 블록의 정렬 옵션은 이번 범위에 포함하지 않았다.
- 공개 검색 결과의 중요글 우선 정렬은 의도적으로 제외했다.
- KRDS root `62.5%`를 근본적으로 격리하려면 krds-react CSS import 정책 또는 scoped CSS 빌드 전략을 별도로 설계해야 한다.
