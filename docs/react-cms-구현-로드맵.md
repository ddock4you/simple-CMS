# React CMS 구현 로드맵

## 1. 문서 목적

이 문서는 CMS 설계 문서를 바탕으로 실제 구현 순서를 정리한 로드맵이다.
핵심 구조부터 안정적으로 쌓아가면서 점진적으로 완성도를 높인다.

---

## 2. 구현 원칙

- **수직 슬라이싱**: 매 단계마다 백엔드 + UI를 함께 개발하여 직접 확인 가능한 상태를 목표로 한다
- **구조 우선**: 공용 패키지와 앱 역할을 먼저 고정한 뒤 기능을 쌓는다
- **확인 가능한 결과물**: 각 단계 완료 시 브라우저에서 해당 기능을 직접 조작할 수 있어야 한다 (Stage 1 제외)
- **점진적 확장**: 1차 MVP를 완성한 뒤 확장 기능을 추가한다

### 로드맵 변경 정책

> 개발 중 기능 보강, 신규 추가, 삭제가 언제든 발생할 수 있다.
> 단계 번호는 고정 순서가 아닌 논리적 그룹이며, 우선순위와 범위는 필요에 따라 조정한다.
> 변경 시 이 로드맵과 Root CLAUDE.md, 관련 앱 CLAUDE.md를 함께 업데이트한다.

---

## 3. 전체 단계 요약

### Stage 1 — 기초 환경

모노레포, 앱 초기화, 공유 설정

### Stage 2 — DB / 인증 / 사용자

- 2a: Prisma + 커스텀 세션 인증 + 로그인 UI
- 2b: 회원가입 + UI
- 2c: Admin 레이아웃 + 대시보드 껍데기
- 2d: 사용자 관리 + UI
- 2e: 프로필/비밀번호 변경 + UI

### Stage 3 — Admin CMS 기능

- 3-pre: `packages/editor` 패키지 생성 (Tiptap 공유 확장 정의, 콘텐츠 CSS, 텍스트 추출 유틸)
- 3a: 서브 페이지 CRUD + UI (Tiptap, JSON 저장)
- 3b: 게시판 CRUD + UI
- 3c: 게시글 CRUD + UI
- 3d: 메뉴 관리 + UI (dnd-kit)
- 3e: 감사 로그 + UI + 내보내기
- 3f: 사이트 설정 (도메인/보안/업로드) + UI

### Stage 4 — 공개 웹

- 4a: 메인+서브페이지 렌더링 + KRDS 레이아웃
- 4b: 게시판/게시글 렌더링
- 4c: 메뉴 렌더링 + 도메인 미들웨어
- 4d: 통합검색 (PGroonga)
- 4e: 에러 캡처 + Admin 에러 로그 UI

### Stage 5 — 메인 페이지 전용

- 5a: 메인 섹션 관리 + Admin UI + Web 렌더링
- 5b: 메인 팝업 관리 + Admin UI + Web 모달

### Stage 6–8 — 확장 / 인프라

- 6: 서브페이지 블록 + Admin UI + Web 렌더링
- 7: 미리보기 + 커스텀 HTML/CSS + 운영 UX
- 8: Docker + CI/CD + 문서화

---

## 4. Stage 1: 기초 환경

### 목표

모노레포 기본 구조와 앱 실행 환경을 안정적으로 만든다.

### 작업 항목

- pnpm workspace + Turborepo 설정
- `apps/admin`, `apps/web` Next.js 앱 생성
- `packages/db`, `packages/types`, `packages/config` 생성
- TypeScript / ESLint 9 flat config / Prettier 연결
- Next.js App Router 기본 구조 구성
- web의 FSD + App Router 충돌 회피 구조 반영

### 완료 기준

- `pnpm dev`로 admin(:3001)과 web(:3000) 모두 실행
- 공용 패키지를 import할 수 있음
- `pnpm lint`, `pnpm typecheck` 통과

---

## 5. Stage 2a: Prisma + 커스텀 세션 인증 + 로그인 UI

### 목표

DB 스키마와 관리자 인증의 기초를 만들고, 첫 번째 화면(로그인)을 완성한다.

### 작업 항목

- PostgreSQL 로컬 환경 + DATABASE_URL 설정
- Prisma 스키마 전체 모델 작성 (User, Role, Subpage, Board, Post, HomeSection, HomePopup, PageBlock, Media, NavigationMenu, NavigationMenuItem, AuditLog, SiteSettings, ErrorLog, Session)
- Prisma migration 초기화
- PrismaClient 싱글턴 (`packages/db/src/client.ts`)
- 커스텀 DB 세션 인증 (crypto.randomUUID + httpOnly 쿠키, 세션 헬퍼)
- Seed 스크립트 (초기 관리자 계정 + 총괄 관리자 Role + 기본 Role)
- **로그인 페이지 UI** (shadcn/ui)
- 인증 미들웨어 (보호 라우트)

### 완료 기준

- 브라우저에서 seed 계정으로 로그인/로그아웃 가능
- 비인증 상태에서 admin 접근 시 로그인으로 리다이렉트
- Prisma Studio에서 전체 모델 확인 가능

### Prisma 스키마를 한 번에 만드는 이유

설계서에서 모든 모델이 이미 확정됨. 모델을 단계마다 추가하면 매번 마이그레이션이 생기고, 관계 필드 때문에 나중에 스키마가 꼬일 수 있음. 스키마는 한 번에 만들고, 기능은 하나씩 쌓아간다.

---

## 6. Stage 2b: 회원가입 + UI

### 목표

관리자 가입 신청 흐름을 완성한다.

### 작업 항목

- 회원가입 API Route (`POST /api/auth/register`)
- Zod 검증 (아이디 4~20자, 비밀번호 8자+, 이름 2~50자)
- bcryptjs 해싱
- PENDING 상태 로그인 시 상태 체크 API
- **회원가입 페이지 UI**
- 로그인 페이지에 "회원가입" 링크 추가
- 감사 로그: CREATE, USER (userId: null)

### 완료 기준

- 가입 → PENDING 생성 → 로그인 시도 → "승인 대기 중" 메시지 표시

---

## 7. Stage 2c: Admin 레이아웃 + 대시보드

### 목표

관리 화면의 기본 골격을 만든다.

### 작업 항목

- 사이드바 (메뉴 구조, 접기/펼치기)
- 헤더 (사용자 정보, 로그아웃)
- **대시보드 페이지** (최소 구성: 콘텐츠 통계, PENDING 사용자 수)
- 반응형 레이아웃 기초

### 완료 기준

- 로그인 후 사이드바가 있는 대시보드 진입
- 사이드바 메뉴 클릭으로 각 섹션 이동 가능 (빈 페이지라도)

---

## 8. Stage 2d: 사용자 관리 + UI

### 목표

관리자가 가입 신청을 승인/거절하고 사용자를 관리할 수 있게 한다.

### 작업 항목

- 사용자 관리 API Routes (approve, reject, suspend, reactivate)
- 사용자 목록 (TanStack Table, 서버 사이드 페이지네이션)
- 상태별 필터, 상태 뱃지
- 안전 장치 (자기 자신 정지 불가, 마지막 ACTIVE 관리자 정지 불가)
- **사용자 관리 페이지 UI** (목록 + 액션 다이얼로그)
- 감사 로그 연동
- suspendUser: 세션 즉시 삭제

### 완료 기준

- PENDING 유저 승인 → ACTIVE 전환 → 해당 계정으로 로그인 성공
- SUSPENDED 전환 → 해당 계정 즉시 로그아웃

---

## 9. Stage 2e: 프로필 + 비밀번호 변경 + UI

### 목표

로그인한 관리자가 자기 정보를 수정할 수 있게 한다.

### 작업 항목

- 프로필 API Routes (updateProfile, changePassword)
- **프로필 페이지 UI** (이름 수정, 비밀번호 변경)
- 현재 비밀번호 검증 (bcryptjs compare)
- 감사 로그: 이름 변경, 비밀번호 변경 (`passwordChanged: true`만 기록)

### 완료 기준

- 이름 변경 → 헤더에 반영
- 비밀번호 변경 → 기존 비밀번호로 로그인 실패, 새 비밀번호로 성공

---

## 10. Stage 3a: 서브 페이지 CRUD + UI

### 목표

서브 페이지를 생성/편집할 수 있게 한다.

### 작업 항목

- 서브 페이지 API Routes (CRUD + 발행/비발행)
- Tiptap WYSIWYG 에디터 → JSON 저장 (`contentJson` + 검색용 plain text `content` 동시 저장)
- `@simple-cms/editor` 공유 확장 사용
- slug 자동 생성 + 수동 수정
- draft / published 상태 관리
- SEO 필드 (title, description)
- **서브 페이지 목록 UI** (TanStack Table)
- **서브 페이지 편집 UI** (Tiptap + 메타데이터 폼)
- 감사 로그 연동

### 완료 기준

- 서브 페이지 생성 → Tiptap 편집 → JSON 저장 → 목록에서 확인
- 발행 상태 전환 가능

---

## 11. Stage 3b: 게시판 CRUD + UI

### 목표

게시판(게시글의 컨테이너)을 관리할 수 있게 한다.

### 작업 항목

- 게시판 API Routes (CRUD)
- slug 관리, 스킨 타입 (list/gallery), 공개 여부
- 삭제 시 소속 게시글 존재 여부 확인
- **게시판 관리 UI** (목록 + 생성/수정 폼)
- 감사 로그 연동

### 완료 기준

- 게시판 생성 → 스킨 설정 → 목록 확인

---

## 12. Stage 3c: 게시글 CRUD + UI

### 목표

게시판에 속한 게시글을 작성/관리할 수 있게 한다.

### 작업 항목

- 게시글 API Routes (CRUD + 발행)
- Tiptap 에디터 (서브 페이지와 동일 패턴)
- 게시판 소속 관리, slug (게시판 단위 unique)
- **게시글 목록 UI** (게시판별 필터)
- **게시글 편집 UI**
- 감사 로그 연동

### 완료 기준

- 게시글 작성 → 특정 게시판에 소속 → 발행 → 목록 확인

---

## 13. Stage 3d: 메뉴 관리 + UI

### 목표

사이트 네비게이션 메뉴를 편집할 수 있게 한다.

### 작업 항목

- 메뉴 API Routes (NavigationMenu + MenuItem CRUD + reorder)
- dnd-kit 드래그 앤 드롭 순서 변경
- 항목 타입: SUBPAGE / BOARD / EXTERNAL / CUSTOM
- 최대 2depth
- 연결 대상 선택 UI (서브 페이지/게시판 검색)
- **메뉴 편집 UI** (트리 구조 + 드래그)
- 감사 로그 연동

### 완료 기준

- 메뉴 항목 추가 → 서브 페이지/게시판 연결 → 드래그로 순서 변경

---

## 13-2. Stage 3d-2: 메뉴 슬롯 배정 + 3depth 확장

### 목표

메뉴 세트에 공개 웹 배치 위치(슬롯)를 지정하고, 메뉴 depth를 3단계까지 확장한다.

### 작업 항목

- NavigationMenu 모델에 `slot` enum 추가 (HEADER / FOOTER / SIDEBAR / NONE, 기본값 NONE)
- Prisma 마이그레이션 + seed 업데이트 (기존 "Header Main" → slot: HEADER 등)
- 메뉴 depth 제한 2 → 3으로 확장 (NavigationMenuItem 자기참조 3단계 허용)
- Admin 메뉴 관리 UI: 슬롯 선택 드롭다운 (각 슬롯에 하나의 메뉴만 배정 가능)
- Admin 메뉴 편집 UI: 3depth 메뉴 아이템 추가/편집 지원
- Web 헤더/푸터: 이름 기반 조회 → slot 기반 조회로 변경
- Web 사이드바: slot: SIDEBAR 메뉴 렌더링 (1차 전체 페이지 적용, 2차에서 페이지별 제어)
- Web KRDS Header.MainMenu 3depth 데이터 변환
- 감사 로그: 슬롯 변경 기록

### 완료 기준

- admin에서 메뉴 세트에 슬롯(헤더/푸터/사이드바) 배정 → 공개 웹에 즉시 반영
- 3단계 메뉴가 데스크톱/모바일에서 정상 동작
- 사이드바 메뉴가 공개 웹 우측에 표시

---

## 14. Stage 3e: 감사 로그 + UI + 내보내기

### 목표

이전 단계에서 쌓인 관리자 활동 이력을 조회/내보내기할 수 있게 한다.

### 작업 항목

- 감사 로그 조회 API Route (필터, 페이지네이션)
- 내보내기 API Route (CSV 네이티브, Excel exceljs)
- **감사 로그 목록 UI** (날짜, 사용자, 액션, 엔티티 필터)
- **상세 보기** (changes JSON diff 표시)
- 내보내기 버튼 (날짜 범위 필수)

### 완료 기준

- 이전 단계 활동(서브 페이지 생성, 유저 승인 등)이 로그에 쌓인 것 확인
- CSV/Excel 다운로드 가능

---

## 15. Stage 3f: 사이트 설정 + UI

### 목표

사이트 전역 설정을 관리할 수 있게 한다.

### 작업 항목

- 도메인 설정 API Routes + **UI** (도메인 입력, DNS 검증)
- 보안 설정 API Route + **UI** (동시 로그인 토글)
- 업로드 제한 API Route + **UI** (확장자/MIME/크기 태그 입력)
- 설정 탭 네비게이션 (domain / security / upload)
- 감사 로그 연동

### 완료 기준

- 3개 설정 탭 간 전환
- 각 설정 변경 → 저장 → 새로고침 시 반영 확인

---

## 16. Stage 4a: Web 메인+서브페이지 렌더링

### 목표

admin에서 만든 서브 페이지가 공개 웹에서 보이게 한다.

### 작업 항목

- KRDS 기반 기본 레이아웃 (헤더/푸터)
- 메인 페이지 (`/`) 기본 라우트
- 서브페이지 (`/p/[slug]`) 렌더링
- Tiptap JSON → HTML (`generateHTML()` from `@tiptap/html` + `@simple-cms/editor` 공유 확장 + DOMPurify)
- metadata 처리
- `published` 상태만 노출

### 완료 기준

- admin에서 발행한 서브 페이지가 `http://localhost:3000/p/{slug}`에서 렌더링

---

## 17. Stage 4b: Web 게시판/게시글 렌더링

### 작업 항목

- 게시판 목록 (`/board/[boardSlug]`) — list/gallery 스킨 분기
- 게시글 상세 (`/board/[boardSlug]/[postSlug]`)
- metadata + SEO

### 완료 기준

- admin에서 발행한 게시글이 공개 웹에서 노출

---

## 18. Stage 4c: Web 메뉴 렌더링 + 도메인 미들웨어

### 작업 항목

- 헤더 메뉴: Header Main 메뉴 세트 렌더링
- 푸터 메뉴: Footer 메뉴 세트 렌더링
- 모바일 반응형 메뉴
- 도메인 미들웨어 (커스텀 도메인 리다이렉트)
- 도메인 인메모리 캐시

### 완료 기준

- admin에서 설정한 메뉴가 공개 웹 헤더/푸터에 표시
- 커스텀 도메인 설정 시 리다이렉트 동작

---

## 19. Stage 4d: 통합검색 (PGroonga)

### 작업 항목

- PostgreSQL에 PGroonga 확장 설치
- 검색용 인덱스 설정 (Subpage + Post 제목/본문)
- `/search?q=...` 라우트 (URL params + Server Component)
- 검색 결과 UI (타입 구분, 스니펫)
- `published` 상태만 검색

### 완료 기준

- 한글 검색 가능
- 서브 페이지+게시글이 하나의 검색 결과에 통합 노출

---

## 20. Stage 4e: Web 에러 캡처 + Admin 에러 로그 UI

### 작업 항목

- Web 서버 사이드 에러 캡처 (error.tsx, global-error.tsx)
- Web 클라이언트 사이드 에러 캡처 (ErrorBoundary, sendBeacon)
- Web 에러 리포트 API Route (rate limiting)
- fingerprint 기반 그룹핑
- **Admin 에러 로그 목록/상세/해결 UI**
- 대시보드 에러 위젯 추가

### 완료 기준

- web에서 의도적 에러 발생 → admin 에러 로그에서 조회 → 해결 처리

---

## 21. Stage 5a: 메인 섹션 관리

### 작업 항목

- Admin: 섹션 목록/순서/노출 관리 UI
- Admin: 섹션별 데이터 편집
- Web: 섹션 기반 메인 페이지 렌더링
- 상세 섹션 종류는 디자이너 시안 확정 후 구체화

### 완료 기준

- 섹션 데이터 편집 → 메인 페이지에 반영

---

## 22. Stage 5b: 메인 팝업 관리

### 작업 항목

- Admin: 팝업 CRUD UI (콘텐츠형/이미지형)
- Admin: 노출 여부, 순서, 시작일/종료일
- Web: 팝업 모달 (1개: 단일, 2개+: 슬라이드)
- 접근성 (alt, 닫기, 키보드, 포커스 트랩)

### 완료 기준

- 팝업 등록 → 메인 방문 시 모달 표시

---

## 23. Stage 6: 서브페이지 블록 시스템

### 작업 항목

- Admin: 블록 추가/삭제/순서 조정 UI
- Admin: 블록 타입 선택 + configJson 편집
- Web: 블록 타입별 렌더러
- 블록 종류는 디자이너 협의 후 확정

### 구현 원칙

- 본문은 Markdown 유지, 블록은 별도 UI
- 자유형 빌더로 확장하지 않음
- 첫 블록 1~2개만 먼저 구현

### 완료 기준

- 블록 추가/순서 변경 → 공개 웹에서 렌더링 확인

---

## 24. Stage 7: 미리보기 + 운영 UX

### 작업 항목

- 서브페이지/메인/팝업/메뉴 미리보기
- draft 상태 preview token
- 커스텀 HTML/CSS 편집 (Monaco Editor)
- 관리자 UX 보강 (저장 전 검증, 에러 메시지)

### 완료 기준

- draft 상태에서 미리보기 가능
- 커스텀 코드 편집 → 미리보기 반영

---

## 25. Stage 8: Docker + CI/CD + 문서화

### 작업 항목

- admin/web Dockerfile
- Docker Compose (PostgreSQL + PGroonga + admin + web + Traefik)
- GitHub Actions (lint, typecheck, build, docker build)
- README 최종 정리
- 설계 문서 업데이트
- 면접 자료 보강

### 완료 기준

- `docker compose up`으로 전체 스택 실행
- PR/push 시 자동 검증

---

## 26. 우선순위 요약

### 반드시 먼저 (Stage 1~3)

모노레포 → DB/인증 → Admin CRUD — 관리자가 콘텐츠를 만들 수 있는 상태

### 그다음 핵심 (Stage 4~5)

공개 웹 렌더링 → 메인 관리 — 만든 콘텐츠가 실제로 보이는 상태

### 완성도 강화 (Stage 6~8)

블록 → 미리보기 → Docker/CI — 운영 품질 + 배포 가능 상태

---

## 27. 한 줄 요약

> 매 단계마다 백엔드와 UI를 함께 개발하여, 기능이 추가될 때마다 직접 화면에서 확인할 수 있는 상태를 유지하며 점진적으로 완성한다.
