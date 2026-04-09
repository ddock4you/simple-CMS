# apps/web — 공개 웹

일반 사용자 대상 공개 웹 애플리케이션. 콘텐츠 소비 중심이며, SSR/SEO를 최우선으로 한다.
KRDS 기반 UI를 사용하고, Storybook으로 문서화한다.

## 앱 성격

- 공개 서비스 전용 (비로그인 접근)
- 콘텐츠 소비 중심
- SSR/SEO 대응 필수
- 포트: **3000**

## FSD 구조 (정석)

```
src/
├── app/          # FSD app 레이어
├── pages/        # FSD pages 레이어
├── widgets/      # 조합형 UI 블록
├── features/     # 기능 단위 로직
├── entities/     # 도메인 엔티티 관련
└── shared/       # 공용 유틸, UI 기본 컴포넌트
```

루트 `app/` 디렉토리는 Next.js App Router 라우팅 전용.
실제 FSD 레이어는 `src/` 아래 구성.

## 라우팅

```
/                                   # 메인 페이지
/p/[slug]                           # 서브페이지
/board/[boardSlug]                  # 게시판 목록
/board/[boardSlug]/[postSlug]       # 게시글 상세
/search?q=...                       # 통합검색
```

## SSR / SEO 정책

- 모든 공개 페이지는 서버사이드 렌더링
- 콘텐츠별 title / description 메타데이터 제공
- 게시글/페이지 상세 metadata 처리
- slug 기반 URL 관리
- `published` 상태 콘텐츠만 공개 노출

## KRDS 사용 원칙

- KRDS는 공개 웹 전용 UI 기반
- KRDS 원본을 직접 사용하는 것이 아닌 **래퍼/조합 컴포넌트**로 관리
- 래퍼 컴포넌트는 `apps/web` 내부 레이어에서 관리 (공용 패키지 X)
- Storybook은 1차에서 공개 웹 UI 중심으로 문서화

## 콘텐츠 표시 규칙

- `published` 상태만 노출 (draft는 표시하지 않음)
- 메뉴: `isVisible = true`인 항목만 노출
- 노출 기간이 있으면 현재 시점 기준 판정
- **부모 메뉴가 비노출이면 하위 메뉴도 함께 비노출**
- 연결된 페이지/게시판이 비공개이면 자동 비노출 처리

## 메뉴 렌더링

- 헤더: `Header Main` 메뉴 세트 사용
- 푸터: `Footer` 메뉴 세트 사용
- 메뉴 레이아웃/반응형은 코드에서 통제
- 모바일/데스크톱 동일 데이터, 렌더링 방식만 분기
- 운영자는 메뉴명/링크/노출 여부/순서만 수정

## 메인 페이지

메인은 일반 서브페이지와 **다른 구조**로 렌더링:

- **섹션 기반 랜딩 페이지** (문서형 아님)
- 레이아웃은 코드에서 통제
- 데이터(텍스트, 이미지, 링크 등)는 운영자가 admin에서 관리
- 섹션 노출 여부/순서는 admin에서 설정한 대로 반영
- 디자이너 시안 → 재사용 가능한 섹션 컴포넌트로 분해
- 예: Hero, 추천 콘텐츠, 바로가기, 최신 게시글, CTA, 공지

## 메인 팝업

- 메인 페이지에서만 노출
- 0개 → 표시 안 함
- **1개 → 단일 모달**
- **2개 이상 → 슬라이드형 모달**
- 순서는 admin에서 정한 순서
- 노출 기간이 있으면 현재 시점 기준 판정

### 팝업 타입

- **콘텐츠형**: 제목 + Tiptap JSON 본문 (`generateHTML()` 렌더링) + 버튼(optional)
- **이미지형**: 이미지 + alt + 링크(optional)

### 접근성 원칙

- 이미지형 팝업 alt 필수
- 모달 제목 제공
- 닫기 버튼 명확화
- 키보드 접근 가능
- 포커스 이동 / 포커스 트랩 고려

## 서브페이지 렌더링

서브페이지 렌더링 순서:

1. **본문**: Tiptap JSON → HTML 변환 (`generateHTML()` from `@tiptap/html`, `@simple-cms/editor` 공유 확장, DOMPurify 새니타이징)
2. **추가 블록**: 블록 타입별 렌더러 연결 (`isVisible = true`인 블록만)
3. **커스텀 HTML**: `customHtml` 필드가 있으면 DOMPurify 새니타이징 후 지정 위치에 삽입
4. **커스텀 CSS**: `customCss` 필드가 있으면 `<style>` 태그로 페이지 스코프 적용

- 블록 순서와 노출 여부는 admin에서 관리한 대로 반영
- `customHtml`/`customCss`가 비어있으면 3, 4단계 생략
- 커스텀 CSS는 해당 페이지에만 적용 (전역 스타일 오염 방지)

## 게시판 / 게시글 렌더링

### 게시판 목록

- 스킨: `list` (목록형) / `gallery` (갤러리형)
- admin에서 설정한 스킨에 따라 렌더링 분기
- `published` 게시글만 표시

### 게시글 상세

- Tiptap JSON 본문 렌더링 (`generateHTML()` from `@tiptap/html`)
- 대표 이미지 표시
- 게시판 정보 함께 표시
- 메타데이터(SEO) 처리

## 통합검색

- **PGroonga 기반 한글 검색**
- 검색 대상: Page(제목+본문) + Post(제목+본문) — `content` 필드는 Tiptap JSON에서 추출한 plain text
- `published` 상태만 인덱싱/검색
- 라우트: `/search?q=...`
- 결과에 타입 구분 표시 (페이지 / 게시글)
- 게시글 결과에 게시판 정보 함께 표시
- 관련도 중심 정렬 (필요 시 최신순 보조)

### 검색 반영 규칙

- 저장/발행 시점에 검색 데이터 갱신
- `published → draft` 또는 비공개 전환 시 검색 결과에서 제외
- `draft` 상태는 검색 인덱싱 대상 제외

### 2차 확장 후보

- 필터(전체/페이지/게시글)
- 하이라이트 스니펫
- 자동완성
- 인기 검색어

## 도메인 설정 반영

관리자가 admin에서 설정한 커스텀 도메인을 공개 웹에 반영한다.

- `middleware.ts`: 요청 호스트네임과 설정 도메인 비교, 불일치 시 301 리다이렉트
- `src/shared/lib/domainCache.ts`: DB 도메인 설정을 인메모리 캐시 (TTL: prod 60초 / dev 5초)
- `src/shared/lib/siteUrl.ts`: `getSiteUrl()` — 도메인 인식 URL 생성 유틸리티
- SEO 반영: `metadataBase`, canonical URL, sitemap, OG 태그에 설정 도메인 적용
- 개발 모드: `NODE_ENV === 'development'`일 때 localhost 접근 항상 허용
- 폴백: DB 설정 없으면 `NEXT_PUBLIC_SITE_URL` 환경변수 사용
- 상세 명세: `docs/react-cms-커스텀-도메인-명세서.md`

## 데이터 페칭 패턴

- 기본: **Server Component + `@simple-cms/db` 직접 Prisma 쿼리** (SSR/SEO 우선)
- 모든 공개 페이지는 서버에서 데이터 조회 후 렌더링
- 데이터 소스: **`@simple-cms/db` 직접 접근** (admin BFF API를 호출하지 않음)
  - 이유: admin과 web은 운영상 독립 — admin 장애가 web에 전파되지 않아야 함
  - web의 쿼리는 읽기 전용 + `published` 필터 + 공개 안전 필드만 select
- Client Component에 데이터 필요 시: **props 전달 우선**, 불가피하면 client-side fetch
- 캐시: Next.js fetch cache + `revalidatePath` / `revalidateTag` 활용
- TanStack Query 등 클라이언트 상태 관리는 사용하지 않음 (읽기 전용 SSR 특성)

## 컴포넌트 구조 패턴

- **pages 레이어**: Server Component — 데이터 fetching + metadata + 레이아웃 조합
- **widgets 레이어**: 조합형 UI 블록 — 헤더, 푸터, 사이드바 등 (Server/Client 혼합)
- **features 레이어**: Client Component 중심 — 검색, 팝업 모달, 모바일 메뉴 등 인터랙티브 기능
- **entities 레이어**: 도메인 표시 컴포넌트 — 게시글 카드, 페이지 요약 등 (주로 Server Component)
- **shared 레이어**: KRDS 래퍼 컴포넌트, 공용 유틸, 기본 UI

## FSD 레이어 의존성 규칙

```
pages → widgets, features, entities, shared  ✅
widgets → features, entities, shared         ✅
features → entities, shared                  ✅
entities → shared                            ✅
```

금지:

- 역방향 import (예: shared → features, entities → widgets) ❌
- 같은 레이어 내 슬라이스 간 직접 import (예: entities/page → entities/post) ❌
- 공유가 필요하면 하위 레이어(entities 또는 shared)로 내림
- `/check-fsd` 스킬로 검증 가능

## 에러 캡처 전략

공개 웹에서 발생하는 런타임 에러를 DB에 기록하여 admin에서 조회할 수 있도록 한다.

### 서버 사이드 에러 캡처

- `app/error.tsx` (루트 에러 바운더리): SSR/Server Component 렌더링 에러 캡처
- `app/global-error.tsx`: 루트 레이아웃 에러 캡처
- `middleware.ts` catch 블록: 미들웨어 에러 캡처
- 로깅: `@simple-cms/db`의 `logWebError()` 직접 호출 (같은 DB 공유)
- fire-and-forget: 에러 로깅이 사용자 응답을 차단하지 않음

### 클라이언트 사이드 에러 캡처

- `src/shared/ui/ErrorBoundary.tsx`: React 에러 바운더리 래퍼 (검색, 팝업 등 인터랙티브 컴포넌트용)
- `src/shared/lib/errorReporter.ts`: 클라이언트 에러 리포터 (`navigator.sendBeacon` 우선, `fetch` 폴백)
- 전역 핸들러: `window.addEventListener('error')`, `window.addEventListener('unhandledrejection')`
- API Route: `app/api/error-report/route.ts` — 클라이언트 에러 수신 엔드포인트
- Rate limiting: IP당 분당 10건 (in-memory 카운터)

### 캡처 컨텍스트

- 서버: URL, method, statusCode, userAgent, IP, referer, error.stack, error.digest
- 클라이언트: URL, userAgent, referrer, error.stack, 컴포넌트명(React boundary)
- 메타데이터(Json): route params, query params, 추가 컨텍스트

### 원칙

- 에러 로깅 실패가 사용자 경험에 영향을 주지 않음
- `logWebError()`는 주 렌더링/응답 트랜잭션에 포함하지 않음
- INFO 레벨 로깅은 범위 외 (ERROR, WARN만)
- 향후 Sentry 등 외부 도구 병행 가능 (logWebError와 독립적 통합)

## 접근성 기본 원칙

- KRDS 컴포넌트의 접근성 속성(aria-\*, role) 유지
- 모든 이미지에 `alt` 필수 (이미지형 팝업 포함)
- 시맨틱 HTML 우선 (`<nav>`, `<main>`, `<article>`, `<section>` 등)
- 키보드 내비게이션 지원 (Tab 순서, Enter/Space 활성화)
- 모달: 포커스 트랩, ESC 닫기, 배경 스크롤 방지
- 색상 대비: WCAG AA 수준 (4.5:1) 목표
- 스크린 리더 테스트: 주요 흐름(메뉴 → 콘텐츠 → 검색) 확인
