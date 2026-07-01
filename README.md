# Simple CMS

> 운영형 관리자 CMS와 공개 웹을 분리 설계한 Next.js 풀스택 한글 CMS 모노레포

Next.js 기반으로 **관리자 CMS(admin)** 와 **공개 웹(web)** 을 분리하고, 실무 CMS에서 반복적으로 필요한 권한 관리, 감사 로그, 콘텐츠 버전 관리, 미디어 참조 추적, 통합 검색, SEO, 접근성, 테스트 자동화를 하나의 구조로 구현한 프로젝트입니다.

[![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io)
[![PostgreSQL + PGroonga](https://img.shields.io/badge/PostgreSQL%20%2B%20PGroonga-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright)](https://playwright.dev)

---

## 링크

- **공개 웹 데모**: [https://simple-cms-web-demo.vercel.app](https://simple-cms-web-demo.vercel.app/)
- **관리자 데모**: [https://simple-cms-web-demo.vercel.app/_cms/admin/login](https://simple-cms-web-demo.vercel.app/_cms/admin/login)
- **공개 웹 Storybook**: [https://simple-cms-web-demo.vercel.app/_cms/storybook/web](https://simple-cms-web-demo.vercel.app/_cms/storybook/web)
- **관리자 Storybook**: [https://simple-cms-web-demo.vercel.app/_cms/storybook/admin](https://simple-cms-web-demo.vercel.app/_cms/storybook/admin)

---

## 프로젝트 개요

공공기관·기업용 웹 서비스를 운영하다 보면 단순 게시판 CRUD를 넘어서는 관리자 시스템 요구사항이 반복적으로 등장합니다. 사용자 승인제, 역할 기반 권한 관리, 데이터 변경 이력, 콘텐츠 발행과 롤백, 미디어 사용처 추적, SEO, 접근성, 운영 환경 분리 같은 요구사항이 대표적입니다.

Simple CMS는 이러한 요구사항을 **운영 가능한 관리자 시스템 구조**로 재구성한 프로젝트입니다. 기능을 많이 넣는 것보다, 장애 전파를 줄이고, 권한·감사 로그 누락을 방지하며, 운영자가 실수해도 복구할 수 있는 구조를 만드는 데 집중했습니다.

---

## 핵심 요약

- **admin / web 분리 모노레포**: 관리자 장애가 공개 웹으로 전파되지 않도록 앱과 책임을 분리
- **RBAC + 감사 로그 표준화**: 권한 체크, Zod 검증, 감사 로그, 응답 래핑을 `defineRoute`로 공통화
- **콘텐츠 버전 관리**: 발행, 미리보기, 수동 버전 저장, 롤백, PRE_ROLLBACK 백업 흐름 구현
- **미디어 참조 추적**: 이미지 중복 업로드 방지와 사용 중 미디어 삭제 차단 구조 설계
- **검색·SEO 구성**: PostgreSQL + PGroonga 통합 검색, 동적 metadata, sitemap, robots, Schema.org JSON-LD 적용
- **품질 자동화**: 280+ 테스트, GitHub Actions matrix, Playwright E2E, axe-core 접근성 검사 구성

---

## 주요 기능

- 커스텀 DB 세션 기반 로그인과 사용자 승인제
- 역할 기반 권한 관리와 메뉴별 CRUD 권한 매트릭스
- 블록 기반 서브페이지 작성, 발행, 미리보기, 버전 관리, 롤백
- 미디어 라이브러리, SHA-256 중복 방지, 사용처 추적
- 게시판, 게시글, 메뉴, 홈 섹션, 팝업, 사이트 설정 관리
- 공개 웹 SSR, KRDS 기반 UI, 통합 검색, 동적 SEO
- 감사 로그, 에러 로그, 만족도 통계, Excel 내보내기
- 운영 self-host와 시연 모드를 동일 코드베이스에서 분기

---

## 핵심 설계 판단

### 1. 관리자와 공개 웹을 분리한 모노레포

**문제**  
관리자 CMS와 공개 웹을 하나의 앱으로 강하게 결합하면, 관리자 장애나 API 문제가 공개 웹 장애로 이어질 수 있습니다. 또한 공개 웹이 관리자 API에 의존하면 장애 격리와 성능 측면에서 불리합니다.

**접근**  
모노레포 안에서 `apps/admin`과 `apps/web`을 별도 Next.js 앱으로 분리했습니다. admin은 콘텐츠 변경, 사용자 관리, 권한, 감사 로그 같은 운영 CRUD를 담당하고, web은 `packages/db`를 통해 읽기 중심으로 공개 페이지를 SSR 렌더링합니다.

**결과**  
데이터 변경 책임은 admin에 모으고, 공개 웹은 읽기 전용 역할에 집중하도록 경계를 분리했습니다. 이를 통해 관리자 장애가 공개 웹으로 직접 전파되는 위험을 줄이고, 운영 서비스에 가까운 앱 분리 구조를 검증했습니다.

---

### 2. 권한 관리와 감사 로그를 표준화한 API 구조

**문제**  
관리자 API가 늘어날수록 인증, 권한 체크, 요청 검증, 에러 처리, 감사 로그, 응답 포맷이 라우트마다 반복됩니다. 이 과정에서 권한 검증이나 감사 로그가 누락될 수 있습니다.

**접근**  
`defineRoute` API factory로 인증, 인가, Zod 파싱, 도메인 핸들러 실행, 감사 로그 기록, 응답 래핑을 표준화했습니다. 일괄 삭제·이동처럼 반복되는 bulk 작업은 별도 helper로 분리했습니다.

**결과**  
관리자 API 작성 규칙 안에 권한과 감사 로그가 포함되도록 만들었습니다. 반복 코드를 줄이는 것뿐 아니라, 운영 시스템에서 누락되기 쉬운 보안·감사 절차를 코드 레벨에서 강제하는 구조를 만들었습니다.

---

### 3. 운영 실수를 복구하기 위한 콘텐츠·미디어 관리

**문제**  
CMS 운영자는 발행 후 실수하거나 과거 상태로 되돌려야 하는 상황을 자주 마주칩니다. 또한 이미 사용 중인 이미지를 삭제하면 공개 페이지가 깨질 수 있습니다.

**접근**  
콘텐츠에는 수동 버전 저장, 발행 시 자동 백업, PRE_ROLLBACK 백업, 소프트 롤백 흐름을 구성했습니다. 미디어는 SHA-256 contentHash로 중복 업로드를 방지하고, 대표 이미지, 본문 이미지, 홈 섹션, 팝업, 버전 스냅샷, 사이트 브랜딩 등 여러 위치의 사용처를 추적했습니다.

**결과**  
운영자가 실수해도 이전 상태로 복구할 수 있고, 사용 중인 미디어의 실수 삭제를 차단할 수 있습니다. CMS 운영에서 자주 발생하는 “되돌리기”와 “참조 깨짐” 문제를 데이터 모델과 UI 흐름 안에서 함께 다뤘습니다.

---

## 기술 스택

| Area | Stack |
| --- | --- |
| Framework | Next.js 16, React 19, TypeScript strict |
| Monorepo | pnpm, Turborepo |
| Data | PostgreSQL, PGroonga, Prisma 7 |
| Admin UI | Tailwind CSS v4, shadcn/ui wrapper, Tiptap, Monaco Editor, dnd-kit |
| State & Form | TanStack Query, Zustand, react-hook-form, Zod |
| Quality | Vitest, Storybook, Playwright, axe-core, GitHub Actions |
| Deploy | Docker compose, Vercel, Supabase |

---

## 추천 확인 흐름

1. Admin Demo에서 로그인 후 사용자 승인제와 역할 기반 권한 관리 확인
2. 권한이 다른 계정으로 로그인해 사이드바 노출과 API 403 응답 확인
3. 서브페이지에서 블록 기반 콘텐츠 작성, 발행, 버전 저장, 롤백 흐름 확인
4. 미디어 라이브러리에서 이미지 업로드, 중복 방지, 사용처 추적 확인
5. Web Demo에서 SSR 공개 페이지, 통합 검색, 동적 메타데이터, 구조화 데이터 확인
6. Storybook에서 admin/web UI 컴포넌트와 인터랙션 확인

---

## 현재 상태

- 핵심 CMS 기능, 공개 웹, 시연 모드, 테스트/CI 구조 구현 완료
- `defineRoute` factory는 주요 관리자 API에 우선 적용했고, 동일 패턴으로 점진 확장 가능한 상태
- 운영 self-host와 Vercel 기반 시연 환경을 동일 코드베이스에서 분기하도록 구성

---

## 로컬 실행 방법

```bash
pnpm install
pnpm db:push
pnpm db:pgroonga
pnpm db:seed
pnpm dev
```

주요 명령어:

```bash
pnpm build       # 전체 빌드
pnpm lint        # lint
pnpm typecheck   # 타입 검사
pnpm test        # unit 테스트
pnpm e2e         # Playwright E2E
pnpm storybook   # Storybook 실행
```
